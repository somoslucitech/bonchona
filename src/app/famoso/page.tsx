import { getPrograms, getRotativeRates, getSiteSettings } from "@/lib/db";
import FamosoClient from "@/components/FamosoClient";
import { headers } from "next/headers";

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
