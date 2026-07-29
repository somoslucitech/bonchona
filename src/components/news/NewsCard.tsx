import Link from "next/link";
import Image from "next/image";
import type { ArticleCard } from "@/lib/news";
import { getCategory } from "@/lib/news";

export function formatNewsDate(ts: number | null): string {
  if (!ts) return "";
  return new Date(ts).toLocaleDateString("es-VE", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "America/Caracas",
  });
}

export function NewsCard({
  article, priority = false, compact = false,
}: {
  article: ArticleCard;
  priority?: boolean;
  /** Para huecos de altura fija (la columna lateral de la portada). */
  compact?: boolean;
}) {
  const cat = getCategory(article.category);
  return (
    <article className={`group relative glass rounded-[2rem] overflow-hidden border-white/5 hover:border-bonchona-red/40 transition-all duration-500 flex flex-col ${compact ? "min-h-0" : ""}`}>
      <Link href={`/noticias/${article.slug}`} className="flex flex-col h-full min-h-0">
        <div className={`relative overflow-hidden bg-zinc-950 ${compact ? "aspect-[16/9] lg:aspect-auto lg:flex-1 lg:min-h-0" : "aspect-[16/9]"}`}>
          <Image
            src={article.image || "/logos-bonchona/92.png"}
            alt={article.imageAlt || article.title}
            fill
            priority={priority}
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            className="object-cover group-hover:scale-105 transition-transform duration-700"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-bonchona-navy/80 via-transparent to-transparent" />
          {cat && (
            <span className="absolute top-4 left-4 px-3 py-1.5 rounded-full bg-bonchona-red text-white text-[9px] font-black uppercase tracking-widest">
              {cat.name}
            </span>
          )}
        </div>

        <div className={`flex flex-col ${compact ? "p-5 sm:p-6 flex-shrink-0" : "p-6 sm:p-7 flex-1"}`}>
          <time
            dateTime={article.publishedAt ? new Date(article.publishedAt).toISOString() : undefined}
            className={`text-[9px] font-black uppercase tracking-[0.25em] text-bonchona-purple-medium ${compact ? "mb-2" : "mb-3"}`}
          >
            {formatNewsDate(article.publishedAt)}
          </time>

          <h3 className={`font-black text-white leading-tight tracking-tight group-hover:text-bonchona-red transition-colors ${compact ? "text-base line-clamp-2 mb-2" : "text-lg sm:text-xl mb-3"}`}>
            {article.title}
          </h3>

          <p className={`text-zinc-500 leading-relaxed ${compact ? "text-xs line-clamp-2" : "text-xs sm:text-sm line-clamp-3 flex-1"}`}>
            {article.excerpt}
          </p>

          <div className={`flex items-center gap-3 text-[10px] font-black uppercase tracking-widest text-zinc-600 ${compact ? "mt-3" : "mt-5"}`}>
            <span className="w-8 h-px bg-bonchona-red group-hover:w-12 transition-all" />
            Leer nota
            {article.readingMinutes ? <span className="ml-auto normal-case">{article.readingMinutes} min</span> : null}
          </div>
        </div>
      </Link>
    </article>
  );
}

export function NewsGrid({ articles }: { articles: ArticleCard[] }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
      {articles.map((a, i) => (
        <NewsCard key={a.id} article={a} priority={i < 3} />
      ))}
    </div>
  );
}
