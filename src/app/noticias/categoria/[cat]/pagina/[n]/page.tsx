import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { listByCategory, getCategory, isValidCategory } from "@/lib/news";
import { categoryUrl, absoluteUrl, itemListJsonLd, breadcrumbJsonLd, jsonLdScript } from "@/lib/seo";
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
  params: Promise<{ cat: string; n: string }>;
}): Promise<Metadata> {
  const { cat, n } = await params;
  const category = getCategory(cat);
  if (!category) return { title: "Categoría no encontrada" };
  const page = parsePage(n) ?? 1;

  return {
    title: `${category.seoTitle} — Página ${page}`,
    description: category.seoDescription,
    alternates: { canonical: categoryUrl(category.slug, page) },
    openGraph: {
      type: "website",
      title: `${category.seoTitle} — Página ${page}`,
      url: absoluteUrl(categoryUrl(category.slug, page)),
    },
  };
}

export default async function CategoriaPaginaPage({
  params,
}: {
  params: Promise<{ cat: string; n: string }>;
}) {
  const { cat, n } = await params;
  if (!isValidCategory(cat)) notFound();

  const page = parsePage(n);
  if (page === null) notFound();
  if (page === 1) redirect(categoryUrl(cat));

  const category = getCategory(cat)!;
  const { items, totalPages } = await listByCategory(cat, page);
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
              { name: category.name, path: categoryUrl(cat) },
              { name: `Página ${page}`, path: categoryUrl(cat, page) },
            ]),
            itemListJsonLd(items, categoryUrl(cat, page)),
          ]),
        }}
      />
      <NewsIndex
        title={category.name.toUpperCase()}
        highlight="EN BONCHONA."
        description={`${category.seoDescription} — página ${page} de ${totalPages}.`}
        articles={items}
        page={page}
        totalPages={totalPages}
        hrefFor={(p) => categoryUrl(cat, p)}
        activeCategory={cat}
      />
    </>
  );
}
