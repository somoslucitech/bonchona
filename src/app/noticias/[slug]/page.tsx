import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { getArticleBySlug, listRelated, getCategory } from "@/lib/news";
import {
  articleUrl, categoryUrl, absoluteUrl, articleJsonLd, breadcrumbJsonLd,
  jsonLdScript, DEFAULT_OG_IMAGE, SITE_NAME,
} from "@/lib/seo";
import { NewsCard, formatNewsDate } from "@/components/news/NewsCard";

// ISR largo: una noticia publicada casi no cambia. Las ediciones desde el
// admin disparan revalidatePath sobre esta ruta.
export const revalidate = 3600;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const article = await getArticleBySlug(slug);
  if (!article) return { title: "Noticia no encontrada", robots: { index: false, follow: false } };

  const title = article.seoTitle || article.title;
  const description = article.seoDescription || article.excerpt;
  const canonical = article.canonicalUrl || articleUrl(article.slug);
  const image = article.image ? absoluteUrl(article.image) : absoluteUrl(DEFAULT_OG_IMAGE);

  return {
    title,
    description,
    alternates: { canonical },
    robots: article.noindex ? { index: false, follow: true } : undefined,
    authors: [{ name: article.authorName }],
    openGraph: {
      type: "article",
      title,
      description,
      url: absoluteUrl(articleUrl(article.slug)),
      siteName: SITE_NAME,
      locale: "es_VE",
      publishedTime: article.publishedAt ? new Date(article.publishedAt).toISOString() : undefined,
      modifiedTime: new Date(article.updatedAt).toISOString(),
      authors: [article.authorName],
      section: getCategory(article.category)?.name,
      tags: article.tags,
      images: [{
        url: image,
        width: article.imageWidth ?? 1200,
        height: article.imageHeight ?? 630,
        alt: article.imageAlt || article.title,
      }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [image],
    },
  };
}

export default async function NoticiaPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const article = await getArticleBySlug(slug);
  if (!article) notFound();

  const category = getCategory(article.category);
  const related = await listRelated(article.category, article.id, 3);

  return (
    <div className="flex flex-col items-center w-full bg-bonchona-navy text-white min-h-screen overflow-x-hidden">
      <div className="fixed inset-0 bg-mesh-brand pointer-events-none opacity-30 z-0" />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: jsonLdScript([
            articleJsonLd(article),
            breadcrumbJsonLd([
              { name: "Inicio", path: "/" },
              { name: "Noticias", path: "/noticias" },
              ...(category ? [{ name: category.name, path: categoryUrl(category.slug) }] : []),
              { name: article.title, path: articleUrl(article.slug) },
            ]),
          ]),
        }}
      />

      <article className="w-full max-w-3xl mx-auto px-4 sm:px-6 pt-12 sm:pt-16 pb-20 z-10">
        {/* Migas: enlaces reales, no solo JSON-LD */}
        <nav aria-label="Ruta de navegación" className="flex flex-wrap items-center gap-2 text-[10px] font-black uppercase tracking-widest text-zinc-600 mb-8">
          <Link href="/" className="hover:text-white transition-colors">Inicio</Link>
          <span>/</span>
          <Link href="/noticias" className="hover:text-white transition-colors">Noticias</Link>
          {category && (
            <>
              <span>/</span>
              <Link href={categoryUrl(category.slug)} className="text-bonchona-red hover:text-white transition-colors">
                {category.name}
              </Link>
            </>
          )}
        </nav>

        <header className="mb-10">
          <h1 className="text-3xl sm:text-5xl md:text-6xl font-black italic uppercase tracking-tighter leading-[0.95] mb-6">
            {article.title}
          </h1>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[10px] font-black uppercase tracking-widest text-zinc-500">
            <time dateTime={article.publishedAt ? new Date(article.publishedAt).toISOString() : undefined}>
              {formatNewsDate(article.publishedAt)}
            </time>
            <span className="w-1 h-1 rounded-full bg-bonchona-red" />
            <span>Por {article.authorName}</span>
            {article.readingMinutes && (
              <>
                <span className="w-1 h-1 rounded-full bg-bonchona-red" />
                <span>{article.readingMinutes} min de lectura</span>
              </>
            )}
          </div>

          {article.excerpt && (
            <p className="mt-8 text-lg sm:text-xl text-zinc-300 leading-relaxed font-medium italic border-l-4 border-bonchona-red pl-6">
              {article.excerpt}
            </p>
          )}
        </header>

        {article.image && (
          <figure className="mb-10 -mx-4 sm:mx-0">
            <div className="relative aspect-[16/9] overflow-hidden sm:rounded-[2rem] bg-zinc-950 border border-white/5">
              <Image
                src={article.image}
                alt={article.imageAlt || article.title}
                fill
                priority
                sizes="(max-width: 768px) 100vw, 768px"
                className="object-cover"
              />
            </div>
          </figure>
        )}

        {/* El cuerpo ya viene sanitizado desde el ingest (allowlist, una sola
            vez al escribir). Renderizado en servidor: requisito duro para que
            los motores generativos puedan extraer el texto sin ejecutar JS. */}
        <div
          className="news-body max-w-none text-zinc-300"
          dangerouslySetInnerHTML={{ __html: article.bodyHtml }}
        />

        {article.tags.length > 0 && (
          <div className="mt-12 flex flex-wrap gap-2">
            {article.tags.map((tag) => (
              <span key={tag} className="px-4 py-2 glass rounded-full text-[9px] font-black uppercase tracking-widest text-zinc-500 border-white/5">
                {tag}
              </span>
            ))}
          </div>
        )}

        <div className="mt-16 pt-10 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-6">
          <Link href="/noticias" className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-500 hover:text-white transition-colors">
            ← Todas las noticias
          </Link>
          <Link
            href="/"
            className="px-8 py-4 bg-bonchona-red text-white font-black rounded-full uppercase tracking-widest text-[10px] shadow-[0_15px_30px_rgba(232,75,50,0.25)]"
          >
            Escuchar en vivo
          </Link>
        </div>
      </article>

      {related.length > 0 && (
        <section className="w-full max-w-7xl mx-auto px-4 sm:px-6 pb-24 sm:pb-32 z-10 border-t border-white/5 pt-16">
          <h2 className="text-2xl sm:text-4xl font-black italic uppercase tracking-tighter mb-10">
            Más de <span className="text-gradient">{category?.name ?? "Bonchona"}.</span>
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
            {related.map((a) => <NewsCard key={a.id} article={a} />)}
          </div>
        </section>
      )}
    </div>
  );
}
