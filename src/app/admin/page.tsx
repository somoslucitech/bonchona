import { getPrograms, getRotativeRates, getSiteSettings } from "@/lib/db";
import { getAnalytics } from "@/lib/analytics";
import { listDemos } from "@/lib/demos";
import { getChatConfig, getChatPin, listModerators, listChatAudit } from "@/lib/chat";
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

  const [programs, rotativeRates, settings, analytics, demos, chatConfig, chatPin, chatAudit] =
    await Promise.all([
      getPrograms(),
      getRotativeRates(),
      getSiteSettings(),
      getAnalytics(30),
      listDemos({ page: 1 }),
      getChatConfig(),
      getChatPin(),
      listChatAudit(80),
    ]);

  const isOwner = session.user.role === "owner";
  const usersData = isOwner ? await listUsersAction() : null;
  // La lista de moderadores solo la ve el owner, igual que la de usuarios.
  const chatModerators = isOwner ? await listModerators() : [];

  return (
    <AdminClient
      initialPrograms={programs}
      initialRotativeRates={rotativeRates}
      initialSettings={settings}
      role={session.user.role}
      email={session.user.email}
      initialUsersData={usersData}
      initialAnalytics={analytics}
      initialDemos={demos}
      initialChatConfig={chatConfig}
      initialChatPin={chatPin}
      initialChatModerators={chatModerators}
      initialChatAudit={chatAudit}
    />
  );
}
