import Image from "next/image";
import Link from "next/link";
import type { Program } from "@/lib/db";
import { bannerThumb, programPath } from "@/lib/program-slug";

// Tarjetas enlazadas a la página de cada programa. Son <a> reales para que
// buscadores y asistentes de IA puedan recorrer la parrilla.
// `eager`: en /programas la parrilla es lo primero que se ve y una de sus
// imágenes es el LCP; con la carga diferida por defecto llegaba a ~4 s.
export default function ProgramGrid({ programs, eager = false }: { programs: Program[]; eager?: boolean }) {
  return (
    <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
      {programs.map((p, i) => (
        <li key={p.id}>
          <Link
            href={programPath(p.id)}
            className="group relative block h-[300px] glass rounded-[2rem] overflow-hidden border-white/5 hover:border-bonchona-red/50 transition-all duration-500"
          >
            <Image
              src={p.banner ? bannerThumb(p.banner) : "/logos-bonchona/92.png"}
              alt={p.title}
              fill
              sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw"
              loading={eager ? "eager" : "lazy"}
              fetchPriority={eager && i === 0 ? "high" : "auto"}
              className="object-cover opacity-40 group-hover:opacity-70 transition-all duration-700 grayscale group-hover:grayscale-0"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-bonchona-navy via-bonchona-navy/40 to-transparent"></div>
            <div className="absolute inset-0 p-7 flex flex-col justify-end">
              <span className="text-bonchona-red text-[10px] font-black tracking-widest block mb-3 uppercase">{p.time}</span>
              <h3 className="text-2xl font-black text-white uppercase italic tracking-tighter leading-none mb-2">{p.title}</h3>
              <p className="text-zinc-400 text-xs">Con {p.locutor}</p>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}
