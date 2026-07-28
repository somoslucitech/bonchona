import { getSiteSettings } from "@/lib/db";
import EstudioClient from "@/components/EstudioClient";

export default async function EstudioPage() {
  const settings = await getSiteSettings();
  return <EstudioClient whatsappAdvertising={settings.whatsappAdvertising} />;
}
