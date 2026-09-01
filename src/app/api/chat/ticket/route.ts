import { NextResponse } from "next/server";
import { getSession, canModerateChat } from "@/lib/auth";
import { getCloudflareEnv } from "@/lib/cf-env";
import {
  getChatConfig,
  getChatOpenState,
  validateNick,
  listStaffNickKeys,
  nickKey,
  signChatTicket,
  chatSocketUrl,
  NICK_ERROR_MESSAGES,
  TICKET_TTL_MS,
  type ChatRole,
} from "@/lib/chat";

export const dynamic = "force-dynamic";

const TURNSTILE_VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

function bad(error: string, status = 400) {
  return NextResponse.json({ ok: false, error }, { status });
}

function clientIp(request: Request): string {
  return (
    request.headers.get("cf-connecting-ip") ??
    request.headers.get("x-forwarded-for") ??
    "unknown"
  );
}

/**
 * Freno de abuso por IP.
 *
 * Emitir un ticket cuesta una verificación de Turnstile, una consulta de sesión
 * y varias lecturas de D1. Sin límite, cualquiera puede convertir este endpoint
 * en un amplificador de coste contra la base. Usa el limitador nativo de
 * Workers, que no toca ni D1 ni almacenamiento.
 *
 * Es por centro de datos y best-effort: protege el gasto, no es un control de
 * acceso. Lo que decide quién modera es la cookie de sesión firmada.
 *
 * El límite es holgado a propósito. En Venezuela es normal que decenas de
 * oyentes salgan por la misma IP pública (CGNAT del operador móvil), así que un
 * límite estrecho dejaría fuera a todo un barrio por culpa de una sola persona.
 *
 * Si el binding no existe (entornos donde no está soportado) no se bloquea a
 * nadie: preferimos un chat que funciona sin freno a uno que no abre.
 */
async function withinRateLimit(request: Request): Promise<boolean> {
  const limiter = getCloudflareEnv()?.CHAT_TICKET_LIMITER;
  if (!limiter) return true;
  try {
    const { success } = await limiter.limit({ key: clientIp(request) });
    return success;
  } catch (e) {
    console.warn("El limitador del chat no respondió:", e);
    return true;
  }
}

/**
 * Verificación de Turnstile.
 *
 * Devuelve "unconfigured" cuando no hay clave secreta. Eso solo se tolera en
 * desarrollo: en producción se rechaza la petición, porque un chat anónimo sin
 * ninguna barrera anti-bot es una invitación al spam y fallar hacia el lado
 * abierto sería el error caro.
 */
async function verifyTurnstile(token: string, ip: string): Promise<boolean | "unconfigured"> {
  const env = getCloudflareEnv();
  const secret = env?.TURNSTILE_SECRET_KEY || process.env.TURNSTILE_SECRET_KEY;
  if (!secret) return "unconfigured";
  if (!token) return false;

  try {
    const body = new FormData();
    body.append("secret", secret);
    body.append("response", token);
    if (ip && ip !== "unknown") body.append("remoteip", ip);

    const res = await fetch(TURNSTILE_VERIFY_URL, {
      method: "POST",
      body,
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return false;
    const data = (await res.json()) as { success?: boolean };
    return data.success === true;
  } catch (e) {
    console.error("Turnstile siteverify falló:", e);
    return false;
  }
}

/**
 * Emite el ticket de corta vida con el que el cliente abre el WebSocket contra
 * el worker del chat.
 *
 * Todo el trabajo caro (Turnstile, sesión, D1) se hace aquí una sola vez. El
 * Durable Object solo verifica una firma HMAC, así no gasta ni CPU ni
 * subrequests en cada conexión.
 */
export async function POST(request: Request) {
  let payload: { nick?: unknown; turnstileToken?: unknown };
  try {
    payload = (await request.json()) as typeof payload;
  } catch {
    return bad("Petición inválida.");
  }

  const rawNick = typeof payload.nick === "string" ? payload.nick : "";
  const token = typeof payload.turnstileToken === "string" ? payload.turnstileToken : "";

  if (!(await withinRateLimit(request))) {
    return bad("Demasiados intentos. Espera un momento.", 429);
  }

  const config = await getChatConfig();
  const openState = getChatOpenState(config);
  if (!openState.open) {
    return NextResponse.json(
      {
        ok: false,
        error:
          openState.reason === "schedule"
            ? "El chat está cerrado ahora mismo."
            : "El chat no está disponible.",
        closed: openState,
      },
      { status: 403 }
    );
  }

  const validation = validateNick(rawNick, config);
  if ("error" in validation) return bad(NICK_ERROR_MESSAGES[validation.error]);
  const nick = validation.nick;

  // El rol de moderador sale de la cookie de sesión firmada, la misma del
  // panel. No hay ningún secreto que escribir aquí, ni que se pueda compartir.
  const session = await getSession();

  let role: ChatRole = "user";
  let kind: "admin" | "mod" | undefined;

  if (canModerateChat(session)) {
    role = "mod";
    kind = session.user.role === "moderator" ? "mod" : "admin";
  } else {
    const turnstile = await verifyTurnstile(token, clientIp(request));
    if (turnstile === "unconfigured") {
      // Se mira NODE_ENV y no la presencia del entorno de Cloudflare: desde que
      // next.config.ts llama a initOpenNextCloudflareForDev, `next dev` también
      // tiene bindings, así que su presencia ya no distingue producción.
      if (process.env.NODE_ENV === "production") {
        console.error("TURNSTILE_SECRET_KEY no configurado: se rechaza el acceso al chat.");
        return bad("El chat todavía no está configurado. Inténtalo más tarde.", 503);
      }
      console.warn("Turnstile sin configurar: se omite la verificación (solo en desarrollo).");
    } else if (!turnstile) {
      return bad("No pudimos verificar que eres una persona. Recarga e inténtalo de nuevo.", 401);
    }

    // Mismo mensaje que un nombre reservado cualquiera: uno específico
    // convertiría este formulario en un buscador de quién es del equipo.
    if ((await listStaffNickKeys()).has(nickKey(nick))) {
      return bad(NICK_ERROR_MESSAGES.reserved);
    }
  }

  const ticket = await signChatTicket({
    n: nick,
    r: role,
    x: Date.now() + TICKET_TTL_MS,
    j: crypto.randomUUID(),
    ...(kind ? { k: kind } : {}),
  });

  return NextResponse.json(
    {
      ok: true,
      ticket,
      wsUrl: chatSocketUrl(),
      nick,
      role,
      slowMs: config.slowMs,
      maxChars: config.maxChars,
      expiresAt: Date.now() + TICKET_TTL_MS,
    },
    { headers: { "Cache-Control": "private, no-store" } }
  );
}
