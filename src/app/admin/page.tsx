import { getPrograms, getRotativeRates, getSiteSettings } from "@/lib/db";
import { getAnalytics } from "@/lib/analytics";
import { listDemos } from "@/lib/demos";
import { getChatConfig, getChatPin, listChatAudit } from "@/lib/chat";
import { getSession } from "@/lib/auth";
import { listUsersAction } from "@/app/admin/actions";
import AdminClient from "@/components/AdminClient";
import AdminLogin from "@/components/AdminLogin";
import ModeratorHome from "@/components/ModeratorHome";

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

  // Un moderador de chat no tiene nada que hacer en el panel: su cuenta solo
  // sirve para que el chat lo reconozca. Se corta aquí, antes de leer nada, y
  // así ni siquiera se consultan los datos que no le corresponden.
  if (session.user.role === "moderator") {
    return <ModeratorHome name={session.user.name ?? session.user.email} />;
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

  const usersData = session.user.role === "owner" ? await listUsersAction() : null;

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
      initialChatAudit={chatAudit}
    />
  );
}
