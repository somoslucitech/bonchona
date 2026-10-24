import type { Metadata } from "next";
import { getPrograms, getRotativeRates, getSiteSettings } from "@/lib/db";
import FamosoClient from "@/components/FamosoClient";
import { headers } from "next/headers";
import { SITE_NAME, SITE_LOCALE, DEFAULT_OG_IMAGE } from "@/lib/seo";

const TITLE = "Publicidad en Radio en Valencia — Anúnciate";
// La plantilla "%s | marca" del layout solo se aplica al <title>; Open Graph
// y Twitter la ignoran, así que el título para compartir lleva la marca aquí.
const SHARE_TITLE = `${TITLE} | ${SITE_NAME}`;
const DESCRIPTION =
  "Tarifas de publicidad rotativa y patrocinio de programas en vivo en la emisora líder del centro de Venezuela. Llega a toda Valencia y Carabobo.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/famoso" },
  // El openGraph de una página REEMPLAZA por completo el del layout raíz (Next
  // no lo fusiona), así que hay que repetir aquí imagen/siteName/locale o la
  // vista previa al compartir queda sin foto.
  openGraph: {
    type: "website",
    title: SHARE_TITLE,
    description: DESCRIPTION,
    url: "/famoso",
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

// Force Next.js to render this route dynamically so it always pulls fresh data
export const dynamic = "force-dynamic";

export default async function FamosoPage() {
  await headers(); // Force dynamic execution on every request
  const [rotativeRates, programs, settings] = await Promise.all([
    getRotativeRates(),
    getPrograms(),
    getSiteSettings(),
  ]);

  return (
    <FamosoClient
      initialRotativeRates={rotativeRates}
      initialPrograms={programs}
      whatsappAdvertising={settings.whatsappAdvertising}
    />
  );
}
