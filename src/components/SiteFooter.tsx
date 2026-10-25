"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";

// Pie de página común. Antes estaba copiado dentro de cada página (inicio,
// estudio, anúnciate, historia) y las páginas nuevas, como /programas, salían
// sin él.

// Crédito del desarrollador. Marcado con UTM para que Somos Luci vea en su
// analítica cuánta gente llega desde aquí, y con rel="nofollow": un enlace
// repetido en el pie de todas las páginas de un cliente es lo que Google
// considera un esquema de enlaces, y así no corre ese riesgo.
const CREDIT_URL =
  "https://somosluci.com/?utm_source=bonchonaradio&utm_medium=referral&utm_campaign=credito-web";

const linkClass =
  "text-[9px] sm:text-[10px] font-bold text-zinc-500 hover:text-white transition-colors uppercase tracking-widest";

export default function SiteFooter() {
  const pathname = usePathname();
  if (pathname.startsWith("/admin")) return null;

  // En /famoso el enlace a sí misma no sirve: se cambia por volver a escuchar.
  const onFamoso = pathname === "/famoso";

  return (
    <footer className="w-full py-16 sm:py-20 px-4 sm:px-6 z-10 bg-bonchona-navy border-t border-white/5 relative">
      <div className="max-w-7xl mx-auto flex flex-col items-center gap-10 sm:gap-12">
        <div className="flex flex-col items-center gap-6">
          <Image src="/logos-bonchona/92.png" alt="Logo" width={80} height={80} className="w-16 sm:w-20 h-auto opacity-40 object-contain" />
          <div className="text-center">
            <p className="text-[70px] sm:text-[100px] md:text-[140px] font-black text-white/5 leading-none italic uppercase tracking-tighter select-none" aria-hidden>
              107.1
            </p>
            <p className="text-zinc-600 font-black uppercase tracking-[0.6em] sm:tracking-[0.8em] text-[9px] sm:text-[10px] mt-4">Valencia, Venezuela</p>
          </div>
        </div>

        <div className="w-full h-px bg-white/5"></div>

        <div className="flex flex-col md:flex-row justify-between items-center w-full gap-8 text-center md:text-left">
          <div className="flex flex-col sm:flex-row items-center gap-3 sm:gap-4">
            <p className="text-[9px] sm:text-[10px] text-zinc-700 font-bold uppercase tracking-widest">
              © {new Date().getFullYear()} Radio Bonchona. Todos los derechos reservados.
            </p>
            <span className="hidden sm:block w-1 h-1 rounded-full bg-zinc-800" aria-hidden></span>
            <a
              href={CREDIT_URL}
              target="_blank"
              rel="nofollow noopener"
              className="group inline-flex items-center gap-2 text-[9px] sm:text-[10px] font-bold text-zinc-600 hover:text-white transition-colors uppercase tracking-widest"
            >
              <span className="w-5 h-5 rounded-md bg-white flex items-center justify-center flex-shrink-0 opacity-70 group-hover:opacity-100 transition-opacity">
                <Image src="/creditos/somosluci.png" alt="" width={16} height={16} className="w-4 h-4" />
              </span>
              <span>
                Hecho con <span className="text-bonchona-red" aria-label="amor">♥</span> por{" "}
                <span className="text-zinc-400 group-hover:text-white transition-colors">Somos Luci</span>
              </span>
            </a>
          </div>

          <div className="flex flex-wrap justify-center gap-6 sm:gap-8">
            <Link href="/programas" className={linkClass}>Programas</Link>
            <Link href="/nosotros" className={linkClass}>Empresa</Link>
            <Link href="/estudio" className={linkClass}>Estudio</Link>
            {onFamoso ? (
              <Link href="/" className={`${linkClass} !text-bonchona-red hover:!text-white`}>Escuchar</Link>
            ) : (
              <Link href="/famoso" className={`${linkClass} !text-bonchona-red hover:!text-white`}>Anúnciate</Link>
            )}
          </div>
        </div>
      </div>
    </footer>
  );
}
