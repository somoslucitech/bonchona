import { getCloudflareEnv } from "./cf-env";

// ---------------------------------------------------------------------------
// Categorías: fuente única de verdad. Cinco valores fijos que participan en la
// URL. No hay tabla ni CHECK en SQL (SQLite no puede alterar un CHECK sin
// rebuild); se valida acá.
// ---------------------------------------------------------------------------

export const NEWS_CATEGORIES = [
  {
    slug: "musica",
    name: "Música",
    seoTitle: "Noticias de Música",
    seoDescription:
      "Lo último de la música: estrenos, artistas y lo que suena en Bonchona 107.1 FM desde Valencia, Venezuela.",
  },
  {
    slug: "cosa-valenciana",
    name: "Cosa Valenciana",
    seoTitle: "Cosa Valenciana",
    seoDescription:
      "Lo que pasa en Valencia y Carabobo: cultura, movida local y la gente que hace ciudad.",
  },
  {
    slug: "artistas-emergentes",
    name: "Artistas Emergentes",
    seoTitle: "Artistas Emergentes",
    seoDescription:
      "El talento nuevo que viene pisando fuerte. Artistas emergentes de Venezuela y el mundo.",
  },
  {
    slug: "pop",
    name: "Pop",
    seoTitle: "Noticias de Pop",
    seoDescription: "Todo el pop: los hits, los artistas y las historias detrás de las canciones.",
  },
  {
    slug: "economia",
    name: "Economía",
    seoTitle: "Economía",
    seoDescription: "Economía y negocios con impacto en la industria musical y en el país.",
  },
] as const;

export type NewsCategorySlug = (typeof NEWS_CATEGORIES)[number]["slug"];
export const DEFAULT_CATEGORY: NewsCategorySlug = "musica";

export function isValidCategory(value: string): value is NewsCategorySlug {
  return NEWS_CATEGORIES.some((c) => c.slug === value);
}

export function getCategory(slug: string) {
  return NEWS_CATEGORIES.find((c) => c.slug === slug) ?? null;
}

export function normalizeCategory(value: string | null | undefined): NewsCategorySlug {
  const v = (value ?? "").trim().toLowerCase();
  return isValidCategory(v) ? v : DEFAULT_CATEGORY;
}

// ---------------------------------------------------------------------------
// Slugs reservados: una noticia jamás puede pisar una ruta existente del sitio,
// ni los segmentos estáticos que viven dentro de /noticias.
// ---------------------------------------------------------------------------

export const RESERVED_SLUGS = new Set([
  "", "admin", "api", "estudio", "famoso", "nosotros", "noticias", "programas",
  "logos-bonchona", "sitemap.xml", "robots.txt", "llms.txt", "favicon.ico",
  "categoria", "pagina", "feed.xml", "_next", "og",
]);

export function isReservedSlug(slug: string): boolean {
  return RESERVED_SLUGS.has(slug.trim().toLowerCase());
}

export function slugify(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // quita tildes
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "")
    .slice(0, 120);
}

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------

export type ArticleStatus = "draft" | "published" | "discarded";
export type ArticleSource = "wp-migration" | "n8n" | "admin";

export interface Article {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  bodyHtml: string;
  bodyText: string;
  image: string | null;
  imageAlt: string | null;
  imageWidth: number | null;
  imageHeight: number | null;
  category: NewsCategorySlug;
  tags: string[];
  featured: boolean;
  status: ArticleStatus;
  publishedAt: number | null;
  createdAt: number;
  updatedAt: number;
  authorName: string;
  authorUserId: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
  canonicalUrl: string | null;
  noindex: boolean;
  readingMinutes: number | null;
  wordCount: number | null;
  source: ArticleSource;
  externalId: string | null;
  legacyPath: string | null;
}

/** Vista ligera para listados: nunca trae body_html ni body_text. */
export type ArticleCard = Pick<
  Article,
  | "id" | "slug" | "title" | "excerpt" | "image" | "imageAlt" | "imageWidth"
  | "imageHeight" | "category" | "featured" | "publishedAt" | "readingMinutes"
>;

