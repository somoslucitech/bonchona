import { getCloudflareEnv } from "./cf-env";

export type DemoStatus = "nuevo" | "escuchado" | "aprobado" | "descartado";

export const DEMO_STATUSES: { value: DemoStatus; label: string }[] = [
  { value: "nuevo", label: "Nuevo" },
  { value: "escuchado", label: "Escuchado" },
  { value: "aprobado", label: "Aprobado" },
  { value: "descartado", label: "Descartado" },
];

/** Géneros sugeridos. El formulario permite escribir otro. */
export const DEMO_GENRES = [
  "Urbano / Reggaetón", "Salsa", "Merengue", "Pop", "Rock", "Trap",
  "Electrónica", "Balada", "Vallenato", "Gaita", "Jazz", "Hip Hop", "Otro",
];

export const MAX_DEMO_BYTES = 15 * 1024 * 1024; // 15 MB
export const ALLOWED_AUDIO_TYPES = ["audio/mpeg", "audio/mp3"];

/** Máximo de envíos por IP en 24 h, para que el formulario no sea un buzón de spam. */
export const MAX_SUBMISSIONS_PER_DAY = 5;

export interface Demo {
  id: string;
  createdAt: number;
  firstName: string;
  lastName: string;
  artistName: string;
  email: string;
  whatsapp: string | null;
  trackTitle: string;
  genre: string | null;
  city: string | null;
  instagram: string | null;
  spotify: string | null;
  message: string | null;
  fileKey: string;
  fileName: string;
  fileSize: number;
  rightsConfirmed: boolean;
  status: DemoStatus;
  notes: string | null;
}

interface DemoRow {
  id: string; created_at: number; first_name: string; last_name: string;
  artist_name: string; email: string; whatsapp: string | null;
  track_title: string; genre: string | null; city: string | null;
  instagram: string | null; spotify: string | null; message: string | null;
  file_key: string; file_name: string; file_size: number;
  rights_confirmed: number; status: string; notes: string | null;
}

function mapDemo(r: DemoRow): Demo {
  return {
    id: r.id,
    createdAt: r.created_at,
    firstName: r.first_name,
    lastName: r.last_name,
    artistName: r.artist_name,
    email: r.email,
    whatsapp: r.whatsapp,
    trackTitle: r.track_title,
    genre: r.genre,
    city: r.city,
    instagram: r.instagram,
    spotify: r.spotify,
    message: r.message,
    fileKey: r.file_key,
    fileName: r.file_name,
    fileSize: r.file_size,
    rightsConfirmed: r.rights_confirmed === 1,
    status: r.status as DemoStatus,
    notes: r.notes,
  };
}

export interface DemoPage {
  items: Demo[];
  total: number;
  page: number;
  totalPages: number;
  counts: Record<DemoStatus, number>;
}

export async function listDemos(
  filters: { status?: DemoStatus | "all"; page?: number; pageSize?: number } = {}
): Promise<DemoPage> {
  const env = getCloudflareEnv();
  const page = Math.max(1, filters.page ?? 1);
  const pageSize = filters.pageSize ?? 20;
  const empty: DemoPage = {
    items: [], total: 0, page, totalPages: 0,
    counts: { nuevo: 0, escuchado: 0, aprobado: 0, descartado: 0 },
  };
  if (!env?.DB) return empty;

  const where = filters.status && filters.status !== "all" ? "WHERE status = ?" : "";
  const binds = filters.status && filters.status !== "all" ? [filters.status] : [];

  try {
    const [countRow, rows, counts] = await Promise.all([
      env.DB.prepare(`SELECT COUNT(*) AS c FROM demos ${where}`).bind(...binds).first<{ c: number }>(),
      env.DB.prepare(
        `SELECT * FROM demos ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`
      ).bind(...binds, pageSize, (page - 1) * pageSize).all<DemoRow>(),
      env.DB.prepare(
        `SELECT status, COUNT(*) AS c FROM demos GROUP BY status`
      ).all<{ status: string; c: number }>(),
    ]);

    const countMap: Record<DemoStatus, number> = { nuevo: 0, escuchado: 0, aprobado: 0, descartado: 0 };
    for (const r of counts.results ?? []) {
      if (r.status in countMap) countMap[r.status as DemoStatus] = r.c;
    }

    const total = countRow?.c ?? 0;
    return {
      items: (rows.results ?? []).map(mapDemo),
      total,
      page,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
      counts: countMap,
    };
  } catch (e) {
    console.error("listDemos error:", e);
    return empty;
  }
}

