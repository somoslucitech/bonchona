import type { Metadata } from "next";
import { getPrograms } from "@/lib/db";
import ProgramGrid from "@/components/ProgramGrid";
import ListenLiveButton from "@/components/ListenLiveButton";
import { SITE_NAME, SITE_LOCALE, DEFAULT_OG_IMAGE, breadcrumbJsonLd, jsonLdScript } from "@/lib/seo";

// Igual que cada programa: la parrilla sale de D1 y la edita el admin.
export const dynamic = "force-dynamic";

const TITLE = "Programación de Radio en Valencia";
// La plantilla "%s | marca" del layout solo se aplica al <title>.
const SHARE_TITLE = `${TITLE} | ${SITE_NAME}`;
const DESCRIPTION =
  "Horarios, locutores y programas en vivo de Bonchona 107.1 FM, la radio de Valencia, Carabobo. Magazine, concursos, deportes y la mejor música de lunes a viernes.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/programas" },
  openGraph: {
    type: "website",
    title: SHARE_TITLE,
    description: DESCRIPTION,
    url: "/programas",
    siteName: SITE_NAME,
    locale: SITE_LOCALE,
    images: [{ url: DEFAULT_OG_IMAGE, width: 1200, height: 630, alt: SITE_NAME }],
  },
  twitter: {
    card: "summary_large_image",
    title: SHARE_TITLE,
    description: DESCRIPTION,
    images: [DEFAULT_OG_IMAGE],
  },
};

export default async function ProgramasPage() {
  const programs = await getPrograms();

  return (
    <div className="flex flex-col items-center w-full bg-bonchona-navy text-white overflow-x-hidden">
      <div className="fixed inset-0 bg-mesh-brand pointer-events-none opacity-40 z-0"></div>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: jsonLdScript(
            breadcrumbJsonLd([
              { name: "Inicio", path: "/" },
              { name: "Programación", path: "/programas" },
            ]),
          ),
        }}
      />

      <section className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-12 py-16 sm:py-24 z-10">
        <span className="text-bonchona-purple-medium font-black tracking-[0.3em] sm:tracking-[0.4em] text-[10px] sm:text-xs uppercase mb-4 sm:mb-6 block">
          Nuestra parrilla
        </span>
        <h1 className="text-5xl sm:text-7xl md:text-8xl font-black mb-6 sm:mb-8 italic uppercase tracking-tighter leading-[0.85]">
          <span className="sr-only">Programación de Bonchona 107.1 FM: </span>
          PROGRAMACIÓN <br /> <span className="text-gradient">MASTER.</span>
        </h1>
        <p className="text-zinc-400 max-w-2xl text-base sm:text-lg leading-relaxed mb-10">
          Los programas que mueven a Valencia y al centro de Venezuela, en vivo por el 107.1 FM y por streaming.
          Elige uno para ver su horario, quién lo conduce y de qué trata.
        </p>
        <div className="mb-14 sm:mb-20">
          <ListenLiveButton />
        </div>

        <ProgramGrid programs={programs} eager />
      </section>
    </div>
  );
}
