import { getCloudflareEnv } from "./cf-env";

const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

export interface SessionRow {
  id: string;
  userId: string;
  createdAt: number;
  expiresAt: number;
  lastSeenAt: number;
  userAgent: string | null;
}

interface SessionDbRow {
  id: string;
  user_id: string;
  created_at: number;
  expires_at: number;
  last_seen_at: number;
  user_agent: string | null;
}

function mapSession(row: SessionDbRow): SessionRow {
  return {
    id: row.id,
    userId: row.user_id,
    createdAt: row.created_at,
    expiresAt: row.expires_at,
    lastSeenAt: row.last_seen_at,
    userAgent: row.user_agent,
  };
}

export async function createSession(userId: string, userAgent?: string | null): Promise<SessionRow> {
  const env = getCloudflareEnv();
  if (!env?.DB) throw new Error("D1 no disponible.");
  const id = crypto.randomUUID();
  const now = Date.now();
  const expiresAt = now + SESSION_TTL_MS;
  await env.DB.prepare(
    "INSERT INTO sessions (id, user_id, created_at, expires_at, last_seen_at, user_agent) VALUES (?, ?, ?, ?, ?, ?)"
  )
    .bind(id, userId, now, expiresAt, now, userAgent ?? null)
    .run();
  return { id, userId, createdAt: now, expiresAt, lastSeenAt: now, userAgent: userAgent ?? null };
}

export async function getSessionRow(id: string): Promise<SessionRow | null> {
  const env = getCloudflareEnv();
  if (!env?.DB) return null;
  const row = await env.DB.prepare("SELECT * FROM sessions WHERE id = ?").bind(id).first<SessionDbRow>();
  return row ? mapSession(row) : null;
}

export async function deleteSession(id: string): Promise<void> {
  const env = getCloudflareEnv();
  if (!env?.DB) return;
  await env.DB.prepare("DELETE FROM sessions WHERE id = ?").bind(id).run();
}

export async function listSessionsForUser(userId: string): Promise<SessionRow[]> {
  const env = getCloudflareEnv();
  if (!env?.DB) return [];
  const { results } = await env.DB.prepare(
    "SELECT * FROM sessions WHERE user_id = ? ORDER BY last_seen_at DESC"
  )
    .bind(userId)
    .all<SessionDbRow>();
  return (results ?? []).map(mapSession);
}

export async function deleteAllSessionsForUser(userId: string): Promise<void> {
  const env = getCloudflareEnv();
  if (!env?.DB) return;
  await env.DB.prepare("DELETE FROM sessions WHERE user_id = ?").bind(userId).run();
}
