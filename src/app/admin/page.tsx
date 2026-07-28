import { getPrograms, getRotativeRates, getSiteSettings } from "@/lib/db";
import { getQueueConfig } from "@/lib/settings";
import { listArticlesForAdmin } from "@/lib/news-admin";
import { getSession } from "@/lib/auth";
import { listUsersAction } from "@/app/admin/actions";
import AdminClient from "@/components/AdminClient";
import AdminLogin from "@/components/AdminLogin";

export const dynamic = "force-dynamic";

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const session = await getSession();

  if (!session) {
    const { error } = await searchParams;
    return <AdminLogin error={error} />;
  }

  const [programs, rotativeRates, settings, newsData, queueConfig] = await Promise.all([
    getPrograms(),
    getRotativeRates(),
    getSiteSettings(),
    listArticlesForAdmin({ page: 1 }),
    getQueueConfig(),
  ]);

  const usersData = session.user.role === "owner" ? await listUsersAction() : null;

  return (
    <AdminClient
      initialPrograms={programs}
      initialRotativeRates={rotativeRates}
      initialSettings={settings}
      role={session.user.role}
      email={session.user.email}
      initialUsersData={usersData}
      initialNewsData={newsData}
      initialQueueConfig={queueConfig}
    />
  );
}
