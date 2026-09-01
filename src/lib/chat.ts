import { getCloudflareEnv } from "./cf-env";
import { getSetting, setSetting } from "./settings";
import { getHmacKey, base64UrlEncode } from "./auth";
import { vetMinutesOfDay } from "./analytics";

// ============================================================
// Configuración del chat
//
// Vive en la tabla `settings` (clave `chat_config`) para poder cambiarla
// desde el admin sin deploy. Como D1 devuelve JSON sin tipar, TODO lo que se
// lee pasa por normalizeConfig(): un valor corrupto degrada al defecto en vez
// de romper el chat en producción.
// ============================================================

/** Franja horaria de apertura automática, en minutos desde medianoche (hora Venezuela). */
export interface ChatSlot {
  startMin: number;
  endMin: number;
}

export interface ChatConfig {
  /** Interruptor maestro. Si está en false, el chat está cerrado pase lo que pase. */
  enabled: boolean;
  /** Si está activo, además del interruptor hay que caer dentro de alguna franja. */
  scheduleEnabled: boolean;
  slots: ChatSlot[];
  /** Milisegundos que un oyente debe esperar entre mensajes. */
  slowMs: number;
  /** Sube el modo lento solo cuando el volumen de mensajes se dispara. */
  autoSlow: boolean;
  maxChars: number;
  capacity: number;
  blockLinks: boolean;
  blockedWords: string[];
  reservedNicks: string[];
}

export const DEFAULT_CHAT_CONFIG: ChatConfig = {
  enabled: false,
  scheduleEnabled: false,
  slots: [],
  slowMs: 30_000,
  autoSlow: true,
  maxChars: 200,
  capacity: 1000,
  blockLinks: true,
  blockedWords: [],
  reservedNicks: [
    "admin", "mod", "moderador", "bonchona", "bonchona radio",
    "staff", "sistema", "locutor",
  ],
};

// Topes duros. El admin no puede configurar valores que hagan inviable el
// coste o la moderación, ni aunque edite la fila de D1 a mano.
export const CHAT_LIMITS = {
  slowMs: { min: 1_000, max: 300_000 },
  maxChars: { min: 40, max: 500 },
  capacity: { min: 1, max: 5_000 },
  maxSlots: 8,
  maxBlockedWords: 300,
  maxReservedNicks: 100,
} as const;

