import { cookies } from "next/headers";
import { getCloudflareEnv } from "./cf-env";
import { getSessionRow, deleteSession as deleteSessionRow } from "./sessions";
import { getUserById, type User } from "./users";

export const SESSION_COOKIE_NAME = "bonchona_session";
export const SESSION_COOKIE_MAX_AGE = 30 * 24 * 60 * 60; // 30 days, in seconds

export function base64UrlEncode(bytes: ArrayBuffer): string {
  const bin = String.fromCharCode(...new Uint8Array(bytes));
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64UrlDecode(str: string): Uint8Array {
  const padded = str.replace(/-/g, "+").replace(/_/g, "/").padEnd(str.length + ((4 - (str.length % 4)) % 4), "=");
  const bin = atob(padded);
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
}

export async function getHmacKey(): Promise<CryptoKey> {
  const env = getCloudflareEnv();
  const secret = env?.AUTH_SECRET || process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET no configurado.");
  const keyData = new TextEncoder().encode(secret);
  return crypto.subtle.importKey("raw", keyData, { name: "HMAC", hash: "SHA-256" }, false, ["sign", "verify"]);
}

// Cookie value shape: "<sessionId>.<base64url HMAC-SHA256 signature>".
// The signature only proves the cookie wasn't tampered with — actual
// validity/revocation is decided by whether the D1 `sessions` row still
// exists (see getSession below), so deleting that row logs the user out
// immediately even though the signature still verifies.
export async function signSessionId(sessionId: string): Promise<string> {
  const key = await getHmacKey();
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(sessionId));
  return `${sessionId}.${base64UrlEncode(signature)}`;
}

async function verifySessionCookie(cookieValue: string): Promise<string | null> {
  const parts = cookieValue.split(".");
  if (parts.length !== 2) return null;
  const [sessionId, sig] = parts;
  try {
    const key = await getHmacKey();
    const valid = await crypto.subtle.verify(
      "HMAC",
      key,
      base64UrlDecode(sig) as BufferSource,
      new TextEncoder().encode(sessionId)
    );
    return valid ? sessionId : null;
  } catch {
    return null;
  }
}

export interface AuthSession {
  sessionId: string;
  user: User;
}

export async function getSession(): Promise<AuthSession | null> {
  const cookieStore = await cookies();
  const raw = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!raw) return null;

  const sessionId = await verifySessionCookie(raw);
  if (!sessionId) return null;

  const row = await getSessionRow(sessionId);
  if (!row) return null;
  if (row.expiresAt < Date.now()) {
    await deleteSessionRow(sessionId);
    return null;
  }

  const user = await getUserById(row.userId);
  if (!user || user.status !== "active") return null;

  return { sessionId, user };
}

// ============================================================
// Autorizacion
//
// Existen porque al anadir el rol `moderator` toda comprobacion del estilo
// `if (!session)` paso a ser un agujero: un moderador del chat tendria acceso
// a programas, tarifas, ajustes y a los demos con datos personales de artistas.
// La pregunta correcta nunca es "hay sesion", sino "que puede hacer esta".
// ============================================================

/** Gestion de usuarios e invitaciones. */
export function isOwner(session: AuthSession | null): session is AuthSession {
  return !!session && session.user.role === "owner";
}

/** Operar el panel: contenido, tarifas, ajustes, demos. NO los moderadores. */
export function isStaff(session: AuthSession | null): session is AuthSession {
  return !!session && (session.user.role === "owner" || session.user.role === "editor");
}

/** Moderar el chat en vivo. Todo el equipo puede, moderadores incluidos. */
export function canModerateChat(session: AuthSession | null): session is AuthSession {
  if (!session) return false;
  const role = session.user.role;
  return role === "owner" || role === "editor" || role === "moderator";
}
