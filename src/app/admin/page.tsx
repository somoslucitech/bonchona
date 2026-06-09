import { cookies } from "next/headers";
import { getPrograms, getRotativeRates } from "@/lib/db";
import AdminClient from "@/components/AdminClient";
import AdminLogin from "@/components/AdminLogin";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const cookieStore = await cookies();
  const isAuthenticated = cookieStore.get("admin_session")?.value === "authenticated";

  if (!isAuthenticated) {
    return <AdminLogin />;
  }

  const programs = await getPrograms();
  const rotativeRates = await getRotativeRates();

  return (
    <AdminClient 
      initialPrograms={programs} 
      initialRotativeRates={rotativeRates} 
    />
  );
}
