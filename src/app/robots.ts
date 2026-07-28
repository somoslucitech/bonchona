import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/seo";

// force-dynamic: si se prerenderiza en build, getSiteUrl() no ve la variable
// SITE_URL del Worker y cae al dominio por defecto, dejando robots.txt y
// sitemap.xml apuntando a hosts distintos.
export const dynamic = "force-dynamic";

export default function robots(): MetadataRoute.Robots {
  const site = getSiteUrl();

  // Mientras el sitio viva en un dominio de pruebas (*.workers.dev) no debe
  // indexarse: bonchonaradio.com todavía sirve el WordPress y tendríamos dos
  // copias del mismo contenido compitiendo en Google.
  const isStaging = /workers\.dev$/i.test(new URL(site).hostname);

  if (isStaging) {
    return {
      rules: [{ userAgent: "*", disallow: "/" }],
    };
  }

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin", "/api/"],
      },
    ],
    sitemap: `${site}/sitemap.xml`,
    host: site,
  };
}
