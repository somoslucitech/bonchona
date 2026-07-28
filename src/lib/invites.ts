import { getCloudflareEnv } from "./cf-env";
import type { UserRole } from "./users";

const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export interface Invite {
  id: string; // the invite token itself
  email: string;
  role: UserRole;
  createdBy: string;
  createdAt: number;
  expiresAt: number;
  usedAt: number | null;
  revokedAt: number | null;
}

interface InviteRow {
  id: string;
  email: string;
  role: UserRole;
  created_by: string;
  created_at: number;
  expires_at: number;
  used_at: number | null;
  revoked_at: number | null;
}

function mapInvite(row: InviteRow): Invite {
  return {
    id: row.id,
    email: row.email,
    role: row.role,
    createdBy: row.created_by,
    createdAt: row.created_at,
    expiresAt: row.expires_at,
    usedAt: row.used_at,
    revokedAt: row.revoked_at,
  };
}

export async function createInvite(params: {
  email: string;
  role: UserRole;
  createdBy: string;
}): Promise<Invite> {
  const env = getCloudflareEnv();
  if (!env?.DB) throw new Error("D1 no disponible.");
  const id = crypto.randomUUID();
  const now = Date.now();
  const expiresAt = now + INVITE_TTL_MS;
  const email = params.email.toLowerCase();
  await env.DB.prepare(
    "INSERT INTO invites (id, email, role, created_by, created_at, expires_at) VALUES (?, ?, ?, ?, ?, ?)"
  )
    .bind(id, email, params.role, params.createdBy, now, expiresAt)
    .run();
  return { id, email, role: params.role, createdBy: params.createdBy, createdAt: now, expiresAt, usedAt: null, revokedAt: null };
}

export async function getInvite(token: string): Promise<Invite | null> {
  const env = getCloudflareEnv();
  if (!env?.DB) return null;
  const row = await env.DB.prepare("SELECT * FROM invites WHERE id = ?").bind(token).first<InviteRow>();
  return row ? mapInvite(row) : null;
}

// Used at OAuth-callback time: the invite must match the signed-in email,
// still be unused, unrevoked, and unexpired.
export async function getValidInvite(token: string, email: string): Promise<Invite | null> {
  const invite = await getInvite(token);
  if (!invite) return null;
  if (invite.email !== email.toLowerCase()) return null;
  if (invite.usedAt || invite.revokedAt) return null;
  if (invite.expiresAt < Date.now()) return null;
  return invite;
}

export async function markInviteUsed(token: string): Promise<void> {
  const env = getCloudflareEnv();
  if (!env?.DB) return;
  await env.DB.prepare("UPDATE invites SET used_at = ? WHERE id = ?").bind(Date.now(), token).run();
}

export async function revokeInvite(token: string): Promise<void> {
  const env = getCloudflareEnv();
  if (!env?.DB) return;
  await env.DB.prepare("UPDATE invites SET revoked_at = ? WHERE id = ?").bind(Date.now(), token).run();
}

export async function listPendingInvites(): Promise<Invite[]> {
  const env = getCloudflareEnv();
  if (!env?.DB) return [];
  const { results } = await env.DB.prepare(
    "SELECT * FROM invites WHERE used_at IS NULL AND revoked_at IS NULL AND expires_at > ? ORDER BY created_at DESC"
  )
    .bind(Date.now())
    .all<InviteRow>();
  return (results ?? []).map(mapInvite);
}
