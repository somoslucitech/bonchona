import type { Metadata } from "next";
import { getPrograms } from "@/lib/db";
import { listFeatured, listLatest } from "@/lib/news";
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

  const [programs, featured] = await Promise.all([getPrograms(), listFeatured(3)]);

  // Si no hay suficientes destacadas, completamos con lo más reciente para que
  // el bloque de la home nunca se vea vacío.
  const news = featured.length >= 3 ? featured : await listLatest(3);

  return <HomeClient initialPrograms={programs} featuredNews={news} />;
}
