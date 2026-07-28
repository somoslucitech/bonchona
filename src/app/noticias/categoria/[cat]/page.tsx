import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { listByCategory, getCategory, isValidCategory } from "@/lib/news";
import { categoryUrl, absoluteUrl, itemListJsonLd, breadcrumbJsonLd, jsonLdScript } from "@/lib/seo";
import NewsIndex from "@/components/news/NewsIndex";

export const revalidate = 300;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ cat: string }>;
}): Promise<Metadata> {
  const { cat } = await params;
  const category = getCategory(cat);
  if (!category) return { title: "Categoría no encontrada" };

  return {
    title: category.seoTitle,
    description: category.seoDescription,
    alternates: { canonical: categoryUrl(category.slug) },
    openGraph: {
      type: "website",
      title: category.seoTitle,
      description: category.seoDescription,
      url: absoluteUrl(categoryUrl(category.slug)),
    },
  };
}

export default async function CategoriaPage({ params }: { params: Promise<{ cat: string }> }) {
  const { cat } = await params;
  if (!isValidCategory(cat)) notFound();

  const category = getCategory(cat)!;
  const { items, page, totalPages } = await listByCategory(cat, 1);

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
            ]),
            itemListJsonLd(items, categoryUrl(cat)),
          ]),
        }}
      />
      <NewsIndex
        title={category.name.toUpperCase()}
        highlight="EN BONCHONA."
        description={category.seoDescription}
        articles={items}
        page={page}
        totalPages={totalPages}
        hrefFor={(p) => categoryUrl(cat, p)}
        activeCategory={cat}
      />
    </>
  );
}
