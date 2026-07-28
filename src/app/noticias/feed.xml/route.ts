import { listAllPublishedForFeed } from "@/lib/news";
import { absoluteUrl, articleUrl, SITE_NAME, SITE_DESCRIPTION, getSiteUrl } from "@/lib/seo";

// Igual que el índice: sin ISR, porque en build D1 no responde y el feed
// quedaría vacío. El Cache-Control de abajo hace el trabajo de caché.
export const dynamic = "force-dynamic";

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export async function GET() {
  const articles = await listAllPublishedForFeed(50);
  const site = getSiteUrl();

  const items = articles
    .map((a) => {
      const url = absoluteUrl(articleUrl(a.slug));
      const pubDate = a.publishedAt ? new Date(a.publishedAt).toUTCString() : new Date().toUTCString();
      return `    <item>
      <title>${escapeXml(a.title)}</title>
      <link>${url}</link>
      <guid isPermaLink="true">${url}</guid>
      <pubDate>${pubDate}</pubDate>
      <description>${escapeXml(a.excerpt)}</description>
      <category>${escapeXml(a.category)}</category>${
        a.image ? `\n      <enclosure url="${escapeXml(absoluteUrl(a.image))}" type="image/jpeg" />` : ""
      }
    </item>`;
    })
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escapeXml(SITE_NAME)} — Noticias</title>
    <link>${site}/noticias</link>
    <description>${escapeXml(SITE_DESCRIPTION)}</description>
    <language>es-VE</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <atom:link href="${site}/noticias/feed.xml" rel="self" type="application/rss+xml" />
${items}
  </channel>
</rss>`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "public, max-age=300, s-maxage=300",
    },
  });
}
