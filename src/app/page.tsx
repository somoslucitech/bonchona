import { getPrograms } from "@/lib/db";
import HomeClient from "@/components/HomeClient";
import { headers } from "next/headers";

// Force Next.js to render this route dynamically so it always pulls fresh data from KV
export const dynamic = "force-dynamic";

export default async function Home() {
  await headers(); // Force dynamic execution on every request
  const programs = await getPrograms();

  return <HomeClient initialPrograms={programs} />;
}
