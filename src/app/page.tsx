import type { Metadata } from "next";
import { getPrograms } from "@/lib/db";
import HomeClient from "@/components/HomeClient";
import { headers } from "next/headers";
import { SITE_NAME, SITE_LOCALE, DEFAULT_OG_IMAGE } from "@/lib/seo";

// Force Next.js to render this route dynamically so it always pulls fresh data
export const dynamic = "force-dynamic";

const TITLE = "Bonchona 107.1 FM — Sintonía Total | Radio en vivo desde Valencia";
const DESCRIPTION =
  "Escucha en vivo Bonchona 107.1 FM desde Valencia, Carabobo. La mejor música y entretenimiento donde la sintonía es total.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/" },
  // El openGraph de una página REEMPLAZA por completo el del layout raíz (Next
  // no lo fusiona), así que hay que repetir aquí imagen/siteName/locale o la
  // vista previa al compartir queda sin foto.
  openGraph: {
    type: "website",
    title: TITLE,
    description: DESCRIPTION,
    url: "/",
    siteName: SITE_NAME,
    locale: SITE_LOCALE,
    images: [{ url: DEFAULT_OG_IMAGE, width: 1200, height: 630, alt: SITE_NAME }],
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
    images: [DEFAULT_OG_IMAGE],
  },
};

export default async function Home() {
  await headers(); // Force dynamic execution on every request
  const programs = await getPrograms();

  return <HomeClient initialPrograms={programs} />;
}
