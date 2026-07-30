import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/seo";

// force-dynamic para que lea SITE_URL del Worker: si se prerenderiza en build
// esa variable no existe y el sitemap quedaría con el dominio por defecto.
export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const site = getSiteUrl();
  const url = (path: string) => `${site}${path === "/" ? "" : path}`;

  return [
    { url: url("/"), changeFrequency: "daily", priority: 1 },
    { url: url("/famoso"), changeFrequency: "monthly", priority: 0.8 },
    { url: url("/estudio"), changeFrequency: "monthly", priority: 0.7 },
    { url: url("/nosotros"), changeFrequency: "yearly", priority: 0.5 },
  ];
}
