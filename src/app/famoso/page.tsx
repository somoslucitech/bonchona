import { getPrograms, getRotativeRates } from "@/lib/db";
import FamosoClient from "@/components/FamosoClient";
import { headers } from "next/headers";

// Force Next.js to render this route dynamically so it always pulls fresh data from KV
export const dynamic = "force-dynamic";

export default async function FamosoPage() {
  await headers(); // Force dynamic execution on every request
  const rotativeRates = await getRotativeRates();
  const programs = await getPrograms();

  return (
    <FamosoClient 
      initialRotativeRates={rotativeRates} 
      initialPrograms={programs} 
    />
  );
}