interface ArticleRow {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  body_html: string;
  body_text: string;
  image: string | null;
  image_alt: string | null;
  image_width: number | null;
  image_height: number | null;
  category: string;
  tags: string;
  featured: number;
  status: string;
  published_at: number | null;
  created_at: number;
  updated_at: number;
  author_name: string;
  author_user_id: string | null;
  seo_title: string | null;
  seo_description: string | null;
  canonical_url: string | null;
  noindex: number;
  reading_minutes: number | null;
  word_count: number | null;
  source: string;
  external_id: string | null;
  legacy_path: string | null;
}

function mapArticle(row: ArticleRow): Article {
  let tags: string[] = [];
  try {
    const parsed = JSON.parse(row.tags);
    if (Array.isArray(parsed)) tags = parsed.filter((t): t is string => typeof t === "string");
  } catch {}

  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    excerpt: row.excerpt,
    bodyHtml: row.body_html,
    bodyText: row.body_text,
    image: row.image,
    imageAlt: row.image_alt,
    imageWidth: row.image_width,
    imageHeight: row.image_height,
    category: normalizeCategory(row.category),
    tags,
    featured: row.featured === 1,
    status: row.status as ArticleStatus,
    publishedAt: row.published_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    authorName: row.author_name,
    authorUserId: row.author_user_id,
    seoTitle: row.seo_title,
    seoDescription: row.seo_description,
    canonicalUrl: row.canonical_url,
    noindex: row.noindex === 1,
    readingMinutes: row.reading_minutes,
    wordCount: row.word_count,
    source: row.source as ArticleSource,
    externalId: row.external_id,
    legacyPath: row.legacy_path,
  };
}

const CARD_COLUMNS =
  "id, slug, title, excerpt, image, image_alt, image_width, image_height, category, featured, published_at, reading_minutes";

function mapCard(row: Partial<ArticleRow>): ArticleCard {
  return {
    id: row.id!,
    slug: row.slug!,
    title: row.title!,
    excerpt: row.excerpt ?? "",
    image: row.image ?? null,
    imageAlt: row.image_alt ?? null,
    imageWidth: row.image_width ?? null,
    imageHeight: row.image_height ?? null,
    category: normalizeCategory(row.category),
    featured: row.featured === 1,
    publishedAt: row.published_at ?? null,
    readingMinutes: row.reading_minutes ?? null,
  };
}

export const PAGE_SIZE = 12;

// ---------------------------------------------------------------------------
// Lecturas públicas. Todas filtran published_at <= ahora, que es lo que hace
// que una noticia agendada a futuro esté "en cola": existe en la base pero no
// es visible ni indexable hasta que llega su turno.
// ---------------------------------------------------------------------------

export interface PagedArticles {
  items: ArticleCard[];
  total: number;
  page: number;
  totalPages: number;
}

export async function listPublished(page = 1, pageSize = PAGE_SIZE): Promise<PagedArticles> {
  const env = getCloudflareEnv();
  const empty: PagedArticles = { items: [], total: 0, page, totalPages: 0 };
  if (!env?.DB) return empty;

  const now = Date.now();
  const offset = (page - 1) * pageSize;

  try {
    const [countRow, rows] = await Promise.all([
      env.DB.prepare(
        "SELECT COUNT(*) AS c FROM articles WHERE status = 'published' AND published_at <= ?"
      ).bind(now).first<{ c: number }>(),
      env.DB.prepare(
        `SELECT ${CARD_COLUMNS} FROM articles
         WHERE status = 'published' AND published_at <= ?
         ORDER BY published_at DESC LIMIT ? OFFSET ?`
      ).bind(now, pageSize, offset).all<ArticleRow>(),
    ]);

    const total = countRow?.c ?? 0;
    return {
      items: (rows.results ?? []).map(mapCard),
      total,
      page,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    };
  } catch (e) {
    console.error("listPublished error:", e);
    return empty;
  }
}

export async function listByCategory(
  category: NewsCategorySlug,
  page = 1,
  pageSize = PAGE_SIZE
): Promise<PagedArticles> {
  const env = getCloudflareEnv();
  const empty: PagedArticles = { items: [], total: 0, page, totalPages: 0 };
  if (!env?.DB) return empty;

  const now = Date.now();
  const offset = (page - 1) * pageSize;

  try {
    const [countRow, rows] = await Promise.all([
      env.DB.prepare(
        "SELECT COUNT(*) AS c FROM articles WHERE status = 'published' AND category = ? AND published_at <= ?"
      ).bind(category, now).first<{ c: number }>(),
      env.DB.prepare(
        `SELECT ${CARD_COLUMNS} FROM articles
         WHERE status = 'published' AND category = ? AND published_at <= ?
         ORDER BY published_at DESC LIMIT ? OFFSET ?`
      ).bind(category, now, pageSize, offset).all<ArticleRow>(),
    ]);

    const total = countRow?.c ?? 0;
    return {
      items: (rows.results ?? []).map(mapCard),
      total,
      page,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    };
  } catch (e) {
    console.error("listByCategory error:", e);
    return empty;
  }
}

