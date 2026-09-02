/**
 * Piezas del chat que se ejecutan en el navegador.
 *
 * Vive separado de src/lib/chat.ts a propósito: ese módulo importa
 * `next/headers` y habla con D1, así que no puede entrar en un bundle de
 * cliente. Aquí solo hay tipos, constantes y utilidades puras.
 *
 * El esquema de configuración también vive aquí, y no en chat.ts, porque la
 * pestaña de admin es un componente de cliente y necesita los topes para
 * validar los campos: importarlos del módulo de servidor arrastraba
 * `next/headers` al navegador y rompía el build.
 */

export interface ChatMessage {
  /** id corto, el que usa el moderador para borrar */
  i: string;
  /** nick */
  n: string;
  /** texto */
  t: string;
  /** epoch ms */
  ts: number;
  /** presente solo si lo escribió un moderador */
  r?: "mod";
}

/** Motivos por los que el chat puede rechazar o cortar la conexión. */
export type ChatErrorCode =
  | "closed"
  | "banned"
  | "full"
  | "slow"
  | "frozen"
  | "invalid"
  | "repeat"
  | "forbidden";

export type ChatStatus =
  | "idle"
  | "connecting"
  | "open"
  | "queued"
  | "closed"
  | "banned"
  | "error";

/** Códigos de cierre propios del worker (ver workers/chat/index.js). */
export const CHAT_CLOSE = {
  BAD_TICKET: 4001,
  EXPIRED: 4002,
  BANNED: 4003,
  CHAT_CLOSED: 4004,
  FULL: 4005,
  KICKED: 4009,
} as const;

export const NICK_STORAGE_KEY = "bonchona:chat:nick";

/**
 * Color del nick, derivado del propio nombre.
 *
 * Sin fotos de perfil, el color es lo único que ayuda a seguir a una persona a
 * lo largo de la conversación. Se calcula, no se guarda: el mismo nombre da
 * siempre el mismo color en todos los navegadores, sin coordinar nada.
 *
 * La paleta está elegida a mano para que todos los tonos tengan contraste
 * suficiente sobre el navy del sitio; generar el color con un hue libre daba
 * azules ilegibles sobre el fondo.
 */
const NICK_COLORS = [
  "#FF8A5B", // naranja cálido
  "#FFD166", // ámbar
  "#8FE388", // verde
  "#5BC0EB", // celeste
  "#B79CED", // lavanda
  "#F76C9C", // rosa
  "#4ECDC4", // turquesa
  "#F5A3C7", // rosa pálido
  "#9BE7FF", // azul hielo
  "#FFC49B", // melocotón
];

export function nickColor(nick: string): string {
  let hash = 0;
  for (let i = 0; i < nick.length; i++) {
    hash = (hash * 31 + nick.charCodeAt(i)) | 0;
  }
  return NICK_COLORS[Math.abs(hash) % NICK_COLORS.length];
}

/** Hora corta en el formato que se usa en el resto del sitio. */
export function chatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString("es-VE", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

/**
 * Emojis del selector. Es una lista fija y corta a propósito: una librería de
 * emojis pesa cientos de kilobytes y aquí solo hacen falta los que de verdad se
 * usan en una radio.
 */
export const CHAT_EMOJIS = [
  "😀", "😂", "🥹", "😍", "🤩", "😎", "🤔", "😴",
  "😭", "😱", "🥳", "🤯", "😇", "🙃", "😤", "🫶",
  "❤️", "🔥", "✨", "⭐", "💯", "👏", "🙌", "👍",
  "👎", "🤝", "💃", "🕺", "🎉", "🎊", "🎵", "🎶",
  "🎧", "🎤", "📻", "🥁", "🎸", "🎹", "☀️", "🌙",
  "☕", "🍻", "⚽", "🇻🇪", "😅", "🥰", "🤗", "💪",
];

// ============================================================
// Esquema de configuración (compartido entre servidor y panel)
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
  /**
   * Exigir Turnstile antes del primer mensaje de un visitante.
   *
   * No es redundante con estar alojado en Cloudflare: el borde filtra trafico y
   * bots conocidos, pero no verifica que haya una persona detras de una accion
   * concreta. Y sobre todo, el modo lento es POR NICK: sin nada que haga
   * costoso crear un nick nuevo, un script genera cien y el limite de 30s deja
   * de significar nada. Turnstile es lo que le pone precio a esa identidad.
   *
   * Se deja apagable porque anade un script de terceros y un modo de fallo: si
   * el desafio no carga, nadie entra. Apagarlo es una decision legitima en una
   * comunidad pequena y vigilada, pero conviene volver a encenderlo en cuanto
   * aparezca el primer spam.
   */
  requireTurnstile: boolean;
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
  requireTurnstile: true,
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

export interface ChatAuditEntry {
  id: string;
  ts: number;
  actor: string;
  actorKind: "admin" | "mod";
  action: string;
  target: string | null;
  detail: string | null;
}
