import type { Metadata } from "next";
import { listPublished } from "@/lib/news";
import { newsIndexUrl, absoluteUrl, itemListJsonLd, breadcrumbJsonLd, jsonLdScript } from "@/lib/seo";
import NewsIndex from "@/components/news/NewsIndex";

// force-dynamic, NO ISR: D1 no es alcanzable en build time, así que con
// `revalidate` esta página se prerenderizaría VACÍA y serviría así hasta la
// primera revalidación tras cada deploy. Es el índice principal de noticias:
// que un crawler lo vea vacío aunque sea 5 minutos anula el objetivo de SEO.
// Las rutas con segmento dinámico ([slug], categoria, pagina) sí usan ISR
// porque nunca se prerenderizan en build.
export const dynamic = "force-dynamic";

const TITLE = "Noticias musicales de Venezuela y el mundo";
const DESCRIPTION =
  "Estrenos, artistas y todo el bonche musical, contado desde Valencia por Bonchona 107.1 FM. Actualizado todos los días.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: newsIndexUrl(1) },
  openGraph: {
    type: "website",
    title: TITLE,
    description: DESCRIPTION,
    url: absoluteUrl(newsIndexUrl(1)),
  },
};

export default async function NoticiasPage() {
  const { items, page, totalPages } = await listPublished(1);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: jsonLdScript([
            breadcrumbJsonLd([
              { name: "Inicio", path: "/" },
              { name: "Noticias", path: "/noticias" },
            ]),
            itemListJsonLd(items, "/noticias"),
          ]),
        }}
      />
      <NewsIndex
        title="TODO EL"
        highlight="BONCHE."
        description={DESCRIPTION}
        articles={items}
        page={page}
        totalPages={totalPages}
        hrefFor={newsIndexUrl}
      />
    </>
  );
}