export async function listFeatured(limit = 3): Promise<ArticleCard[]> {
  const env = getCloudflareEnv();
  if (!env?.DB) return [];
  try {
    const { results } = await env.DB.prepare(
      `SELECT ${CARD_COLUMNS} FROM articles
       WHERE status = 'published' AND featured = 1 AND published_at <= ?
       ORDER BY published_at DESC LIMIT ?`
    ).bind(Date.now(), limit).all<ArticleRow>();
    return (results ?? []).map(mapCard);
  } catch (e) {
    console.error("listFeatured error:", e);
    return [];
  }
}

/** Últimas publicadas, para rellenar la home cuando faltan destacadas. */
export async function listLatest(limit = 3): Promise<ArticleCard[]> {
  const env = getCloudflareEnv();
  if (!env?.DB) return [];
  try {
    const { results } = await env.DB.prepare(
      `SELECT ${CARD_COLUMNS} FROM articles
       WHERE status = 'published' AND published_at <= ?
       ORDER BY published_at DESC LIMIT ?`
    ).bind(Date.now(), limit).all<ArticleRow>();
    return (results ?? []).map(mapCard);
  } catch (e) {
    console.error("listLatest error:", e);
    return [];
  }
}

/**
 * Noticias para la portada: primero las marcadas como destacadas (la primera
 * es la principal del bloque editorial) y luego se completa con lo más
 * reciente hasta llegar a `limit`.
 *
 * Importante: NO se descartan las destacadas cuando hay menos de `limit`.
 * Marcar una sola noticia como destacada es el caso normal y esa tiene que
 * quedar de principal, no perderse detrás de lo más reciente.
 */
export async function getHomepageNews(limit = 3): Promise<ArticleCard[]> {
  const featured = await listFeatured(limit);
  if (featured.length >= limit) return featured.slice(0, limit);

  const latest = await listLatest(limit + featured.length);
  const seen = new Set(featured.map((a) => a.id));
  const filler = latest.filter((a) => !seen.has(a.id));

  return [...featured, ...filler].slice(0, limit);
}

export async function getArticleBySlug(slug: string): Promise<Article | null> {
  const env = getCloudflareEnv();
  if (!env?.DB) return null;
  try {
    const row = await env.DB.prepare(
      "SELECT * FROM articles WHERE slug = ? AND status = 'published' AND published_at <= ?"
    ).bind(slug, Date.now()).first<ArticleRow>();
    return row ? mapArticle(row) : null;
  } catch (e) {
    console.error("getArticleBySlug error:", e);
    return null;
  }
}

export async function listRelated(
  category: NewsCategorySlug,
  excludeId: string,
  limit = 3
): Promise<ArticleCard[]> {
  const env = getCloudflareEnv();
  if (!env?.DB) return [];
  try {
    const { results } = await env.DB.prepare(
      `SELECT ${CARD_COLUMNS} FROM articles
       WHERE status = 'published' AND category = ? AND id <> ? AND published_at <= ?
       ORDER BY published_at DESC LIMIT ?`
    ).bind(category, excludeId, Date.now(), limit).all<ArticleRow>();
    return (results ?? []).map(mapCard);
  } catch (e) {
    console.error("listRelated error:", e);
    return [];
  }
}

/** Para sitemap y RSS: solo lo publicado y ya visible. */
export async function listAllPublishedForFeed(
  limit = 5000
): Promise<Array<Pick<Article, "slug" | "title" | "excerpt" | "publishedAt" | "updatedAt" | "category" | "image">>> {
  const env = getCloudflareEnv();
  if (!env?.DB) return [];
  try {
    const { results } = await env.DB.prepare(
      `SELECT slug, title, excerpt, published_at, updated_at, category, image
       FROM articles
       WHERE status = 'published' AND published_at <= ?
       ORDER BY published_at DESC LIMIT ?`
    ).bind(Date.now(), limit).all<ArticleRow>();
    return (results ?? []).map((r) => ({
      slug: r.slug,
      title: r.title,
      excerpt: r.excerpt ?? "",
      publishedAt: r.published_at ?? null,
      updatedAt: r.updated_at,
      category: normalizeCategory(r.category),
      image: r.image ?? null,
    }));
  } catch (e) {
    console.error("listAllPublishedForFeed error:", e);
    return [];
  }
}

