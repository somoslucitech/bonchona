'use server';

import { revalidatePath } from "next/cache";
import { cookies, headers } from "next/headers";
import {
  savePrograms,
  saveRotativeRates,
  saveWhatsappNumbers,
  saveStreamConfig,
  type Program,
  type RotativeRate,
} from "@/lib/db";
import { getCloudflareEnv } from "@/lib/cf-env";
import { getSession, SESSION_COOKIE_NAME, type AuthSession } from "@/lib/auth";
import { deleteSession, listSessionsForUser, deleteAllSessionsForUser } from "@/lib/sessions";
import { listUsers, setUserStatus, countActiveOwners, getUserById, type UserRole } from "@/lib/users";
import { createInvite, listPendingInvites, revokeInvite, getInvite } from "@/lib/invites";
import { sendInviteEmail } from "@/lib/email";

function isOwnerSession(session: AuthSession | null): session is AuthSession {
  return !!session && session.user.role === "owner";
}

async function inviteUrlFor(token: string): Promise<string> {
  const hdrs = await headers();
  const host = hdrs.get("host") ?? "";
  const proto = hdrs.get("x-forwarded-proto") || "https";
  return `${proto}://${host}/api/auth/google?invite=${token}`;
}

// --- Session / logout ---

export async function logoutAdminAction() {
  const session = await getSession();
  if (session) {
    await deleteSession(session.sessionId);
  }
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, "", { path: "/", maxAge: 0 });
  return { success: true };
}

export async function checkAdminSessionAction() {
  const session = await getSession();
  return !!session;
}

// --- Content management (any active user: owner or editor) ---

export async function saveProgramsAction(programs: Program[]) {
  const session = await getSession();
  if (!session) {
    console.warn("Block unauthorized saveProgramsAction call");
    return false;
  }

  const ok = await savePrograms(programs);
  if (ok) {
    revalidatePath("/");
    revalidatePath("/famoso");
  }
  return ok;
}

export async function saveRatesAction(rates: RotativeRate[]) {
  const session = await getSession();
  if (!session) {
    console.warn("Block unauthorized saveRatesAction call");
    return false;
  }

  const ok = await saveRotativeRates(rates);
  if (ok) {
    revalidatePath("/famoso");
  }
  return ok;
}

export async function saveSettingsAction(settings: {
  whatsappSongRequest: string;
  whatsappAdvertising: string;
  streamUrl: string;
  metadataUrl: string;
}) {
  const session = await getSession();
  if (!session) {
    console.warn("Block unauthorized saveSettingsAction call");
    return false;
  }

  const [whatsappOk, streamOk] = await Promise.all([
    saveWhatsappNumbers({ songRequest: settings.whatsappSongRequest, advertising: settings.whatsappAdvertising }),
    saveStreamConfig({ streamUrl: settings.streamUrl, metadataUrl: settings.metadataUrl }),
  ]);

  const ok = whatsappOk && streamOk;
  if (ok) {
    revalidatePath("/", "layout");
  }
  return ok;
}

export async function uploadPrerollAction(formData: FormData) {
  const session = await getSession();
  if (!session) {
    console.warn("Block unauthorized uploadPrerollAction call");
    return { success: false, error: "Acceso no autorizado." };
  }

  try {
    const file = formData.get("preroll") as File;
    if (!file || file.size === 0) return { success: false, error: "No se seleccionó ningún archivo." };

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Save to Cloudflare R2 in production
    const env = getCloudflareEnv();
    if (env?.PREROLL_BUCKET) {
      await env.PREROLL_BUCKET.put("preroll.mp3", buffer, {
        httpMetadata: { contentType: "audio/mpeg" }
      });
      return { success: true };
    }

    // Save to local file in local development (Node runtime)
    if (typeof window === 'undefined') {
      try {
        const fs = await import('fs');
        const path = await import('path');
        const localPath = path.join(process.cwd(), 'public', 'local-preroll.mp3');
        fs.writeFileSync(localPath, buffer);
        console.log("Saved local preroll fallback to:", localPath);
        return { success: true, localDev: true };
      } catch (e) {
        console.error("Local file save error:", e);
      }
    }

    return { success: true, warning: "Guardado en modo simulación (R2 no disponible)" };
  } catch (e: unknown) {
    console.error("Upload error:", e);
    const errorMsg = e instanceof Error ? e.message : "Error al subir el archivo.";
    return { success: false, error: errorMsg };
  }
}

