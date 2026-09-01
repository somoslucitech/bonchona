import { getCloudflareEnv } from "./cf-env";
import {
  CHAT_LIMITS,
  DEFAULT_CHAT_CONFIG,
  type ChatConfig,
  type ChatSlot,
  type ChatAuditEntry,
} from "./chat-client";
import { getSetting, setSetting } from "./settings";
import { getHmacKey, base64UrlEncode } from "./auth";
import { vetMinutesOfDay } from "./analytics";

// Se reexportan para que el código de servidor siga importando todo de aquí.
export { CHAT_LIMITS, DEFAULT_CHAT_CONFIG };
export type { ChatConfig, ChatSlot, ChatAuditEntry };

// ============================================================
// Configuración del chat
//
// Vive en la tabla `settings` (clave `chat_config`) para poder cambiarla
// desde el admin sin deploy. Como D1 devuelve JSON sin tipar, TODO lo que se
// lee pasa por normalizeConfig(): un valor corrupto degrada al defecto en vez
// de romper el chat en producción.
// ============================================================

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
 * Dígitos y símbolos que imitan letras. Sin doblarlos, "Bonch0na" o "M0d" se
 * cuelan como nicks distintos de los reservados, que es exactamente la técnica
 * que se usa para suplantar a la emisora.
 *
 * El precio es que la clave es más lossy: "Luis1" y "Luisi" colisionan. Como
 * esta clave solo se usa para comparar (nicks reservados, baneos y lista negra)
 * y nunca para mostrar, ese falso positivo compensa: la misma pérdida es la que
 * impide esquivar un baneo cambiando una letra por un número.
 */
const CONFUSABLES: Record<string, string> = {
  "0": "o", "1": "i", "!": "i", "|": "i", "3": "e", "4": "a",
  "@": "a", "5": "s", "$": "s", "7": "t", "8": "b", "9": "g",
};

/**
 * Clave de comparación: sin acentos, en minúsculas, con los dígitos que imitan
 * letras doblados y sin nada que no sea alfanumérico. Así "Bonchóna",
 * "Bonch0na" y "bonchona" caen todas en la misma clave.
 */
export function nickKey(nick: string): string {
  return nick
    .normalize("NFD")
    .replace(/[\u0300-\u036F]/g, "")
    .toLowerCase()
    .replace(/[0-9!|@$]/g, (c) => CONFUSABLES[c] ?? c)
    .replace(/[^a-z0-9]/g, "");
}

export type NickError = "length" | "invisible" | "reserved" | "empty" | "needsLetters";

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

  // Un nick de solo emojis o solo signos no deja clave de comparación, así que
  // no se podría distinguir de otro igual ni sancionar: se pide algo legible.
  const key = nickKey(nick);
  if (!key) return { error: "needsLetters" };
  if (config.reservedNicks.some((r) => nickKey(r) === key)) return { error: "reserved" };

  return { nick };
}

export const NICK_ERROR_MESSAGES: Record<NickError, string> = {
  empty: "Escribe un nombre para entrar al chat.",
  length: `El nombre debe tener entre ${NICK_MIN} y ${NICK_MAX} caracteres.`,
  invisible: "Ese nombre tiene caracteres no permitidos.",
  reserved: "Ese nombre está reservado. Elige otro.",
  needsLetters: "El nombre necesita al menos una letra o un número, no solo emojis.",
};

// ============================================================
// Nombres del equipo
//
// Antes esto era una tabla de moderadores con un codigo compartido. Se elimino
// entera (migracion 0008): un codigo que viaja por WhatsApp, no caduca y no se
// rota es un secreto portador, y sustituirlo por un rol dentro del login que ya
// existia no anade ninguna via de autenticacion nueva que auditar.
// ============================================================

/**
 * Nombres que no puede usar un visitante porque pertenecen al equipo.
 *
 * Un moderador se distingue por su insignia, no por su nombre, asi que esto no
 * es lo que impide suplantarlo. Es lo que evita la confusion de tener dos
 * "DJ Andre" hablando a la vez en mitad de una transmision.
 *
 * El mensaje de error es el mismo que el de un nombre reservado cualquiera, a
 * proposito: decir "ese nombre es de un moderador" convertiria el formulario en
 * un buscador de quien es del equipo.
 */
export async function listStaffNickKeys(): Promise<Set<string>> {
  const env = getCloudflareEnv();
  if (!env?.DB) return new Set();
  try {
    const { results } = await env.DB.prepare(
      "SELECT name, email FROM users WHERE status = 'active'"
    ).all<{ name: string | null; email: string }>();

    const keys = new Set<string>();
    for (const row of results ?? []) {
      const nombre = row.name?.trim();
      if (nombre) keys.add(nickKey(nombre));
      // Tambien la parte local del correo: si alguien se llama "andre" en
      // Google, "andre" no deberia poder usarlo un visitante cualquiera.
      const local = row.email.split("@")[0];
      if (local) keys.add(nickKey(local));
    }
    keys.delete("");
    return keys;
  } catch (e) {
    console.error("Error leyendo los nombres del equipo:", e);
    return new Set();
  }
}

// ============================================================
// Auditoría (la escribe el Durable Object; aquí solo se lee)
// ============================================================


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
  // Ojo con el orden: en `next dev` los bindings de wrangler ya están activos
  // (ver initOpenNextCloudflareForDev en next.config.ts), así que
  // getCloudflareEnv() devuelve la URL de PRODUCCIÓN escrita en wrangler.json.
  // Por eso .env.local tiene que poder ganarle, y no al revés: si no, el sitio
  // en desarrollo hablaría con el worker de producción.
  const env = getCloudflareEnv();
  const raw = process.env.CHAT_WORKER_URL || env?.CHAT_WORKER_URL || "http://127.0.0.1:8788";
  return raw.replace(/\/+$/, "");
}

export function chatSocketUrl(): string {
  return `${chatWorkerBase().replace(/^http/, "ws")}/ws`;
}
