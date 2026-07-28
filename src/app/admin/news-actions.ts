'use server';

import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth";
import { getCloudflareEnv } from "@/lib/cf-env";
import { listArticlesForAdmin, type AdminNewsFilters } from "@/lib/news-admin";
import {
  computeNextSlot, getLastScheduledAt, normalizeCategory, isValidCategory,
  type NewsCategorySlug,
} from "@/lib/news";
import { getQueueConfig, saveQueueConfig, DEFAULT_QUEUE_SETTING } from "@/lib/settings";

/** Refresca las rutas afectadas por un cambio en una noticia. */
function revalidateArticle(slug: string, category: string) {
  revalidatePath("/noticias");
  revalidatePath(`/noticias/${slug}`);
  revalidatePath(`/noticias/categoria/${category}`);
  revalidatePath("/");
  revalidatePath("/sitemap.xml");
}

export async function listNewsAction(filters: AdminNewsFilters) {
  const session = await getSession();
  if (!session) return null;
  return listArticlesForAdmin(filters);
}

export async function toggleFeaturedAction(id: string, featured: boolean) {
  const session = await getSession();
  if (!session) return { success: false, error: "Acceso no autorizado." };

  const env = getCloudflareEnv();
  if (!env?.DB) return { success: false, error: "Base de datos no disponible." };

  try {
    const row = await env.DB.prepare("SELECT slug, category FROM articles WHERE id = ?")
      .bind(id).first<{ slug: string; category: string }>();
    if (!row) return { success: false, error: "Noticia no encontrada." };

    await env.DB.prepare("UPDATE articles SET featured = ?, updated_at = ? WHERE id = ?")
      .bind(featured ? 1 : 0, Date.now(), id).run();

    revalidateArticle(row.slug, row.category);
    return { success: true };
  } catch (e) {
    console.error("toggleFeaturedAction error:", e);
    return { success: false, error: "No se pudo actualizar." };
  }
}

/** Publica ya (published_at = ahora), sacándola de la cola si estaba agendada. */
export async function publishNowAction(id: string) {
  const session = await getSession();
  if (!session) return { success: false, error: "Acceso no autorizado." };

  const env = getCloudflareEnv();
  if (!env?.DB) return { success: false, error: "Base de datos no disponible." };

  try {
    const row = await env.DB.prepare("SELECT slug, category FROM articles WHERE id = ?")
      .bind(id).first<{ slug: string; category: string }>();
    if (!row) return { success: false, error: "Noticia no encontrada." };

    await env.DB.prepare(
      "UPDATE articles SET status = 'published', published_at = ?, updated_at = ? WHERE id = ?"
    ).bind(Date.now(), Date.now(), id).run();

    revalidateArticle(row.slug, row.category);
    return { success: true };
  } catch (e) {
    console.error("publishNowAction error:", e);
    return { success: false, error: "No se pudo publicar." };
  }
}

/** Devuelve una noticia a borrador: deja de ser visible e indexable. */
export async function unpublishAction(id: string) {
  const session = await getSession();
  if (!session) return { success: false, error: "Acceso no autorizado." };

  const env = getCloudflareEnv();
  if (!env?.DB) return { success: false, error: "Base de datos no disponible." };

  try {
    const row = await env.DB.prepare("SELECT slug, category FROM articles WHERE id = ?")
      .bind(id).first<{ slug: string; category: string }>();
    if (!row) return { success: false, error: "Noticia no encontrada." };

    await env.DB.prepare(
      "UPDATE articles SET status = 'draft', published_at = NULL, updated_at = ? WHERE id = ?"
    ).bind(Date.now(), id).run();

    revalidateArticle(row.slug, row.category);
    return { success: true };
  } catch (e) {
    console.error("unpublishAction error:", e);
    return { success: false, error: "No se pudo despublicar." };
  }
}

/**
 * Rescata una noticia descartada devolviéndola a la cola, en el siguiente
 * turno libre.
 */