export async function getDemo(id: string): Promise<Demo | null> {
  const env = getCloudflareEnv();
  if (!env?.DB) return null;
  try {
    const row = await env.DB.prepare("SELECT * FROM demos WHERE id = ?").bind(id).first<DemoRow>();
    return row ? mapDemo(row) : null;
  } catch (e) {
    console.error("getDemo error:", e);
    return null;
  }
}

/** Cuántos envíos hizo esta IP en las últimas 24 h. */
export async function countRecentByIp(ipHash: string): Promise<number> {
  const env = getCloudflareEnv();
  if (!env?.DB) return 0;
  const since = Date.now() - 24 * 60 * 60 * 1000;
  const row = await env.DB.prepare(
    "SELECT COUNT(*) AS c FROM demos WHERE ip_hash = ? AND created_at >= ?"
  ).bind(ipHash, since).first<{ c: number }>();
  return row?.c ?? 0;
}

export interface CreateDemoInput {
  firstName: string;
  lastName: string;
  artistName: string;
  email: string;
  whatsapp?: string;
  trackTitle: string;
  genre?: string;
  city?: string;
  instagram?: string;
  spotify?: string;
  message?: string;
  fileKey: string;
  fileName: string;
  fileSize: number;
  rightsConfirmed: boolean;
  ipHash: string;
}

export async function createDemo(input: CreateDemoInput): Promise<string> {
  const env = getCloudflareEnv();
  if (!env?.DB) throw new Error("D1 no disponible.");

  const id = crypto.randomUUID();
  await env.DB.prepare(
    `INSERT INTO demos (
      id, created_at, first_name, last_name, artist_name, email, whatsapp,
      track_title, genre, city, instagram, spotify, message,
      file_key, file_name, file_size, rights_confirmed, status, ip_hash
    ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?, 'nuevo', ?)`
  ).bind(
    id, Date.now(), input.firstName, input.lastName, input.artistName,
    input.email, input.whatsapp ?? null, input.trackTitle, input.genre ?? null,
    input.city ?? null, input.instagram ?? null, input.spotify ?? null,
    input.message ?? null, input.fileKey, input.fileName, input.fileSize,
    input.rightsConfirmed ? 1 : 0, input.ipHash
  ).run();

  return id;
}

export async function updateDemoStatus(id: string, status: DemoStatus, notes?: string): Promise<boolean> {
  const env = getCloudflareEnv();
  if (!env?.DB) return false;
  try {
    await env.DB.prepare(
      "UPDATE demos SET status = ?, notes = COALESCE(?, notes) WHERE id = ?"
    ).bind(status, notes ?? null, id).run();
    return true;
  } catch (e) {
    console.error("updateDemoStatus error:", e);
    return false;
  }
}

/** Borra el registro y su archivo de R2, para no dejar huérfanos. */
export async function deleteDemo(id: string): Promise<boolean> {
  const env = getCloudflareEnv();
  if (!env?.DB) return false;
  try {
    const row = await env.DB.prepare("SELECT file_key FROM demos WHERE id = ?")
      .bind(id).first<{ file_key: string }>();
    await env.DB.prepare("DELETE FROM demos WHERE id = ?").bind(id).run();
    if (row?.file_key && env.DEMOS_BUCKET) {
      await env.DEMOS_BUCKET.delete(row.file_key).catch(() => {});
    }
    return true;
  } catch (e) {
    console.error("deleteDemo error:", e);
    return false;
  }
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