// ---------------------------------------------------------------------------
// Cola de publicación
//
// El modelo es: published_at en el futuro ES la cola. No hace falta cron ni
// Durable Objects — las queries públicas filtran published_at <= now, así que
// la noticia aparece sola al llegar su turno.
// ---------------------------------------------------------------------------

/** Venezuela es UTC-4 fijo, sin horario de verano. */
const VET_OFFSET_MS = 4 * 60 * 60 * 1000;

export interface QueueConfig {
  /** Horas (0-23, hora de Venezuela) en que sale una noticia. */
  slotHours: number[];
  /** Si el siguiente turno cae más allá de esto, la noticia se descarta. */
  horizonDays: number;
}

export const DEFAULT_QUEUE_CONFIG: QueueConfig = {
  slotHours: [8, 13, 19],
  horizonDays: 7,
};

/** Instante UTC (epoch ms) del slot `hour` (hora VET) del día `dayOffset`. */
function slotTimestamp(baseUtcMs: number, dayOffset: number, hourVet: number): number {
  const vetDate = new Date(baseUtcMs - VET_OFFSET_MS);
  const y = vetDate.getUTCFullYear();
  const m = vetDate.getUTCMonth();
  const d = vetDate.getUTCDate() + dayOffset;
  // Date.UTC sobre la fecha VET, y devolvemos a UTC real sumando el offset.
  return Date.UTC(y, m, d, hourVet, 0, 0, 0) + VET_OFFSET_MS;
}

/**
 * Calcula el próximo turno libre después de `lastScheduled`.
 * Devuelve null si el turno cae más allá del horizonte (→ descartar).
 */
export function computeNextSlot(
  now: number,
  lastScheduled: number | null,
  config: QueueConfig = DEFAULT_QUEUE_CONFIG
): number | null {
  const slots = [...config.slotHours].sort((a, b) => a - b);
  if (slots.length === 0) return now;

  // El turno debe ser posterior tanto a ahora como al último ya agendado.
  const after = Math.max(now, lastScheduled ?? 0);

  for (let dayOffset = 0; dayOffset <= config.horizonDays + 1; dayOffset++) {
    for (const hour of slots) {
      const ts = slotTimestamp(now, dayOffset, hour);
      if (ts > after) {
        const horizonMs = now + config.horizonDays * 24 * 60 * 60 * 1000;
        return ts > horizonMs ? null : ts;
      }
    }
  }
  return null;
}

/** El published_at más lejano ya agendado (para encadenar el siguiente turno). */
export async function getLastScheduledAt(): Promise<number | null> {
  const env = getCloudflareEnv();
  if (!env?.DB) return null;
  try {
    const row = await env.DB.prepare(
      "SELECT MAX(published_at) AS m FROM articles WHERE status = 'published' AND published_at > ?"
    ).bind(Date.now()).first<{ m: number | null }>();
    return row?.m ?? null;
  } catch (e) {
    console.error("getLastScheduledAt error:", e);
    return null;
  }
}

// ---------------------------------------------------------------------------
// Escrituras
// ---------------------------------------------------------------------------

export interface UpsertArticleInput {
  slug: string;
  title: string;
  excerpt: string;
  bodyHtml: string;
  bodyText: string;
  image?: string | null;
  imageAlt?: string | null;
  imageWidth?: number | null;
  imageHeight?: number | null;
  category: NewsCategorySlug;
  tags?: string[];
  featured?: boolean;
  status: ArticleStatus;
  publishedAt: number | null;
  authorName?: string;
  authorUserId?: string | null;
  seoTitle?: string | null;
  seoDescription?: string | null;
  canonicalUrl?: string | null;
  noindex?: boolean;
  readingMinutes?: number | null;
  wordCount?: number | null;
  source: ArticleSource;
  externalId?: string | null;
  legacyPath?: string | null;
}

/**
 * Inserta o actualiza por (source, external_id) — el índice único parcial hace
 * idempotentes los reintentos de n8n y las re-corridas de la migración.
 */