export async function requeueAction(id: string) {
  const session = await getSession();
  if (!session) return { success: false, error: "Acceso no autorizado." };

  const env = getCloudflareEnv();
  if (!env?.DB) return { success: false, error: "Base de datos no disponible." };

  try {
    const row = await env.DB.prepare("SELECT slug, category FROM articles WHERE id = ?")
      .bind(id).first<{ slug: string; category: string }>();
    if (!row) return { success: false, error: "Noticia no encontrada." };

    const config = await getQueueConfig().catch(() => DEFAULT_QUEUE_SETTING);
    const lastScheduled = await getLastScheduledAt();
    // Horizonte generoso: es un rescate manual y explícito del editor.
    const slot = computeNextSlot(Date.now(), lastScheduled, {
      slotHours: config.slotHours,
      horizonDays: Math.max(config.horizonDays, 30),
    });
    if (slot === null) return { success: false, error: "La cola está llena; publica algo primero." };

    await env.DB.prepare(
      "UPDATE articles SET status = 'published', published_at = ?, updated_at = ? WHERE id = ?"
    ).bind(slot, Date.now(), id).run();

    revalidateArticle(row.slug, row.category);
    return { success: true, scheduledFor: new Date(slot).toISOString() };
  } catch (e) {
    console.error("requeueAction error:", e);
    return { success: false, error: "No se pudo reagendar." };
  }
}

export async function deleteArticleAction(id: string) {
  const session = await getSession();
  if (!session) return { success: false, error: "Acceso no autorizado." };

  const env = getCloudflareEnv();
  if (!env?.DB) return { success: false, error: "Base de datos no disponible." };

  try {
    const row = await env.DB.prepare("SELECT slug, category, image FROM articles WHERE id = ?")
      .bind(id).first<{ slug: string; category: string; image: string | null }>();
    if (!row) return { success: false, error: "Noticia no encontrada." };

    await env.DB.prepare("DELETE FROM articles WHERE id = ?").bind(id).run();

    // Borramos también la imagen de R2 para no dejar huérfanos.
    if (row.image?.startsWith("/api/images/") && env.IMAGES_BUCKET) {
      const key = row.image.replace("/api/images/", "");
      await env.IMAGES_BUCKET.delete(key).catch(() => {});
    }

    revalidateArticle(row.slug, row.category);
    return { success: true };
  } catch (e) {
    console.error("deleteArticleAction error:", e);
    return { success: false, error: "No se pudo eliminar." };
  }
}

export async function updateArticleMetaAction(
  id: string,
  data: { title?: string; excerpt?: string; category?: string; seoTitle?: string; seoDescription?: string }
) {
  const session = await getSession();
  if (!session) return { success: false, error: "Acceso no autorizado." };

  const env = getCloudflareEnv();
  if (!env?.DB) return { success: false, error: "Base de datos no disponible." };

  try {
    const row = await env.DB.prepare("SELECT slug, category FROM articles WHERE id = ?")
      .bind(id).first<{ slug: string; category: string }>();
    if (!row) return { success: false, error: "Noticia no encontrada." };

    const category: NewsCategorySlug =
      data.category && isValidCategory(data.category) ? data.category : normalizeCategory(row.category);

    await env.DB.prepare(
      `UPDATE articles SET
        title = COALESCE(NULLIF(?, ''), title),
        excerpt = COALESCE(NULLIF(?, ''), excerpt),
        category = ?,
        seo_title = NULLIF(?, ''),
        seo_description = NULLIF(?, ''),
        updated_at = ?
       WHERE id = ?`
    ).bind(
      data.title?.trim() ?? "", data.excerpt?.trim() ?? "", category,
      data.seoTitle?.trim() ?? "", data.seoDescription?.trim() ?? "",
      Date.now(), id
    ).run();

    revalidateArticle(row.slug, row.category);
    if (category !== row.category) revalidatePath(`/noticias/categoria/${category}`);
    return { success: true };
  } catch (e) {
    console.error("updateArticleMetaAction error:", e);
    return { success: false, error: "No se pudo guardar." };
  }
}

// --- Configuración de la cola ----------------------------------------------

export async function getQueueConfigAction() {
  const session = await getSession();
  if (!session) return null;
  return getQueueConfig();
}

export async function saveQueueConfigAction(slotHours: number[], horizonDays: number) {
  const session = await getSession();
  if (!session) return { success: false, error: "Acceso no autorizado." };

  const hours = [...new Set(slotHours.filter((h) => Number.isInteger(h) && h >= 0 && h <= 23))].sort((a, b) => a - b);
  if (hours.length === 0) return { success: false, error: "Define al menos una hora de publicación." };
  if (!Number.isFinite(horizonDays) || horizonDays < 1 || horizonDays > 60) {
    return { success: false, error: "El horizonte debe estar entre 1 y 60 días." };
  }

  const ok = await saveQueueConfig({ slotHours: hours, horizonDays });
  return ok ? { success: true } : { success: false, error: "No se pudo guardar." };
}
