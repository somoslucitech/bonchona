import Link from "next/link";
import Image from "next/image";
import type { ArticleCard } from "@/lib/news";
import { getCategory } from "@/lib/news";
import { NewsCard, formatNewsDate } from "./NewsCard";

/**
 * Portada editorial: la primera noticia manda y las otras dos la acompañan.
 *
 * La jerarquía la da el tamaño, no un carrusel: en un hero rotativo la
 * primera diapositiva se lleva casi toda la atención y el resto pasa
 * desapercibido, justo lo contrario de "destacar".
 */
function LeadStory({ article }: { article: ArticleCard }) {
  const cat = getCategory(article.category);

  return (
    <article className="group relative glass rounded-[2rem] sm:rounded-[2.5rem] overflow-hidden border-white/5 hover:border-bonchona-red/40 transition-all duration-500 h-full">
      <Link href={`/noticias/${article.slug}`} className="flex flex-col h-full">
        {/* min-h-0 es lo que impide que la imagen empuje la tarjeta más allá
            de la altura fija del bloque en escritorio. */}
        <div className="relative aspect-[16/9] lg:aspect-auto lg:flex-1 lg:min-h-0 overflow-hidden bg-zinc-950">
          <Image
            src={article.image || "/logos-bonchona/92.png"}
            alt={article.imageAlt || article.title}
            fill
            priority
            sizes="(max-width: 1024px) 100vw, 66vw"
            className="object-cover group-hover:scale-105 transition-transform duration-700"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-bonchona-navy via-bonchona-navy/20 to-transparent" />
          {cat && (
            <span className="absolute top-5 left-5 px-4 py-2 rounded-full bg-bonchona-red text-white text-[9px] font-black uppercase tracking-widest">
              {cat.name}
            </span>
          )}
        </div>

        {/* flex-shrink-0: el texto manda su altura y el resto se lo lleva la imagen. */}
        <div className="p-7 sm:p-8 lg:p-9 flex-shrink-0">
          <time
            dateTime={article.publishedAt ? new Date(article.publishedAt).toISOString() : undefined}
            className="text-[9px] font-black uppercase tracking-[0.3em] text-bonchona-purple-medium"
          >
            {formatNewsDate(article.publishedAt)}
          </time>

          <h3 className="mt-3 text-2xl sm:text-3xl font-black italic uppercase tracking-tighter leading-[0.95] text-white group-hover:text-bonchona-red transition-colors line-clamp-2">
            {article.title}
          </h3>

          <p className="mt-3 text-zinc-400 text-sm leading-relaxed line-clamp-2 max-w-2xl">
            {article.excerpt}
          </p>

          <div className="mt-5 flex items-center gap-3 text-[10px] font-black uppercase tracking-widest text-bonchona-red">
            <div className="w-10 h-px bg-bonchona-red group-hover:w-16 transition-all" />
            Leer la nota
          </div>
        </div>
      </Link>
    </article>
  );
}

export default function FeaturedNews({ articles }: { articles: ArticleCard[] }) {
  if (articles.length === 0) return null;

  const [lead, ...rest] = articles;

  return (
    <section className="w-full max-w-7xl mx-auto px-4 sm:px-6 py-16 sm:py-24 z-10">
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-8 mb-12 sm:mb-16">
        <div className="flex flex-col items-center lg:items-start text-center lg:text-left">
          <span className="text-bonchona-purple-medium font-black tracking-[0.3em] sm:tracking-[0.4em] text-[10px] sm:text-xs uppercase mb-4 sm:mb-6 block">
            Lo que está sonando
          </span>
          <h2 className="text-4xl sm:text-6xl md:text-7xl font-black italic uppercase tracking-tighter leading-none">
            EL BONCHE <span className="text-gradient">DE HOY.</span>
          </h2>
        </div>
        <Link
          href="/noticias"
          className="text-[10px] font-black uppercase tracking-[0.3em] text-white hover:text-bonchona-red transition-all flex items-center gap-4 group whitespace-nowrap self-center lg:self-auto"
        >
          Ver todas
          <div className="w-12 h-px bg-white/20 group-hover:bg-bonchona-red group-hover:w-20 transition-all" />
        </Link>
      </div>

      {/* La principal ocupa dos tercios; las otras dos se apilan al lado.
          Con una sola noticia, ocupa todo el ancho sin dejar huecos.

          Altura fija en escritorio (~la del cuadro cuadrado del hero) para
          que el bloque guarde la proporción de la portada. En móvil no se
          fija nada: ahí las tarjetas se apilan y crecen a su aire. */}
      <div className={`grid gap-6 sm:gap-8 ${rest.length > 0 ? "lg:grid-cols-3 lg:h-[600px]" : ""}`}>
        <div className={rest.length > 0 ? "lg:col-span-2 lg:min-h-0" : ""}>
          <LeadStory article={lead} />
        </div>

        {rest.length > 0 && (
          <div className="grid gap-6 sm:gap-8 sm:grid-cols-2 lg:grid-cols-1 lg:grid-rows-2 lg:h-full lg:min-h-0">
            {rest.map((a) => (
              <NewsCard key={a.id} article={a} compact />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
