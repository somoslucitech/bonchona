import type { Metadata } from "next";
import NosotrosClient from "@/components/NosotrosClient";
import { SITE_NAME, SITE_LOCALE, DEFAULT_OG_IMAGE } from "@/lib/seo";

const TITLE = "Nuestra Historia";
const DESCRIPTION =
  "Desde 1997 en el 107.1 del dial. La historia de Radio Bonchona, el legado de Carlos Briceño y la segunda generación de la Sintonía Total en Valencia, Carabobo.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/nosotros" },
  // El openGraph de una página REEMPLAZA por completo el del layout raíz (Next
  // no lo fusiona), así que hay que repetir aquí imagen/siteName/locale o la
  // vista previa al compartir queda sin foto.
  openGraph: {
    type: "website",
    title: TITLE,
    description: DESCRIPTION,
    url: "/nosotros",
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

export default function NosotrosPage() {
  return <NosotrosClient />;
}
