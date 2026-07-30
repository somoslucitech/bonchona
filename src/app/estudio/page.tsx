import type { Metadata } from "next";
import { getSiteSettings } from "@/lib/db";
import EstudioClient from "@/components/EstudioClient";
import { SITE_NAME, SITE_LOCALE, DEFAULT_OG_IMAGE } from "@/lib/seo";

const TITLE = "Estudio de Grabación y Producción de Audio";
const DESCRIPTION =
  "Podcast en 4K, grabación musical, jingles e identidad sonora en Valencia, Carabobo. Producción profesional con el estándar de Bonchona 107.1 FM.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/estudio" },
  // El openGraph de una página REEMPLAZA por completo el del layout raíz (Next
  // no lo fusiona), así que hay que repetir aquí imagen/siteName/locale o la
  // vista previa al compartir queda sin foto.
  openGraph: {
    type: "website",
    title: TITLE,
    description: DESCRIPTION,
    url: "/estudio",
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

export default async function EstudioPage() {
  const settings = await getSiteSettings();
  return <EstudioClient whatsappAdvertising={settings.whatsappAdvertising} />;
}
