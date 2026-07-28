import { getCloudflareEnv } from "./cf-env";
import type { Article, ArticleCard, NewsCategorySlug } from "./news";
import { getCategory } from "./news";

// ---------------------------------------------------------------------------
// Identidad del sitio. SITE_URL se define en wrangler.json (vars) para que las
// URLs canónicas y de Open Graph sean absolutas y correctas por entorno.
// ---------------------------------------------------------------------------

export const SITE_NAME = "Bonchona 107.1 FM";
export const SITE_TAGLINE = "Sintonía Total";
export const SITE_DESCRIPTION =
  "Escucha en vivo Bonchona 107.1 FM desde Valencia, Carabobo. La mejor música, noticias y entretenimiento donde la sintonía es total.";
export const SITE_LOCALE = "es_VE";
export const DEFAULT_OG_IMAGE = "/og/bonchona-default.jpg";

export function getSiteUrl(): string {
  const env = getCloudflareEnv();
  const raw = env?.SITE_URL || process.env.SITE_URL || process.env.NEXT_PUBLIC_SITE_URL;
  return (raw || "https://bonchonaradio.com").replace(/\/+$/, "");
}

export function absoluteUrl(path: string): string {
  if (/^https?:\/\//i.test(path)) return path;
  return `${getSiteUrl()}${path.startsWith("/") ? path : `/${path}`}`;
}

export function articleUrl(slug: string): string {
  return `/noticias/${slug}`;
}

export function categoryUrl(slug: NewsCategorySlug, page = 1): string {
  return page <= 1 ? `/noticias/categoria/${slug}` : `/noticias/categoria/${slug}/pagina/${page}`;
}

export function newsIndexUrl(page = 1): string {
  return page <= 1 ? "/noticias" : `/noticias/pagina/${page}`;
}

// ---------------------------------------------------------------------------
// JSON-LD. Clave para GEO: los motores generativos leen estos bloques para
// entender de qué trata la página y a quién atribuirla.
// ---------------------------------------------------------------------------

const PUBLISHER = {
  "@type": "Organization",
  name: SITE_NAME,
  url: "https://bonchonaradio.com",
  logo: {
    "@type": "ImageObject",
    url: "https://bonchonaradio.com/logos-bonchona/92.png",
  },
};

export function organizationJsonLd() {
  const site = getSiteUrl();
  return {
    "@context": "https://schema.org",
    "@type": "RadioStation",
    "@id": `${site}/#organization`,
    name: SITE_NAME,
    alternateName: "Radio Bonchona",
    description: SITE_DESCRIPTION,
    url: site,
    logo: absoluteUrl("/logos-bonchona/92.png"),
    image: absoluteUrl("/logos-bonchona/92.png"),
    slogan: SITE_TAGLINE,
    broadcastFrequency: "107.1 FM",
    inLanguage: "es-VE",
    areaServed: [
      { "@type": "City", name: "Valencia" },
      { "@type": "State", name: "Carabobo" },
      { "@type": "Country", name: "Venezuela" },
    ],
    address: {
      "@type": "PostalAddress",
      addressLocality: "Valencia",
      addressRegion: "Carabobo",
      addressCountry: "VE",
    },
  };
}

export function websiteJsonLd() {
  const site = getSiteUrl();
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${site}/#website`,
    name: SITE_NAME,
    url: site,
    description: SITE_DESCRIPTION,
    inLanguage: "es-VE",
    publisher: { "@id": `${site}/#organization` },
  };
}

export function articleJsonLd(article: Article) {
  const url = absoluteUrl(articleUrl(article.slug));
  const cat = getCategory(article.category);

  return {
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    "@id": `${url}#article`,
    headline: article.title.slice(0, 110),
    description: article.seoDescription || article.excerpt,
    url,
    mainEntityOfPage: { "@type": "WebPage", "@id": url },
    datePublished: article.publishedAt ? new Date(article.publishedAt).toISOString() : undefined,
    dateModified: new Date(article.updatedAt).toISOString(),
    author: { "@type": "Person", name: article.authorName },
    publisher: PUBLISHER,
    image: article.image
      ? [{
          "@type": "ImageObject",
          url: absoluteUrl(article.image),
          width: article.imageWidth ?? undefined,
          height: article.imageHeight ?? undefined,
        }]
      : [absoluteUrl(DEFAULT_OG_IMAGE)],
    articleSection: cat?.name ?? "Noticias",
    keywords: article.tags.length ? article.tags.join(", ") : undefined,
    wordCount: article.wordCount ?? undefined,
    timeRequired: article.readingMinutes ? `PT${article.readingMinutes}M` : undefined,
    inLanguage: "es-VE",
    isAccessibleForFree: true,
  };
}

export function breadcrumbJsonLd(items: Array<{ name: string; path: string }>) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((it, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: it.name,
      item: absoluteUrl(it.path),
    })),
  };
}

export function itemListJsonLd(items: ArticleCard[], basePath: string) {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    url: absoluteUrl(basePath),
    numberOfItems: items.length,
    itemListElement: items.map((a, i) => ({
      "@type": "ListItem",
      position: i + 1,
      url: absoluteUrl(articleUrl(a.slug)),
      name: a.title,
    })),
  };
}

/** Serializa JSON-LD de forma segura para inyectar en un <script>. */
export function jsonLdScript(data: unknown): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}