export async function upsertArticle(input: UpsertArticleInput): Promise<{ id: string; created: boolean }> {
  const env = getCloudflareEnv();
  if (!env?.DB) throw new Error("D1 no disponible.");

  const now = Date.now();

  let existing: { id: string } | null = null;
  if (input.externalId) {
    existing = await env.DB.prepare(
      "SELECT id FROM articles WHERE source = ? AND external_id = ?"
    ).bind(input.source, input.externalId).first<{ id: string }>();
  }
  if (!existing) {
    existing = await env.DB.prepare("SELECT id FROM articles WHERE slug = ?")
      .bind(input.slug).first<{ id: string }>();
  }

  const id = existing?.id ?? crypto.randomUUID();

  if (existing) {
    await env.DB.prepare(
      `UPDATE articles SET
        slug=?, title=?, excerpt=?, body_html=?, body_text=?, image=?, image_alt=?,
        image_width=?, image_height=?, category=?, tags=?, featured=?, status=?,
        published_at=?, updated_at=?, author_name=?, author_user_id=?, seo_title=?,
        seo_description=?, canonical_url=?, noindex=?, reading_minutes=?, word_count=?,
        source=?, external_id=?, legacy_path=?
       WHERE id=?`
    ).bind(
      input.slug, input.title, input.excerpt, input.bodyHtml, input.bodyText,
      input.image ?? null, input.imageAlt ?? null, input.imageWidth ?? null,
      input.imageHeight ?? null, input.category, JSON.stringify(input.tags ?? []),
      input.featured ? 1 : 0, input.status, input.publishedAt, now,
      input.authorName ?? "Redacción Bonchona", input.authorUserId ?? null,
      input.seoTitle ?? null, input.seoDescription ?? null, input.canonicalUrl ?? null,
      input.noindex ? 1 : 0, input.readingMinutes ?? null, input.wordCount ?? null,
      input.source, input.externalId ?? null, input.legacyPath ?? null,
      id
    ).run();
    return { id, created: false };
  }

  await env.DB.prepare(
    `INSERT INTO articles (
      id, slug, title, excerpt, body_html, body_text, image, image_alt,
      image_width, image_height, category, tags, featured, status, published_at,
      created_at, updated_at, author_name, author_user_id, seo_title,
      seo_description, canonical_url, noindex, reading_minutes, word_count,
      source, external_id, legacy_path
    ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`
  ).bind(
    id, input.slug, input.title, input.excerpt, input.bodyHtml, input.bodyText,
    input.image ?? null, input.imageAlt ?? null, input.imageWidth ?? null,
    input.imageHeight ?? null, input.category, JSON.stringify(input.tags ?? []),
    input.featured ? 1 : 0, input.status, input.publishedAt, now, now,
    input.authorName ?? "Redacción Bonchona", input.authorUserId ?? null,
    input.seoTitle ?? null, input.seoDescription ?? null, input.canonicalUrl ?? null,
    input.noindex ? 1 : 0, input.readingMinutes ?? null, input.wordCount ?? null,
    input.source, input.externalId ?? null, input.legacyPath ?? null
  ).run();

  return { id, created: true };
}

/** Id del artículo ya existente para un (source, externalId), si lo hay. */
export async function findArticleIdBySource(
  source: ArticleSource,
  externalId: string
): Promise<string | null> {
  const env = getCloudflareEnv();
  if (!env?.DB) return null;
  const row = await env.DB.prepare(
    "SELECT id FROM articles WHERE source = ? AND external_id = ?"
  ).bind(source, externalId).first<{ id: string }>();
  return row?.id ?? null;
}

/** Genera un slug libre, evitando reservados y colisiones. */
export async function ensureUniqueSlug(base: string, excludeId?: string): Promise<string> {
  const env = getCloudflareEnv();
  let slug = slugify(base) || "noticia";
  if (isReservedSlug(slug)) slug = `${slug}-noticia`;
  if (!env?.DB) return slug;

  for (let i = 0; i < 50; i++) {
    const candidate = i === 0 ? slug : `${slug}-${i + 1}`;
    const row = await env.DB.prepare("SELECT id FROM articles WHERE slug = ?")
      .bind(candidate).first<{ id: string }>();
    if (!row || (excludeId && row.id === excludeId)) return candidate;
  }
  return `${slug}-${Date.now()}`;
}
