import { NextResponse } from "next/server";
import { cookies } from "next/headers";
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
  signChatPass,
  verifyChatPass,
  CHAT_PASS_COOKIE,
  CHAT_PASS_TTL_MS,
  TURNSTILE_ACTION,
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

function turnstileSecret(): string | undefined {
  const env = getCloudflareEnv();
  return env?.TURNSTILE_SECRET || process.env.TURNSTILE_SECRET;
}

/**
 * Hostnames desde los que aceptamos un desafío resuelto.
 *
 * Turnstile devuelve el dominio donde se resolvió el widget. Sin comprobarlo,
 * alguien podría montar el mismo widget en otra web, recoger los tokens de sus
 * visitantes y gastarlos aquí. En producción esta lista NO debe incluir
 * localhost.
 */
function expectedHostnames(): Set<string> {
  const env = getCloudflareEnv();
  const raw = env?.TURNSTILE_HOSTNAMES || process.env.TURNSTILE_HOSTNAMES || "";
  return new Set(
    raw
      .split(",")
      .map((h) => h.trim())
      .filter(Boolean)
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

type TurnstileResult = "ok" | "unconfigured" | "rejected";

/**
 * Verificación de Turnstile contra siteverify.
 *
 * No basta con `success`: se comprueba también que la acción sea la del chat y
 * que el dominio esté en la lista. Sin esas dos, un token obtenido en otra web
 * —o para otro formulario de este sitio— serviría para entrar aquí.
 *
 * Falla cerrado ante cualquier error de red o respuesta rara: un chat anónimo
 * sin barrera anti-bot es una invitación al spam.
 */
async function verifyTurnstile(token: string, ip: string): Promise<TurnstileResult> {
  const secret = turnstileSecret();
  if (!secret) return "unconfigured";

  const hostnames = expectedHostnames();
  if (!token || token.length > 2048 || hostnames.size === 0) return "rejected";

  try {
    const res = await fetch(TURNSTILE_VERIFY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      signal: AbortSignal.timeout(10_000),
      body: new URLSearchParams({
        secret,
        response: token,
        ...(ip && ip !== "unknown" ? { remoteip: ip } : {}),
      }),
    });
    if (!res.ok) throw new Error(`siteverify ${res.status}`);

    const result = (await res.json()) as {
      success?: boolean;
      action?: string;
      hostname?: string;
    };

    if (!result.success) return "rejected";
    if (result.action !== TURNSTILE_ACTION) return "rejected";
    if (!result.hostname || !hostnames.has(result.hostname)) return "rejected";
    return "ok";
  } catch (e) {
    console.error("Turnstile siteverify falló:", e);
    return "rejected";
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
  let grantPass = false;

  if (canModerateChat(session)) {
    role = "mod";
    kind = session.user.role === "moderator" ? "mod" : "admin";
  } else {
    const cookieStore = await cookies();

    // Un token de Turnstile se canjea una sola vez, así que las reconexiones se
    // apoyan en el pase que dejó la primera verificación.
    const yaVerificado = await verifyChatPass(cookieStore.get(CHAT_PASS_COOKIE)?.value);

    if (config.requireTurnstile && !yaVerificado) {
      const turnstile = await verifyTurnstile(token, clientIp(request));

      if (turnstile === "unconfigured") {
        // Se mira NODE_ENV y no la presencia del entorno de Cloudflare: desde
        // que next.config.ts llama a initOpenNextCloudflareForDev, `next dev`
        // también tiene bindings, así que su presencia ya no distingue
        // producción.
        if (process.env.NODE_ENV === "production") {
          console.error("TURNSTILE_SECRET no configurado: se rechaza el acceso al chat.");
          return bad("El chat todavía no está configurado. Inténtalo más tarde.", 503);
        }
        console.warn("Turnstile sin configurar: se omite la verificación (solo en desarrollo).");
      } else if (turnstile === "rejected") {
        return bad("No pudimos verificar que eres una persona. Recarga e inténtalo de nuevo.", 401);
      } else {
        grantPass = true;
      }
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

  const response = NextResponse.json(
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

  if (grantPass) {
    const expiresAt = Date.now() + CHAT_PASS_TTL_MS;
    response.cookies.set(CHAT_PASS_COOKIE, await signChatPass(expiresAt), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      // Acotada a las rutas del chat: no viaja con cada visita al sitio.
      path: "/api/chat",
      maxAge: Math.floor(CHAT_PASS_TTL_MS / 1000),
    });
  }

  return response;
}
