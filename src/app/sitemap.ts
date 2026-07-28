import type { MetadataRoute } from "next";
import { listAllPublishedForFeed, listPublished, NEWS_CATEGORIES, PAGE_SIZE } from "@/lib/news";
import { getSiteUrl, articleUrl, categoryUrl, newsIndexUrl } from "@/lib/seo";

// force-dynamic porque D1 no es alcanzable en build time: si esto se
// prerenderizara, el sitemap quedaría congelado y vacío.
export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const site = getSiteUrl();
  const url = (path: string) => `${site}${path === "/" ? "" : path}`;

  const staticPages: MetadataRoute.Sitemap = [
    { url: url("/"), changeFrequency: "daily", priority: 1 },
    { url: url("/noticias"), changeFrequency: "hourly", priority: 0.9 },
    { url: url("/famoso"), changeFrequency: "monthly", priority: 0.8 },
    { url: url("/estudio"), changeFrequency: "monthly", priority: 0.7 },
    { url: url("/nosotros"), changeFrequency: "yearly", priority: 0.5 },
  ];

  const categories: MetadataRoute.Sitemap = NEWS_CATEGORIES.map((c) => ({
    url: url(categoryUrl(c.slug)),
    changeFrequency: "daily" as const,
    priority: 0.7,
  }));

  // Solo lo ya visible: las noticias en cola (published_at futuro) quedan
  // fuera, que es justo lo que queremos.
  const articles = await listAllPublishedForFeed(5000);
  const articleEntries: MetadataRoute.Sitemap = articles.map((a) => ({
    url: url(articleUrl(a.slug)),
    lastModified: new Date(a.updatedAt),
    changeFrequency: "weekly" as const,
    priority: 0.6,
  }));

  // Páginas de paginación del índice, para que el crawler llegue al archivo
  // completo sin depender solo del enlazado.
  const { totalPages } = await listPublished(1, PAGE_SIZE);
  const paginationEntries: MetadataRoute.Sitemap = [];
  for (let p = 2; p <= Math.min(totalPages, 200); p++) {
    paginationEntries.push({
      url: url(newsIndexUrl(p)),
      changeFrequency: "weekly" as const,
      priority: 0.3,
    });
  }

  return [...staticPages, ...categories, ...paginationEntries, ...articleEntries];
}
