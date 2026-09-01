import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getCloudflareEnv } from "@/lib/cf-env";
import {
  getChatConfig,
  getChatOpenState,
  validateNick,
  isModeratorNick,
  verifyModeratorCode,
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

/**
 * Verificación de Turnstile.
 *
 * Devuelve "unconfigured" cuando no hay clave secreta. Eso solo se tolera en
 * `next dev` (donde no hay runtime de Workers): en producción se rechaza la
 * petición, porque un chat anónimo sin ninguna barrera anti-bot es una
 * invitación al spam y fallar hacia el lado abierto sería el error caro.
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
  let payload: { nick?: unknown; turnstileToken?: unknown; modCode?: unknown };
  try {
    payload = (await request.json()) as typeof payload;
  } catch {
    return bad("Petición inválida.");
  }

  const rawNick = typeof payload.nick === "string" ? payload.nick : "";
  const token = typeof payload.turnstileToken === "string" ? payload.turnstileToken : "";
  const modCode = typeof payload.modCode === "string" ? payload.modCode.trim() : "";

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

  // Un owner/editor del panel es moderador sin tener que escribir ningún
  // código: ya demostró quién es con la cookie de sesión.
  const session = await getSession();
  const isAdmin = !!session && (session.user.role === "owner" || session.user.role === "editor");

  let role: ChatRole = "user";
  let kind: "admin" | "mod" | undefined;

  if (isAdmin) {
    role = "mod";
    kind = "admin";
  } else {
    const ip =
      request.headers.get("cf-connecting-ip") ??
      request.headers.get("x-forwarded-for") ??
      "unknown";

    const turnstile = await verifyTurnstile(token, ip);
    if (turnstile === "unconfigured") {
      if (getCloudflareEnv()) {
        console.error("TURNSTILE_SECRET_KEY no configurado: se rechaza el acceso al chat.");
        return bad("El chat todavía no está configurado. Inténtalo más tarde.", 503);
      }
      console.warn("Turnstile sin configurar: se omite la verificación (solo en desarrollo).");
    } else if (!turnstile) {
      return bad("No pudimos verificar que eres una persona. Recarga e inténtalo de nuevo.", 401);
    }

    if (modCode) {
      if (!(await verifyModeratorCode(nick, modCode))) {
        return bad("Ese código de moderador no es válido para ese nombre.", 401);
      }
      role = "mod";
      kind = "mod";
    } else if (await isModeratorNick(nick)) {
      // El nick pertenece a un locutor: sin su código no se puede usar, o
      // cualquiera podría presentarse como el equipo de la emisora.
      return bad("Ese nombre pertenece a un moderador. Usa tu código o elige otro.", 403);
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