function clampInt(value: unknown, min: number, max: number, fallback: number): number {
  const n = typeof value === "number" ? Math.round(value) : Number.NaN;
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

function bool(value: unknown, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback;
}

function stringList(value: unknown, maxItems: number, maxLen: number): string[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  for (const item of value) {
    if (typeof item !== "string") continue;
    const clean = item.trim().slice(0, maxLen).toLowerCase();
    if (clean) seen.add(clean);
    if (seen.size >= maxItems) break;
  }
  return [...seen];
}

function normalizeSlots(value: unknown): ChatSlot[] {
  if (!Array.isArray(value)) return [];
  const slots: ChatSlot[] = [];
  for (const raw of value) {
    if (!raw || typeof raw !== "object") continue;
    const s = raw as Record<string, unknown>;
    const startMin = clampInt(s.startMin, 0, 1439, -1);
    const endMin = clampInt(s.endMin, 0, 1440, -1);
    // Una franja invertida o de longitud cero no significa nada: se descarta en
    // vez de dejar el chat abierto o cerrado para siempre por accidente.
    if (startMin < 0 || endMin < 0 || endMin <= startMin) continue;
    slots.push({ startMin, endMin });
    if (slots.length >= CHAT_LIMITS.maxSlots) break;
  }
  return slots;
}

function normalizeConfig(raw: unknown): ChatConfig {
  const d = DEFAULT_CHAT_CONFIG;
  if (!raw || typeof raw !== "object") return { ...d };
  const c = raw as Record<string, unknown>;

  const reserved = stringList(c.reservedNicks, CHAT_LIMITS.maxReservedNicks, 40);

  return {
    enabled: bool(c.enabled, d.enabled),
    scheduleEnabled: bool(c.scheduleEnabled, d.scheduleEnabled),
    slots: normalizeSlots(c.slots),
    slowMs: clampInt(c.slowMs, CHAT_LIMITS.slowMs.min, CHAT_LIMITS.slowMs.max, d.slowMs),
    autoSlow: bool(c.autoSlow, d.autoSlow),
    maxChars: clampInt(c.maxChars, CHAT_LIMITS.maxChars.min, CHAT_LIMITS.maxChars.max, d.maxChars),
    capacity: clampInt(c.capacity, CHAT_LIMITS.capacity.min, CHAT_LIMITS.capacity.max, d.capacity),
    blockLinks: bool(c.blockLinks, d.blockLinks),
    blockedWords: stringList(c.blockedWords, CHAT_LIMITS.maxBlockedWords, 40),
    // Los nicks reservados por defecto no se pueden perder editando la config:
    // sin ellos cualquiera podría hacerse pasar por la emisora.
    reservedNicks: [...new Set([...d.reservedNicks, ...reserved])],
  };
}

export async function getChatConfig(): Promise<ChatConfig> {
  return normalizeConfig(await getSetting<unknown>("chat_config", DEFAULT_CHAT_CONFIG));
}

export async function saveChatConfig(config: Partial<ChatConfig>): Promise<ChatConfig> {
  const merged = normalizeConfig({ ...(await getChatConfig()), ...config });
  await setSetting("chat_config", merged);
  return merged;
}

/** Mensaje fijado. Cadena vacía = sin pin. */
export async function getChatPin(): Promise<string> {
  const raw = await getSetting<unknown>("chat_pin", "");
  return typeof raw === "string" ? raw.slice(0, 240) : "";
}

export async function saveChatPin(text: string): Promise<boolean> {
  return setSetting("chat_pin", text.trim().slice(0, 240));
}

// ============================================================
// ¿Está abierto el chat ahora mismo?
// ============================================================

export type ChatClosedReason = "disabled" | "schedule";

export interface ChatOpenState {
  open: boolean;
  reason: ChatClosedReason | null;
  /** Minutos hasta la próxima apertura, si se cerró por horario. */
  opensInMin: number | null;
}

export function getChatOpenState(config: ChatConfig, now = Date.now()): ChatOpenState {
  if (!config.enabled) return { open: false, reason: "disabled", opensInMin: null };
  if (!config.scheduleEnabled || config.slots.length === 0) {
    return { open: true, reason: null, opensInMin: null };
  }

  const minute = vetMinutesOfDay(now);
  for (const slot of config.slots) {
    if (minute >= slot.startMin && minute < slot.endMin) {
      return { open: true, reason: null, opensInMin: null };
    }
  }

  // Cerrado: calculamos cuánto falta para la próxima franja, envolviendo al día
  // siguiente si ya pasaron todas las de hoy.
  const waits = config.slots.map((s) =>
    s.startMin > minute ? s.startMin - minute : s.startMin + 1440 - minute
  );
  return { open: false, reason: "schedule", opensInMin: Math.min(...waits) };
}

// ============================================================
// Nicks
// ============================================================

/**
 * Caracteres invisibles o de control bidireccional. Se rechazan de raíz: sirven
 * para falsificar nicks (un "admin" con un carácter de ancho cero en medio se ve
 * idéntico a "admin") y para romper la dirección del texto de toda la lista.
 */
const INVISIBLE_RE = /[\u0000-\u001F\u007F\u00AD\u200B-\u200F\u202A-\u202E\u2060-\u2064\u2066-\u2069\uFEFF]/u;

export const NICK_MIN = 2;
export const NICK_MAX = 20;

/** Colapsa espacios y recorta. No toca mayúsculas ni emojis. */
export function normalizeNick(raw: string): string {
  return raw.replace(/\s+/g, " ").trim();
}

/**
 * Clave de comparación: minúsculas, sin acentos y sin nada que no sea
 * alfanumérico. Así "Bonchóna", "B0nchona" y "bonchona" colisionan con el nick
 * reservado en vez de colarse como variantes.
 */
export function nickKey(nick: string): string {
  return nick
    .normalize("NFD")
    .replace(/[\u0300-\u036F]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

export type NickError = "length" | "invisible" | "reserved" | "empty";

export function validateNick(
  raw: string,
  config: ChatConfig
): { nick: string } | { error: NickError } {
  const nick = normalizeNick(raw);
  if (!nick) return { error: "empty" };
  if (INVISIBLE_RE.test(nick)) return { error: "invisible" };

  // [...nick] cuenta puntos de código, no unidades UTF-16: un emoji cuenta 1.
  const length = [...nick].length;
  if (length < NICK_MIN || length > NICK_MAX) return { error: "length" };

  const key = nickKey(nick);
  if (!key) return { error: "empty" };
  if (config.reservedNicks.some((r) => nickKey(r) === key)) return { error: "reserved" };

  return { nick };
}

export const NICK_ERROR_MESSAGES: Record<NickError, string> = {
  empty: "Escribe un nombre para entrar al chat.",
  length: `El nombre debe tener entre ${NICK_MIN} y ${NICK_MAX} caracteres.`,
  invisible: "Ese nombre tiene caracteres no permitidos.",
  reserved: "Ese nombre está reservado. Elige otro.",
};

// ============================================================
// Moderadores sin cuenta (locutores)
// ============================================================

export interface ChatModerator {
  nick: string;
  nickLower: string;
  createdAt: number;
  createdBy: string | null;
  lastSeenAt: number | null;
  revokedAt: number | null;
}

/** Sin vocales ni caracteres ambiguos (0/O, 1/I/L): estos códigos se dictan por teléfono. */
const CODE_ALPHABET = "23456789BCDFGHJKMNPQRSTVWXYZ";

export function generateModeratorCode(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(8));
  const chars = [...bytes].map((b) => CODE_ALPHABET[b % CODE_ALPHABET.length]);
  return `${chars.slice(0, 4).join("")}-${chars.slice(4).join("")}`;
}

function authSecret(): string {
  const env = getCloudflareEnv();
  return env?.AUTH_SECRET || process.env.AUTH_SECRET || "";
}

/**
 * Hash del código con el mismo enfoque que `hashIp` en /api/demos: SHA-256 con
 * AUTH_SECRET como sal. El código en claro solo existe una vez, cuando el owner
 * lo genera; después ni nosotros podemos recuperarlo.
 */
export async function hashModeratorCode(nickLower: string, code: string): Promise<string> {
  const material = `chatmod|${nickLower}|${code.trim().toUpperCase()}|${authSecret()}`;
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(material));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** Comparación en tiempo constante, para no filtrar el código por temporización. */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function listModerators(includeRevoked = false): Promise<ChatModerator[]> {
  const env = getCloudflareEnv();
  if (!env?.DB) return [];
  const where = includeRevoked ? "" : "WHERE revoked_at IS NULL ";
  try {
    const { results } = await env.DB.prepare(
      `SELECT nick, nick_lower, created_at, created_by, last_seen_at, revoked_at
       FROM chat_moderators ${where}ORDER BY created_at DESC`
    ).all<{
      nick: string; nick_lower: string; created_at: number;
      created_by: string | null; last_seen_at: number | null; revoked_at: number | null;
    }>();
    return (results ?? []).map((r) => ({
      nick: r.nick,
      nickLower: r.nick_lower,
      createdAt: r.created_at,
      createdBy: r.created_by,
      lastSeenAt: r.last_seen_at,
      revokedAt: r.revoked_at,
    }));
  } catch (e) {
    console.error("Error listando moderadores del chat:", e);
    return [];
  }
}

/** Devuelve el código en claro UNA sola vez; a partir de ahí solo existe el hash. */
export async function createModerator(
  rawNick: string,
  createdBy: string | null
): Promise<{ moderator: ChatModerator; code: string } | { error: string }> {
  const env = getCloudflareEnv();
  if (!env?.DB) return { error: "Base de datos no disponible." };

  const nick = normalizeNick(rawNick);
  const length = [...nick].length;
  if (!nick || length < NICK_MIN || length > NICK_MAX) {
    return { error: NICK_ERROR_MESSAGES.length };
  }
  if (INVISIBLE_RE.test(nick)) return { error: NICK_ERROR_MESSAGES.invisible };

  const nickLower = nick.toLowerCase();
  const code = generateModeratorCode();
  const codeHash = await hashModeratorCode(nickLower, code);
  const now = Date.now();

  try {
    // Reactivar un nick revocado en vez de fallar por clave duplicada: al owner
    // le interesa "volver a dar de alta a este locutor", no un error opaco.
    await env.DB.prepare(
      `INSERT INTO chat_moderators (nick_lower, nick, code_hash, created_at, created_by)
       VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(nick_lower) DO UPDATE SET
         nick = excluded.nick, code_hash = excluded.code_hash,
         created_at = excluded.created_at, created_by = excluded.created_by,
         revoked_at = NULL`
    ).bind(nickLower, nick, codeHash, now, createdBy).run();
  } catch (e) {
    console.error("Error creando moderador del chat:", e);
    return { error: "No se pudo guardar el moderador." };
  }

  return {
    code,
    moderator: { nick, nickLower, createdAt: now, createdBy, lastSeenAt: null, revokedAt: null },
  };
}

export async function revokeModerator(nickLower: string): Promise<boolean> {
  const env = getCloudflareEnv();
  if (!env?.DB) return false;
  try {
    await env.DB.prepare("UPDATE chat_moderators SET revoked_at = ? WHERE nick_lower = ?")
      .bind(Date.now(), nickLower.toLowerCase()).run();
    return true;
  } catch (e) {
    console.error("Error revocando moderador del chat:", e);
    return false;
  }
}

/** ¿Este nick + código corresponde a un moderador activo? */
export async function verifyModeratorCode(nick: string, code: string): Promise<boolean> {
  const env = getCloudflareEnv();
  if (!env?.DB || !code) return false;
  const nickLower = normalizeNick(nick).toLowerCase();
  try {
    const row = await env.DB
      .prepare("SELECT code_hash FROM chat_moderators WHERE nick_lower = ? AND revoked_at IS NULL")
      .bind(nickLower).first<{ code_hash: string }>();
    if (!row) return false;
    const attempt = await hashModeratorCode(nickLower, code);
    if (!timingSafeEqual(attempt, row.code_hash)) return false;
    await env.DB.prepare("UPDATE chat_moderators SET last_seen_at = ? WHERE nick_lower = ?")
      .bind(Date.now(), nickLower).run();
    return true;
  } catch (e) {
    console.error("Error verificando código de moderador:", e);
    return false;
  }
}

/** Un nick registrado como moderador no lo puede usar un visitante cualquiera. */
export async function isModeratorNick(nick: string): Promise<boolean> {
  const env = getCloudflareEnv();
  if (!env?.DB) return false;
  try {
    const row = await env.DB
      .prepare("SELECT 1 AS ok FROM chat_moderators WHERE nick_lower = ? AND revoked_at IS NULL")
      .bind(normalizeNick(nick).toLowerCase()).first<{ ok: number }>();
    return !!row;
  } catch {
    return false;
  }
}

// ============================================================
// Auditoría (la escribe el Durable Object; aquí solo se lee)
// ============================================================

export interface ChatAuditEntry {
  id: string;
  ts: number;
  actor: string;
  actorKind: "admin" | "mod";
  action: string;
  target: string | null;
  detail: string | null;
}

export async function listChatAudit(limit = 100): Promise<ChatAuditEntry[]> {
  const env = getCloudflareEnv();
  if (!env?.DB) return [];
  try {
    const { results } = await env.DB
      .prepare(
        `SELECT id, ts, actor, actor_kind, action, target, detail
         FROM chat_audit ORDER BY ts DESC LIMIT ?`
      )
      .bind(Math.min(500, Math.max(1, limit)))
      .all<{
        id: string; ts: number; actor: string; actor_kind: "admin" | "mod";
        action: string; target: string | null; detail: string | null;
      }>();
    return (results ?? []).map((r) => ({
      id: r.id, ts: r.ts, actor: r.actor, actorKind: r.actor_kind,
      action: r.action, target: r.target, detail: r.detail,
    }));
  } catch (e) {
    console.error("Error leyendo la auditoría del chat:", e);
    return [];
  }
}

// ============================================================
// Tickets de acceso al Durable Object
//
// El worker del chat vive en otro hostname, así que la cookie
// `bonchona_session` (host-only) no llega hasta él. En vez de duplicar la
// sesión, Next firma un ticket de vida muy corta que el cliente presenta al
// abrir el WebSocket. El Durable Object solo verifica una firma: no habla con
// Turnstile, ni con D1, ni con la sesión. Reusa el mismo AUTH_SECRET y el mismo
// formato "cuerpo.firma" que src/lib/auth.ts.
// ============================================================

export type ChatRole = "user" | "mod";

export interface ChatTicketPayload {
  /** nick */
  n: string;
  /** rol */
  r: ChatRole;
  /** expiración, epoch ms */
  x: number;
  /** único: impide que el mismo ticket abra dos conexiones */
  j: string;
  /** de dónde viene el rol de moderador; solo para la auditoría */
  k?: "admin" | "mod";
}

export const TICKET_TTL_MS = 60_000;

export async function signChatTicket(payload: ChatTicketPayload): Promise<string> {
  const json = new TextEncoder().encode(JSON.stringify(payload));
  const body = base64UrlEncode(json.buffer as ArrayBuffer);
  const key = await getHmacKey();
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(body));
  return `${body}.${base64UrlEncode(signature)}`;
}

/**
 * Base del worker de chat. Se configura por variable de entorno para que el
 * cliente no tenga que conocerla de antemano: la URL del socket se le entrega
 * junto con el ticket ya firmado.
 */
export function chatWorkerBase(): string {
  const env = getCloudflareEnv();
  const raw = env?.CHAT_WORKER_URL || process.env.CHAT_WORKER_URL || "http://127.0.0.1:8788";
  return raw.replace(/\/+$/, "");
}

export function chatSocketUrl(): string {
  return `${chatWorkerBase().replace(/^http/, "ws")}/ws`;
}
