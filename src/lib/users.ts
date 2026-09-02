import { getCloudflareEnv } from "./cf-env";

/**
 * - owner: control total, incluida la gestion de usuarios.
 * - editor: contenido del sitio (programas, tarifas, ajustes, demos).
 * - moderator: SOLO modera el chat en vivo. No toca nada del panel.
 */
export type UserRole = "owner" | "editor" | "moderator";
export type UserStatus = "active" | "revoked";

export interface User {
  id: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
  role: UserRole;
  status: UserStatus;
  invitedBy: string | null;
  createdAt: number;
  lastLoginAt: number | null;
}

interface UserRow {
  id: string;
  email: string;
  name: string | null;
  avatar_url: string | null;
  role: UserRole;
  status: UserStatus;
  invited_by: string | null;
  created_at: number;
  last_login_at: number | null;
}

function mapUser(row: UserRow): User {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    avatarUrl: row.avatar_url,
    role: row.role,
    status: row.status,
    invitedBy: row.invited_by,
    createdAt: row.created_at,
    lastLoginAt: row.last_login_at,
  };
}

export async function getUserByEmail(email: string): Promise<User | null> {
  const env = getCloudflareEnv();
  if (!env?.DB) return null;
  const row = await env.DB.prepare("SELECT * FROM users WHERE email = ?")
    .bind(email.toLowerCase())
    .first<UserRow>();
  return row ? mapUser(row) : null;
}

export async function getUserById(id: string): Promise<User | null> {
  const env = getCloudflareEnv();
  if (!env?.DB) return null;
  const row = await env.DB.prepare("SELECT * FROM users WHERE id = ?").bind(id).first<UserRow>();
  return row ? mapUser(row) : null;
}

export async function createUser(params: {
  email: string;
  name?: string | null;
  avatarUrl?: string | null;
  role: UserRole;
  invitedBy?: string | null;
}): Promise<User> {
  const env = getCloudflareEnv();
  if (!env?.DB) throw new Error("D1 no disponible.");
  const id = crypto.randomUUID();
  const now = Date.now();
  const email = params.email.toLowerCase();
  await env.DB.prepare(
    "INSERT INTO users (id, email, name, avatar_url, role, status, invited_by, created_at) VALUES (?, ?, ?, ?, ?, 'active', ?, ?)"
  )
    .bind(id, email, params.name ?? null, params.avatarUrl ?? null, params.role, params.invitedBy ?? null, now)
    .run();
  return {
    id,
    email,
    name: params.name ?? null,
    avatarUrl: params.avatarUrl ?? null,
    role: params.role,
    status: "active",
    invitedBy: params.invitedBy ?? null,
    createdAt: now,
    lastLoginAt: null,
  };
}

export async function listUsers(): Promise<User[]> {
  const env = getCloudflareEnv();
  if (!env?.DB) return [];
  const { results } = await env.DB.prepare("SELECT * FROM users ORDER BY created_at ASC").all<UserRow>();
  return (results ?? []).map(mapUser);
}

export async function setUserStatus(id: string, status: UserStatus): Promise<void> {
  const env = getCloudflareEnv();
  if (!env?.DB) return;
  await env.DB.prepare("UPDATE users SET status = ? WHERE id = ?").bind(status, id).run();
}

export async function touchLastLogin(id: string): Promise<void> {
  const env = getCloudflareEnv();
  if (!env?.DB) return;
  await env.DB.prepare("UPDATE users SET last_login_at = ? WHERE id = ?").bind(Date.now(), id).run();
}

export async function countActiveOwners(): Promise<number> {
  const env = getCloudflareEnv();
  if (!env?.DB) return 0;
  const row = await env.DB.prepare(
    "SELECT COUNT(*) as c FROM users WHERE role = 'owner' AND status = 'active'"
  ).first<{ c: number }>();
  return row?.c ?? 0;
}
