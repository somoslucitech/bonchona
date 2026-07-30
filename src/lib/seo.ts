import { getCloudflareEnv } from "./cf-env";

// ---------------------------------------------------------------------------
// Identidad del sitio. SITE_URL se define en wrangler.json (vars) para que las
// URLs canónicas y de Open Graph sean absolutas y correctas por entorno.
// ---------------------------------------------------------------------------

export const SITE_NAME = "Bonchona 107.1 FM";
export const SITE_TAGLINE = "Sintonía Total";
export const SITE_DESCRIPTION =
  "Escucha en vivo Bonchona 107.1 FM desde Valencia, Carabobo. La mejor música y entretenimiento donde la sintonía es total.";
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

/** Serializa JSON-LD de forma segura para inyectar en un <script>. */
export function jsonLdScript(data: unknown): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}
