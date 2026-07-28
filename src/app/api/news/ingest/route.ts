import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { verifyIngestToken } from "@/lib/ingest-auth";
import { sanitizeHtml, htmlToText, countWords, readingMinutes, buildExcerpt } from "@/lib/html-sanitize";
import { storeRemoteImage } from "@/lib/news-image";
import {
  upsertArticle, ensureUniqueSlug, normalizeCategory, computeNextSlot,
  getLastScheduledAt, findArticleIdBySource, DEFAULT_QUEUE_CONFIG, type ArticleSource,
} from "@/lib/news";
import { getQueueConfig } from "@/lib/settings";

export const dynamic = "force-dynamic";

interface IngestPayload {
  externalId?: string;
  title?: string;
  slug?: string;
  excerpt?: string;
  bodyHtml?: string;
  imageUrl?: string;
  imageAlt?: string;
  imageWidth?: number;
  imageHeight?: number;
  category?: string;
  tags?: string[];
  featured?: boolean;
  authorName?: string;
  /** 'n8n' (default) o 'wp-migration' para la carga inicial. */
  source?: string;
  /** Solo para la migración: fecha original del post, para retrodatar. */
  publishedAt?: number;
  /** Solo para la migración: ruta vieja, como rastro de auditoría. */
  legacyPath?: string;
}

export async function POST(request: Request) {
  const auth = verifyIngestToken(request);
  if (!auth.ok) {
    return NextResponse.json({ ok: false, error: auth.error }, { status: 401 });
  }

  let payload: IngestPayload;
  try {
    payload = (await request.json()) as IngestPayload;
  } catch {
    return NextResponse.json({ ok: false, error: "JSON inválido." }, { status: 400 });
  }

  const title = (payload.title ?? "").trim();
  if (!title) {
    return NextResponse.json({ ok: false, error: "Falta 'title'." }, { status: 400 });
  }
  if (!payload.bodyHtml || !payload.bodyHtml.trim()) {
    return NextResponse.json({ ok: false, error: "Falta 'bodyHtml'." }, { status: 400 });
  }

  const source: ArticleSource =
    payload.source === "wp-migration" ? "wp-migration" : payload.source === "admin" ? "admin" : "n8n";
  const isMigration = source === "wp-migration";

  try {
    // El HTML JAMÁS se guarda crudo, ni siquiera con token válido.
    const bodyHtml = await sanitizeHtml(payload.bodyHtml);
    const bodyText = htmlToText(bodyHtml);
    const words = countWords(bodyText);

    // Resolvemos PRIMERO si este (source, externalId) ya existe, para excluirlo
    // del chequeo de unicidad. Sin esto, reprocesar la misma noticia (reintento
    // de n8n o re-corrida de la migración) le añadiría un sufijo "-2" y le
    // cambiaría la URL, rompiendo los redirects y lo ya indexado.
    const existingId = payload.externalId
      ? await findArticleIdBySource(source, payload.externalId)
      : null;

    const slug = await ensureUniqueSlug(payload.slug?.trim() || title, existingId ?? undefined);
    const category = normalizeCategory(payload.category);

    // Imagen a R2 con clave plana. Si falla, la noticia igual entra sin imagen.
    let image: string | null = null;
    let imageWidth: number | null = payload.imageWidth ?? null;
    let imageHeight: number | null = payload.imageHeight ?? null;
    if (payload.imageUrl) {
      const stored = await storeRemoteImage(payload.imageUrl, slug, {
        width: payload.imageWidth,
        height: payload.imageHeight,
      });
      if (stored) {
        image = stored.url;
        imageWidth = stored.width;
        imageHeight = stored.height;
      }
    }

    // --- Cola de publicación ---------------------------------------------
    // La migración NO entra a la cola: va publicada con su fecha original,
    // porque los 301 desde las URLs viejas tienen que aterrizar en páginas vivas.
    let status: "published" | "discarded" = "published";
    let publishedAt: number | null;

    if (isMigration) {
      publishedAt = payload.publishedAt ?? Date.now();
    } else {
      const config = await getQueueConfig().catch(() => DEFAULT_QUEUE_CONFIG);
      const lastScheduled = await getLastScheduledAt();
      const slot = computeNextSlot(Date.now(), lastScheduled, config);
      if (slot === null) {
        // Más allá del horizonte: se guarda como descartada (visible en el
        // admin para rescatarla a mano si valía la pena).
        status = "discarded";
        publishedAt = null;
      } else {
        publishedAt = slot;
      }
    }

    const excerpt = payload.excerpt?.trim()
      ? buildExcerpt(payload.excerpt, 200)
      : buildExcerpt(bodyText, 200);

    const { id, created } = await upsertArticle({
      slug,
      title,
      excerpt,
      bodyHtml,
      bodyText,
      image,
      imageAlt: payload.imageAlt?.trim() || title,
      imageWidth,
      imageHeight,
      category,
      tags: Array.isArray(payload.tags) ? payload.tags.filter((t) => typeof t === "string").slice(0, 15) : [],
      featured: payload.featured === true,
      status,
      publishedAt,
      authorName: payload.authorName?.trim() || "Redacción Bonchona",
      readingMinutes: readingMinutes(words),
      wordCount: words,
      source,
      externalId: payload.externalId ?? null,
      legacyPath: payload.legacyPath ?? null,
    });

    // Solo revalidamos si la noticia ya es visible. Las agendadas a futuro
    // aparecen solas cuando el ISR de los índices refresque tras su turno.
    const isLiveNow = status === "published" && publishedAt !== null && publishedAt <= Date.now();
    if (isLiveNow) {
      revalidatePath("/noticias");
      revalidatePath(`/noticias/${slug}`);
      revalidatePath(`/noticias/categoria/${category}`);
      revalidatePath("/");
    }

    return NextResponse.json({
      ok: true,
      id,
      slug,
      created,
      status,
      url: `/noticias/${slug}`,
      scheduledFor: publishedAt ? new Date(publishedAt).toISOString() : null,
      discarded: status === "discarded",
    });
  } catch (e) {
    console.error("Error en el ingest de noticias:", e);
    const msg = e instanceof Error ? e.message : "Error inesperado.";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
