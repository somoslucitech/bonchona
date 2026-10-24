import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getPrograms, type Program } from "@/lib/db";
import { bannerThumb, programPath } from "@/lib/program-slug";
import ListenLiveButton from "@/components/ListenLiveButton";
import ProgramGrid from "@/components/ProgramGrid";
import {
  SITE_NAME, SITE_LOCALE, DEFAULT_OG_IMAGE,
  programJsonLd, breadcrumbJsonLd, jsonLdScript,
} from "@/lib/seo";

// Los programas los crea y edita el admin en D1: se leen en cada visita para
// que un programa nuevo o un cambio de horario se vea al instante.
export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

async function findProgram(id: string): Promise<{ program: Program | undefined; all: Program[] }> {
  const all = await getPrograms();
  return { program: all.find((p) => p.id === decodeURIComponent(id)), all };
}

function summary(text: string, max = 155): string {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  return clean.slice(0, clean.lastIndexOf(" ", max - 1)) + "…";
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const { program } = await findProgram(id);
  // notFound() aquí y no solo en la página: la metadata se resuelve antes de
  // que el layout empiece a enviar HTML, así que el id inexistente responde
  // 404 de verdad y no un 200 con el texto de "no encontrado" (soft 404).
  if (!program) notFound();

  const path = programPath(program.id);
  // El horario va en la descripción: en el título lo dejaba en ~90 caracteres.
  const title = `${program.title}: programa de radio en Valencia`;
  const description = summary(
    `${program.title}, con ${program.locutor}, de ${program.time} por Bonchona 107.1 FM. ${program.description}`,
  );
  const image = program.banner || DEFAULT_OG_IMAGE;
  return {
    title,
    description,
    alternates: { canonical: path },
    // El openGraph de una página reemplaza el del layout: se repite todo.
    openGraph: {
      type: "website",
      title: `${program.title} | ${SITE_NAME}`,
      description,
      url: path,
      siteName: SITE_NAME,
      locale: SITE_LOCALE,
      images: [{ url: image, alt: program.title }],
    },
    twitter: {
      card: "summary_large_image",
      title: `${program.title} | ${SITE_NAME}`,
      description,
      images: [image],
    },
  };
}

export default async function ProgramaPage({ params }: Props) {
  const { id } = await params;
  const { program, all } = await findProgram(id);
  if (!program) notFound();

  const path = programPath(program.id);
  const banner = program.banner || "/logos-bonchona/92.png";
  const others = all.filter((p) => p.id !== program.id);

  return (
    <div className="flex flex-col items-center w-full bg-bonchona-navy text-white overflow-x-hidden">
      <div className="fixed inset-0 bg-mesh-brand pointer-events-none opacity-40 z-0"></div>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: jsonLdScript([
            programJsonLd(program, path),
            breadcrumbJsonLd([
              { name: "Inicio", path: "/" },
              { name: "Programación", path: "/programas" },
              { name: program.title, path },
            ]),
          ]),
        }}
      />

      <section className="relative w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-12 py-10 sm:py-16 z-10">
        <nav aria-label="Ruta" className="mb-8 text-[10px] font-black uppercase tracking-[0.3em] text-zinc-500">
          <Link href="/" className="hover:text-white transition-colors">Inicio</Link>
          <span className="mx-3 text-zinc-700">/</span>
          <Link href="/programas" className="hover:text-white transition-colors">Programación</Link>
          <span className="mx-3 text-zinc-700">/</span>
          <span className="text-bonchona-red">{program.title}</span>
        </nav>

        <article className="glass rounded-[2.5rem] sm:rounded-[3rem] overflow-hidden border-white/10 flex flex-col lg:flex-row">
          <div className="w-full lg:w-1/2 relative aspect-video lg:aspect-auto lg:min-h-[600px]">
            {/* <picture> y no next/image: las imágenes van sin optimizar
                (images.unoptimized), así que no hay srcset automático y el
                celular bajaba el banner de 1600 px (LCP de 2,6 s). */}
            <picture>
              <source media="(min-width: 1024px)" srcSet={banner} />
              <img
                src={bannerThumb(banner)}
                alt={`${program.title}, con ${program.locutor}`}
                fetchPriority="high"
                className="absolute inset-0 w-full h-full object-cover"
              />
            </picture>
          </div>

          <div className="w-full lg:w-1/2 p-8 sm:p-10 lg:p-16 flex flex-col justify-center">
            <span className="text-bonchona-red text-[10px] sm:text-xs font-black uppercase tracking-[0.4em] mb-4 sm:mb-6 block">
              Bonchona 107.1 FM · Valencia
            </span>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black mb-8 italic uppercase tracking-tighter leading-none">
              {program.title}
            </h1>

            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-8">
              <div>
                <dt className="text-[9px] sm:text-[10px] font-black text-bonchona-purple-medium uppercase tracking-[0.3em] mb-2">Horario</dt>
                <dd className="text-white font-bold text-lg sm:text-xl">{program.time}</dd>
              </div>
              <div>
                <dt className="text-[9px] sm:text-[10px] font-black text-bonchona-purple-medium uppercase tracking-[0.3em] mb-2">Conducción</dt>
                <dd className="text-white font-black text-lg sm:text-xl uppercase italic tracking-tight leading-tight">{program.locutor}</dd>
              </div>
            </dl>

            {program.richText && (
              <p className="text-zinc-300 text-lg sm:text-xl leading-relaxed font-medium italic border-l-4 border-bonchona-red pl-6 mb-8">
                {program.richText}
              </p>
            )}

            <p className="text-zinc-400 text-sm sm:text-base leading-relaxed mb-10">{program.description}</p>

            <div className="flex flex-col sm:flex-row gap-4">
              <ListenLiveButton />
              <Link
                href="/famoso"
                className="px-8 py-4 sm:py-5 glass hover:bg-white/10 text-white font-bold rounded-full transition-all flex items-center justify-center text-sm"
              >
                PATROCINA ESTE PROGRAMA
              </Link>
            </div>
          </div>
        </article>
      </section>

      {others.length > 0 && (
        <section className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-12 pb-20 sm:pb-28 z-10">
          <h2 className="text-2xl sm:text-4xl font-black italic uppercase tracking-tighter mb-8">
            Más de la <span className="text-gradient">programación</span>
          </h2>
          <ProgramGrid programs={others} />
        </section>
      )}
    </div>
  );
}
