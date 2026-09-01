'use server';

import { getSession, isStaff } from "@/lib/auth";
import { getCloudflareEnv } from "@/lib/cf-env";
import { getChatConfig, saveChatConfig, saveChatPin, chatWorkerBase, type ChatConfig } from "@/lib/chat";

/**
 * Configurar el chat es cosa del equipo del panel (owner o editor). Un usuario
 * con rol `moderator` modera la sala en vivo, pero no toca sus ajustes: no
 * puede encenderla, cambiar el aforo ni editar la lista negra.
 */
async function requireStaff() {
  const session = await getSession();
  if (!isStaff(session)) {
    console.warn("Blocked unauthorized chat admin call");
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
    turnstile: !!(env?.TURNSTILE_SECRET || process.env.TURNSTILE_SECRET),
    secret: !!(env?.AUTH_SECRET || process.env.AUTH_SECRET),
  };
}
