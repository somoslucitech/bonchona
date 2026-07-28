import type { Metadata } from "next";
import { getSiteSettings } from "@/lib/db";
import EstudioClient from "@/components/EstudioClient";

const TITLE = "Estudio de Grabación y Producción de Audio";
const DESCRIPTION =
  "Podcast en 4K, grabación musical, jingles e identidad sonora en Valencia, Carabobo. Producción profesional con el estándar de Bonchona 107.1 FM.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/estudio" },
  openGraph: { type: "website", title: TITLE, description: DESCRIPTION, url: "/estudio" },
};

export default async function EstudioPage() {
  const settings = await getSiteSettings();
  return <EstudioClient whatsappAdvertising={settings.whatsappAdvertising} />;
}
