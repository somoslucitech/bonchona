'use server';

import { getSession } from "@/lib/auth";
import { getCloudflareEnv } from "@/lib/cf-env";
import {
  getChatConfig,
  saveChatConfig,
  saveChatPin,
  createModerator,
  revokeModerator,
  listModerators,
  chatWorkerBase,
  type ChatConfig,
  type ChatModerator,
} from "@/lib/chat";

/**
 * Cualquier miembro activo del panel puede operar el chat del día a día
 * (encenderlo, ajustar el modo lento, fijar un mensaje). Dar de alta o revocar
 * moderadores queda reservado al owner, igual que la gestión de usuarios.
 */
async function requireStaff() {
  const session = await getSession();
  if (!session) {
    console.warn("Blocked unauthorized chat admin call");
    return null;
  }
  return session;
}

async function requireOwner() {
  const session = await getSession();
  if (session?.user.role !== "owner") {
    console.warn("Blocked non-owner chat moderator call");
    return null;
  }
  return session;
}

/**
 * Avisa al worker del chat de que la configuración cambió.
 *
 * Sin esto, apagar el chat no expulsaría a quien ya está dentro hasta que el
 * Durable Object volviera a leer la configuración por su cuenta (30s) o hasta
 * que alguien intentara escribir. No es crítico: si falla, el worker se pone al
 * día solo, así que el error se registra y no se propaga.
 */
async function notifyChatWorker(): Promise<void> {
  try {
    await fetch(`${chatWorkerBase()}/reload`, {
      method: "POST",
      signal: AbortSignal.timeout(3000),
    });
  } catch (e) {
    console.warn("No se pudo avisar al worker del chat:", e);
  }
}

export async function saveChatConfigAction(
  config: Partial<ChatConfig>
): Promise<{ success: boolean; config?: ChatConfig; error?: string }> {
  if (!(await requireStaff())) return { success: false, error: "No autorizado." };

  try {
    // saveChatConfig normaliza y acota todo lo que llega del cliente, así que
    // un payload manipulado no puede dejar valores imposibles en la base.
    const saved = await saveChatConfig(config);
    await notifyChatWorker();
    return { success: true, config: saved };
  } catch (e) {
    console.error("Error guardando la configuración del chat:", e);
    return { success: false, error: "No se pudo guardar." };
  }
}

export async function saveChatPinAction(
  text: string
): Promise<{ success: boolean; error?: string }> {
  if (!(await requireStaff())) return { success: false, error: "No autorizado." };

  try {
    const ok = await saveChatPin(typeof text === "string" ? text : "");
    if (!ok) return { success: false, error: "No se pudo guardar el mensaje fijado." };
    await notifyChatWorker();
    return { success: true };
  } catch (e) {
    console.error("Error guardando el mensaje fijado:", e);
    return { success: false, error: "No se pudo guardar." };
  }
}

export async function listChatModeratorsAction(): Promise<ChatModerator[]> {
  if (!(await requireOwner())) return [];
  return listModerators();
}

/**
 * Da de alta un moderador y devuelve su código EN CLARO una única vez.
 *
 * El código no se puede recuperar después: solo se guarda su hash. Si el
 * locutor lo pierde, se le genera otro.
 */
export async function createChatModeratorAction(
  nick: string
): Promise<{ success: boolean; code?: string; moderators?: ChatModerator[]; error?: string }> {
  const session = await requireOwner();
  if (!session) return { success: false, error: "Solo el owner puede añadir moderadores." };

  const result = await createModerator(typeof nick === "string" ? nick : "", session.user.id);
  if ("error" in result) return { success: false, error: result.error };

  return { success: true, code: result.code, moderators: await listModerators() };
}

export async function revokeChatModeratorAction(
  nickLower: string
): Promise<{ success: boolean; moderators?: ChatModerator[]; error?: string }> {
  if (!(await requireOwner())) {
    return { success: false, error: "Solo el owner puede revocar moderadores." };
  }
  if (typeof nickLower !== "string" || !nickLower.trim()) {
    return { success: false, error: "Moderador no válido." };
  }

  const ok = await revokeModerator(nickLower);
  if (!ok) return { success: false, error: "No se pudo revocar." };

  return { success: true, moderators: await listModerators() };
}

/** Estado del chat para el panel: si está en marcha y cuánta gente hay. */
export async function getChatLiveStateAction(): Promise<{
  count: number | null;
  reachable: boolean;
}> {
  if (!(await requireStaff())) return { count: null, reachable: false };

  const config = await getChatConfig();
  if (!config.enabled) return { count: 0, reachable: true };

  try {
    const res = await fetch(`${chatWorkerBase()}/count`, { signal: AbortSignal.timeout(3000) });
    if (!res.ok) return { count: null, reachable: false };
    const data = (await res.json()) as { count?: unknown };
    return { count: typeof data.count === "number" ? data.count : null, reachable: true };
  } catch {
    return { count: null, reachable: false };
  }
}

/** Aviso de configuración incompleta, para enseñarlo en el panel. */
export async function getChatHealthAction(): Promise<{ turnstile: boolean; secret: boolean }> {
  if (!(await requireStaff())) return { turnstile: false, secret: false };
  const env = getCloudflareEnv();
  return {
    turnstile: !!(env?.TURNSTILE_SECRET_KEY || process.env.TURNSTILE_SECRET_KEY),
    secret: !!(env?.AUTH_SECRET || process.env.AUTH_SECRET),
  };
}
