import Link from "next/link";

/**
 * Paginación basada en path (nunca ?page=): Google trata los query params como
 * de menor prioridad y en Next forzarían render dinámico.
 */
export default function Pagination({
  page,
  totalPages,
  hrefFor,
}: {
  page: number;
  totalPages: number;
  hrefFor: (page: number) => string;
}) {
  if (totalPages <= 1) return null;

  // Ventana de páginas alrededor de la actual, siempre con primera y última.
  const pages: (number | "gap")[] = [];
  const push = (n: number) => { if (!pages.includes(n)) pages.push(n); };
  push(1);
  if (page - 2 > 2) pages.push("gap");
  for (let p = Math.max(2, page - 1); p <= Math.min(totalPages - 1, page + 1); p++) push(p);
  if (page + 2 < totalPages - 1) pages.push("gap");
  if (totalPages > 1) push(totalPages);

  const base =
    "min-w-10 h-10 px-3 flex items-center justify-center rounded-full text-[11px] font-black uppercase tracking-widest transition-all";

  return (
    <nav aria-label="Paginación de noticias" className="flex flex-wrap items-center justify-center gap-2 mt-16">
      {page > 1 && (
        <Link href={hrefFor(page - 1)} rel="prev" className={`${base} glass text-zinc-400 hover:text-white border-white/10`}>
          ← Anterior
        </Link>
      )}

      {pages.map((p, i) =>
        p === "gap" ? (
          <span key={`gap-${i}`} className="px-2 text-zinc-700">…</span>
        ) : (
          <Link
            key={p}
            href={hrefFor(p)}
            aria-current={p === page ? "page" : undefined}
            className={`${base} ${p === page ? "bg-bonchona-red text-white" : "glass text-zinc-400 hover:text-white border-white/10"}`}
          >
            {p}
          </Link>
        )
      )}

      {page < totalPages && (
        <Link href={hrefFor(page + 1)} rel="next" className={`${base} glass text-zinc-400 hover:text-white border-white/10`}>
          Siguiente →
        </Link>
      )}
    </nav>
  );
}
