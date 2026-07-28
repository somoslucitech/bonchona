import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { listPublished } from "@/lib/news";
import { newsIndexUrl, absoluteUrl, itemListJsonLd, breadcrumbJsonLd, jsonLdScript } from "@/lib/seo";
import NewsIndex from "@/components/news/NewsIndex";

export const revalidate = 300;

function parsePage(raw: string): number | null {
  if (!/^\d+$/.test(raw)) return null;
  const n = Number(raw);
  return n >= 1 && n <= 10000 ? n : null;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ n: string }>;
}): Promise<Metadata> {
  const { n } = await params;
  const page = parsePage(n) ?? 1;
  const title = `Noticias — Página ${page}`;
  return {
    title,
    description: `Archivo de noticias musicales de Bonchona 107.1 FM. Página ${page}.`,
    // Canónica auto-referencial: nunca apuntar la página N a la 1.
    alternates: { canonical: newsIndexUrl(page) },
    openGraph: { type: "website", title, url: absoluteUrl(newsIndexUrl(page)) },
  };
}

export default async function NoticiasPaginaPage({ params }: { params: Promise<{ n: string }> }) {
  const { n } = await params;
  const page = parsePage(n);
  if (page === null) notFound();
  // /noticias/pagina/1 duplicaría /noticias: consolidamos con un 308.
  if (page === 1) redirect("/noticias");

  const { items, totalPages } = await listPublished(page);
  if (items.length === 0) notFound();

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: jsonLdScript([
            breadcrumbJsonLd([
              { name: "Inicio", path: "/" },
              { name: "Noticias", path: "/noticias" },
              { name: `Página ${page}`, path: newsIndexUrl(page) },
            ]),
            itemListJsonLd(items, newsIndexUrl(page)),
          ]),
        }}
      />
      <NewsIndex
        title="TODO EL"
        highlight="BONCHE."
        description={`Archivo de noticias — página ${page} de ${totalPages}.`}
        articles={items}
        page={page}
        totalPages={totalPages}
        hrefFor={newsIndexUrl}
      />
    </>
  );
}
