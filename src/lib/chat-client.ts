/**
 * Piezas del chat que se ejecutan en el navegador.
 *
 * Vive separado de src/lib/chat.ts a propósito: ese módulo importa
 * `next/headers` y habla con D1, así que no puede entrar en un bundle de
 * cliente. Aquí solo hay tipos del protocolo y utilidades puras.
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
