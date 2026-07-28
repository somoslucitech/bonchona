import { getCloudflareEnv } from "./cf-env";
import { normalizeCategory, type ArticleStatus, type NewsCategorySlug } from "./news";

/**
 * Lecturas para el panel de administración. A diferencia de las públicas,
 * estas NO filtran por published_at, porque el admin necesita ver también
 * lo agendado (en cola), los borradores y lo descartado.
 */

export interface AdminArticleRow {
  id: string;
  slug: string;
  title: string;
  category: NewsCategorySlug;
  featured: boolean;
  status: ArticleStatus;
  publishedAt: number | null;
  updatedAt: number;
  image: string | null;
  source: string;
  /** Derivado: agendada a futuro y todavía no visible. */
  queued: boolean;
}

interface Row {
  id: string; slug: string; title: string; category: string; featured: number;
  status: string; published_at: number | null; updated_at: number;
  image: string | null; source: string;
}

function mapRow(r: Row, now: number): AdminArticleRow {
  return {
    id: r.id,
    slug: r.slug,
    title: r.title,
    category: normalizeCategory(r.category),
    featured: r.featured === 1,
    status: r.status as ArticleStatus,
    publishedAt: r.published_at,
    updatedAt: r.updated_at,
    image: r.image,
    source: r.source,
    queued: r.status === "published" && r.published_at !== null && r.published_at > now,
  };
}

export interface AdminNewsFilters {
  status?: "all" | ArticleStatus | "queued";
  category?: NewsCategorySlug | "all";
  search?: string;
  page?: number;
  pageSize?: number;
}

export interface AdminNewsPage {
  items: AdminArticleRow[];
  total: number;
  page: number;
  totalPages: number;
  counts: { published: number; queued: number; draft: number; discarded: number };
}

export async function listArticlesForAdmin(filters: AdminNewsFilters = {}): Promise<AdminNewsPage> {
  const env = getCloudflareEnv();
  const page = Math.max(1, filters.page ?? 1);
  const pageSize = filters.pageSize ?? 20;
  const empty: AdminNewsPage = {
    items: [], total: 0, page, totalPages: 0,
    counts: { published: 0, queued: 0, draft: 0, discarded: 0 },
  };
  if (!env?.DB) return empty;

  const now = Date.now();
  const where: string[] = [];
  const binds: unknown[] = [];

  if (filters.status && filters.status !== "all") {
    if (filters.status === "queued") {
      where.push("status = 'published' AND published_at > ?");
      binds.push(now);
    } else if (filters.status === "published") {
      where.push("status = 'published' AND published_at <= ?");
      binds.push(now);
    } else {
      where.push("status = ?");
      binds.push(filters.status);
    }
  }
  if (filters.category && filters.category !== "all") {
    where.push("category = ?");
    binds.push(filters.category);
  }
  if (filters.search?.trim()) {
    where.push("(title LIKE ? OR body_text LIKE ?)");
    const q = `%${filters.search.trim()}%`;
    binds.push(q, q);
  }
  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

  try {
    const [countRow, rows, counts] = await Promise.all([
      env.DB.prepare(`SELECT COUNT(*) AS c FROM articles ${whereSql}`).bind(...binds).first<{ c: number }>(),
      env.DB.prepare(
        `SELECT id, slug, title, category, featured, status, published_at, updated_at, image, source
         FROM articles ${whereSql}
         ORDER BY COALESCE(published_at, updated_at) DESC
         LIMIT ? OFFSET ?`
      ).bind(...binds, pageSize, (page - 1) * pageSize).all<Row>(),
      env.DB.prepare(
        `SELECT
           SUM(CASE WHEN status='published' AND published_at <= ?1 THEN 1 ELSE 0 END) AS published,
           SUM(CASE WHEN status='published' AND published_at >  ?1 THEN 1 ELSE 0 END) AS queued,
           SUM(CASE WHEN status='draft' THEN 1 ELSE 0 END) AS draft,
           SUM(CASE WHEN status='discarded' THEN 1 ELSE 0 END) AS discarded
         FROM articles`
      ).bind(now).first<{ published: number; queued: number; draft: number; discarded: number }>(),
    ]);

    const total = countRow?.c ?? 0;
    return {
      items: (rows.results ?? []).map((r) => mapRow(r, now)),
      total,
      page,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
      counts: {
        published: counts?.published ?? 0,
        queued: counts?.queued ?? 0,
        draft: counts?.draft ?? 0,
        discarded: counts?.discarded ?? 0,
      },
    };
  } catch (e) {
    console.error("listArticlesForAdmin error:", e);
    return empty;
  }
}

/** Trae el artículo completo sin filtrar por estado (para editarlo). */
export async function getArticleForAdmin(id: string) {
  const env = getCloudflareEnv();
  if (!env?.DB) return null;
  try {
    return await env.DB.prepare("SELECT * FROM articles WHERE id = ?").bind(id).first();
  } catch (e) {
    console.error("getArticleForAdmin error:", e);
    return null;
  }
}
