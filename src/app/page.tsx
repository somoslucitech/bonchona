import type { Metadata } from "next";
import { getPrograms } from "@/lib/db";
import { getHomepageNews } from "@/lib/news";
import HomeClient from "@/components/HomeClient";
import { headers } from "next/headers";

// Force Next.js to render this route dynamically so it always pulls fresh data
export const dynamic = "force-dynamic";

const TITLE = "Bonchona 107.1 FM — Sintonía Total | Radio en vivo desde Valencia";
const DESCRIPTION =
  "Escucha en vivo Bonchona 107.1 FM desde Valencia, Carabobo. La mejor música, noticias musicales y entretenimiento donde la sintonía es total.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/" },
  openGraph: { type: "website", title: TITLE, description: DESCRIPTION, url: "/" },
};

export default async function Home() {
  await headers(); // Force dynamic execution on every request

  // La destacada manda: queda de principal en el bloque editorial y el resto
  // se rellena con lo más reciente.
  const [programs, news] = await Promise.all([getPrograms(), getHomepageNews(3)]);

  return <HomeClient initialPrograms={programs} featuredNews={news} />;
}
