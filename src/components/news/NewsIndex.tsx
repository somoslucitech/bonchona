import Link from "next/link";
import { NewsGrid } from "./NewsCard";
import Pagination from "./Pagination";
import { NEWS_CATEGORIES, type ArticleCard, type NewsCategorySlug } from "@/lib/news";

interface NewsIndexProps {
  title: string;
  highlight: string;
  description: string;
  articles: ArticleCard[];
  page: number;
  totalPages: number;
  hrefFor: (page: number) => string;
  activeCategory?: NewsCategorySlug | null;
}

export default function NewsIndex({
  title, highlight, description, articles, page, totalPages, hrefFor, activeCategory = null,
}: NewsIndexProps) {
  return (
    <div className="flex flex-col items-center w-full bg-bonchona-navy text-white min-h-screen overflow-x-hidden">
      <div className="fixed inset-0 bg-mesh-brand pointer-events-none opacity-40 z-0" />

      <section className="w-full max-w-7xl mx-auto px-4 sm:px-6 pt-16 sm:pt-20 pb-10 z-10">
        <div className="flex flex-col items-center lg:items-start text-center lg:text-left">
          <span className="text-bonchona-purple-medium font-black tracking-[0.4em] text-[10px] sm:text-xs uppercase mb-6">
            Bonchona Noticias
          </span>
          <h1 className="text-4xl sm:text-6xl md:text-7xl font-black italic uppercase tracking-tighter leading-none mb-6">
            {title} <span className="text-gradient">{highlight}</span>
          </h1>
          <p className="text-zinc-500 max-w-2xl text-base sm:text-lg leading-relaxed">{description}</p>
        </div>

        {/* Navegación por categoría: enlaces reales, para que el crawler los siga */}
        <nav aria-label="Categorías" className="flex flex-wrap gap-2 mt-10 sm:mt-12">
          <Link
            href="/noticias"
            className={`px-5 py-2.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${
              activeCategory === null ? "bg-bonchona-red text-white" : "glass text-zinc-400 hover:text-white border-white/10"
            }`}
          >
            Todas
          </Link>
          {NEWS_CATEGORIES.map((c) => (
            <Link
              key={c.slug}
              href={`/noticias/categoria/${c.slug}`}
              className={`px-5 py-2.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${
                activeCategory === c.slug ? "bg-bonchona-red text-white" : "glass text-zinc-400 hover:text-white border-white/10"
              }`}
            >
              {c.name}
            </Link>
          ))}
        </nav>
      </section>

      <section className="w-full max-w-7xl mx-auto px-4 sm:px-6 pb-24 sm:pb-32 z-10">
        {articles.length === 0 ? (
          <div className="glass rounded-[2.5rem] p-12 sm:p-20 text-center border-white/10">
            <p className="text-zinc-400 font-bold uppercase tracking-widest text-sm">
              Todavía no hay noticias publicadas en esta sección.
            </p>
            <Link
              href="/noticias"
              className="inline-block mt-8 px-8 py-4 bg-bonchona-red text-white font-black rounded-full uppercase tracking-widest text-[10px]"
            >
              Ver todas las noticias
            </Link>
          </div>
        ) : (
          <>
            <NewsGrid articles={articles} />
            <Pagination page={page} totalPages={totalPages} hrefFor={hrefFor} />
          </>
        )}
      </section>
    </div>
  );
}