export async function uploadProgramImageAction(formData: FormData) {
  const session = await getSession();
  if (!session) {
    console.warn("Block unauthorized uploadProgramImageAction call");
    return { success: false, error: "Acceso no autorizado." };
  }

  try {
    const file = formData.get("image") as File;
    if (!file || file.size === 0) return { success: false, error: "No se seleccionó ningún archivo." };

    // Sanitize filename to avoid weird character issues in key name
    const sanitizedName = file.name
      .toLowerCase()
      .replace(/[^a-z0-9_.-]+/g, "-") // Keep letters, numbers, underscore, dot, hyphen
      .replace(/(^-|-$)+/g, ""); // Remove trailing hyphens

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Save to Cloudflare R2 in production
    const env = getCloudflareEnv();
    if (env?.IMAGES_BUCKET) {
      await env.IMAGES_BUCKET.put(sanitizedName, buffer, {
        httpMetadata: { contentType: file.type || "image/png" }
      });
      return { success: true, url: `/api/images/${sanitizedName}` };
    }

    // Save to local file in local development (Node runtime)
    if (typeof window === 'undefined') {
      try {
        const fs = await import('fs');
        const path = await import('path');
        const localDir = path.join(process.cwd(), 'public', 'programas');

        // Ensure directory exists
        if (!fs.existsSync(localDir)) {
          fs.mkdirSync(localDir, { recursive: true });
        }

        const localPath = path.join(localDir, sanitizedName);
        fs.writeFileSync(localPath, buffer);
        console.log("Saved local program image fallback to:", localPath);
        return { success: true, url: `/programas/${sanitizedName}`, localDev: true };
      } catch (e) {
        console.error("Local image file save error:", e);
      }
    }

    return { success: true, url: `/logos-bonchona/92.png`, warning: "Guardado en modo simulación (R2 no disponible)" };
  } catch (e: unknown) {
    console.error("Image upload error:", e);
    const errorMsg = e instanceof Error ? e.message : "Error al subir la imagen.";
    return { success: false, error: errorMsg };
  }
}

// --- User management (owner-only) ---

export async function listUsersAction() {
  const session = await getSession();
  if (!isOwnerSession(session)) {
    return { success: false as const, error: "Acceso restringido a administradores.", users: [], invites: [] };
  }

  const [users, invites] = await Promise.all([listUsers(), listPendingInvites()]);
  const usersWithSessions = await Promise.all(
    users.map(async (u) => ({ ...u, sessions: await listSessionsForUser(u.id) }))
  );
  return { success: true as const, users: usersWithSessions, invites, currentUserId: session.user.id };
}

export async function createInviteAction(email: string, role: UserRole) {
  const session = await getSession();
  if (!isOwnerSession(session)) return { success: false, error: "Acceso restringido a administradores." };
  if (!email || !email.includes("@")) return { success: false, error: "Correo inválido." };

  const invite = await createInvite({ email: email.trim(), role, createdBy: session.user.id });
  const inviteUrl = await inviteUrlFor(invite.id);

  const emailResult = await sendInviteEmail(invite.email, inviteUrl, role);
  if (!emailResult.ok) {
    return { success: false, error: emailResult.error || "No se pudo enviar el correo de invitación." };
  }
  return { success: true };
}

export async function resendInviteAction(token: string) {
  const session = await getSession();
  if (!isOwnerSession(session)) return { success: false, error: "Acceso restringido a administradores." };

  const invite = await getInvite(token);
  if (!invite || invite.usedAt || invite.revokedAt) return { success: false, error: "Invitación no válida." };

  const inviteUrl = await inviteUrlFor(invite.id);
  const emailResult = await sendInviteEmail(invite.email, inviteUrl, invite.role);
  return emailResult.ok ? { success: true } : { success: false, error: emailResult.error };
}

export async function revokeInviteAction(token: string) {
  const session = await getSession();
  if (!isOwnerSession(session)) return false;
  await revokeInvite(token);
  return true;
}

export async function revokeUserAction(userId: string) {
  const session = await getSession();
  if (!isOwnerSession(session)) return { success: false, error: "Acceso restringido a administradores." };
  if (session.user.id === userId) return { success: false, error: "No puedes revocar tu propia cuenta." };

  const target = await getUserById(userId);
  if (target?.role === "owner") {
    const activeOwners = await countActiveOwners();
    if (activeOwners <= 1) return { success: false, error: "Debe quedar al menos un administrador activo." };
  }

  await setUserStatus(userId, "revoked");
  await deleteAllSessionsForUser(userId);
  return { success: true };
}

export async function revokeSessionAction(sessionId: string) {
  const session = await getSession();
  if (!isOwnerSession(session)) return false;
  await deleteSession(sessionId);
  return true;
}
