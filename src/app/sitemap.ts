import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/seo";
import { getPrograms } from "@/lib/db";
import { programPath } from "@/lib/program-slug";

// force-dynamic para que lea SITE_URL del Worker: si se prerenderiza en build
// esa variable no existe y el sitemap quedaría con el dominio por defecto.
export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const site = getSiteUrl();
  const url = (path: string) => `${site}${path === "/" ? "" : path}`;

  // Los programas salen de D1: uno nuevo creado en el admin entra solo aquí.
  const programs = await getPrograms();

  return [
    { url: url("/"), changeFrequency: "daily", priority: 1 },
    { url: url("/programas"), changeFrequency: "weekly", priority: 0.8 },
    ...programs.map((p) => ({ url: url(programPath(p.id)), changeFrequency: "weekly" as const, priority: 0.7 })),
    { url: url("/famoso"), changeFrequency: "monthly", priority: 0.8 },
    { url: url("/estudio"), changeFrequency: "monthly", priority: 0.7 },
    { url: url("/nosotros"), changeFrequency: "yearly", priority: 0.5 },
  ];
}
