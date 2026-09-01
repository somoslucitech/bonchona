/**
 * bonchona-chat — Worker independiente con el Durable Object del chat en vivo.
 *
 * Va aparte del Worker principal por la misma razón que workers/sampler:
 * @opennextjs/cloudflare genera su propio worker.js y para declarar una clase
 * Durable Object habría que reexportarla desde ese artefacto de build, lo que
 * hace el build frágil. Como beneficio extra, este worker lleva su propio
 * compatibility_date, sin arrastrar el 2025-02-01 del worker principal.
 *
 * Autenticación: este worker NO conoce la sesión del sitio. La cookie
 * `bonchona_session` es host-only y no viaja hasta aquí. En su lugar, Next
 * firma un ticket HMAC de 60s (ver src/lib/chat.ts) que el cliente presenta al
 * abrir el socket. Aquí solo se verifica una firma: ni Turnstile, ni sesión, ni
 * consultas de usuario.
 *
 * Deploy:  npx wrangler deploy -c workers/chat/wrangler.json
 *          npx wrangler secret put AUTH_SECRET -c workers/chat/wrangler.json
 */

import { DurableObject } from "cloudflare:workers";

// ------------------------------------------------------------
// Constantes de sala
// ------------------------------------------------------------

/** Historial efímero. Nunca toca D1: sería una fila por mensaje. */
const MAX_MESSAGES = 100;

/**
 * Por encima de este número de conectados los mensajes se emiten en lotes en
 * vez de uno a uno. Con pocas personas el envío inmediato se siente mejor y no
 * hay problema de fan-out; con muchas, agrupar evita miles de send() por
 * segundo. Además, con la sala llena siempre hay tráfico, así que el temporizador
 * del lote se dispara de verdad y no se queda colgado por una hibernación.
 */
const BATCH_THRESHOLD = 150;
const FLUSH_MS = 200;
const MAX_PENDING = 25;

/**
 * Cada cuánto se vuelca el historial al almacenamiento del Durable Object.
 *
 * Es la decisión de coste más importante de todo el feature: un `put` por
 * mensaje reventaría el techo de 100.000 filas escritas al día del plan
 * gratuito. Volcando como mucho una vez cada 5s el techo baja a ~17.000/día. El
 * precio es que una hibernación puede llevarse los últimos segundos de
 * historial, algo asumible en un chat efímero.
 */
const CHECKPOINT_MS = 5_000;

/** Cada cuánto se relee la configuración de D1 mientras la sala está activa. */
const CONFIG_TTL_MS = 30_000;

/** El contador de conectados no se difunde más de una vez cada tanto. */
const COUNT_BROADCAST_MS = 5_000;

// Modo lento automático: si entran más de N mensajes en la ventana, se sube el
// tiempo de espera durante un rato y se avisa en pantalla.
const AUTO_SLOW_WINDOW_MS = 10_000;
const AUTO_SLOW_TRIGGER = 25;
const AUTO_SLOW_MS = 15_000;
const AUTO_SLOW_HOLD_MS = 60_000;

const CLOSE = {
  BAD_TICKET: 4001,
  EXPIRED: 4002,
  BANNED: 4003,
  CHAT_CLOSED: 4004,
  FULL: 4005,
  KICKED: 4009,
};

const DEFAULT_CONFIG = {
  enabled: false,
  scheduleEnabled: false,
  slots: [],
  slowMs: 30_000,
  autoSlow: true,
  maxChars: 200,
  capacity: 1000,
  blockLinks: true,
  blockedWords: [],
  reservedNicks: [],
};

// ------------------------------------------------------------
// Utilidades
// ------------------------------------------------------------

/** Venezuela es UTC-4 fijo, sin horario de verano. Igual que en src/lib/analytics.ts. */
const VET_OFFSET_MS = 4 * 60 * 60 * 1000;

function vetMinutesOfDay(epochMs) {
  const local = new Date(epochMs - VET_OFFSET_MS);
  return local.getUTCHours() * 60 + local.getUTCMinutes();
}

const INVISIBLE_RE = /[\u0000-\u001F\u007F\u00AD\u200B-\u200F\u202A-\u202E\u2060-\u2064\u2066-\u2069\uFEFF]/gu;

function b64urlToBytes(value) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized + "=".repeat((4 - (normalized.length % 4)) % 4);
  const binary = atob(padded);
  return Uint8Array.from(binary, (c) => c.charCodeAt(0));
}

async function hmacKey(secret) {
  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["verify"]
  );
}

/**
 * Verifica el ticket "<cuerpo>.<firma>" emitido por /api/chat/ticket.
 * Devuelve el payload o null. No lanza nunca: un ticket corrupto es un cierre
 * limpio, no un error 500.
 */
async function verifyTicket(secret, raw) {
  if (!secret || typeof raw !== "string") return null;
  const parts = raw.split(".");
  if (parts.length !== 2) return null;
  const [body, signature] = parts;

  try {
    const key = await hmacKey(secret);
    const valid = await crypto.subtle.verify(
      "HMAC",
      key,
      b64urlToBytes(signature),
      new TextEncoder().encode(body)
    );
    if (!valid) return null;

    const payload = JSON.parse(new TextDecoder().decode(b64urlToBytes(body)));
    if (!payload || typeof payload.n !== "string" || typeof payload.x !== "number") return null;
    return payload;
  } catch {
    return null;
  }
}

/**
 * Dígitos y símbolos que imitan letras. Sin doblarlos, "Bonch0na" o "t0nto" se
 * cuelan como distintos de los reservados y de la lista negra.
 */
const CONFUSABLES = {
  "0": "o", "1": "i", "!": "i", "|": "i", "3": "e", "4": "a",
  "@": "a", "5": "s", "$": "s", "7": "t", "8": "b", "9": "g",
};

/** Misma normalización que nickKey() en src/lib/chat.ts. Los dos tienen que
 * doblar igual, o un baneo dejaría de reconocer al mismo nick. */
function nickKey(nick) {
  return nick
    .normalize("NFD")
    .replace(/[\u0300-\u036F]/g, "")
    .toLowerCase()
    .replace(/[0-9!|@$]/g, (c) => CONFUSABLES[c] ?? c)
    .replace(/[^a-z0-9]/g, "");
}

function codePointLength(text) {
  return [...text].length;
}

const LINK_RE =
  /(https?:\/\/|www\.|\b[a-z0-9][a-z0-9-]*\.(com|net|org|io|ve|co|me|link|xyz|ru|info|biz|shop|online|site|club|top|live|tv|app|dev|es|ar|mx)\b)/i;
const REPEAT_RE = /(.)\1{6,}/u;

/**
 * Valida y limpia el texto de un mensaje.
 *
 * Corre en el servidor a propósito: el cliente hace las mismas comprobaciones
 * para dar feedback inmediato, pero la que cuenta es esta, porque un WebSocket
 * se puede manejar a mano desde la consola del navegador.
 */
function validateText(raw, config, isMod) {
  if (typeof raw !== "string") return { error: "Mensaje inválido." };

  const text = raw.replace(INVISIBLE_RE, "").replace(/\s+/g, " ").trim();
  if (!text) return { error: "Escribe algo primero." };

  const length = codePointLength(text);
  if (length > config.maxChars) {
    return { error: `El mensaje no puede pasar de ${config.maxChars} caracteres.` };
  }

  // Los moderadores se saltan los filtros de contenido: necesitan poder pegar
  // un enlace o gritar un aviso en mitad de una transmisión.
  if (isMod) return { text };

  if (config.blockLinks && LINK_RE.test(text)) {
    return { error: "No se pueden enviar enlaces en el chat." };
  }

  if (REPEAT_RE.test(text)) {
    return { error: "Evita repetir el mismo carácter tantas veces." };
  }

  const letters = text.replace(/[^\p{L}]/gu, "");
  if (letters.length >= 8 && letters === letters.toUpperCase()) {
    return { error: "Baja el volumen: no escribas todo en mayúsculas." };
  }

  if (config.blockedWords.length) {
    const haystack = ` ${nickKey(text)} `;
    for (const word of config.blockedWords) {
      const needle = nickKey(word);
      if (needle && haystack.includes(needle)) {
        return { error: "Ese mensaje tiene palabras que no permitimos." };
      }
    }
  }

  return { text };
}

function normalizeConfig(raw) {
  if (!raw || typeof raw !== "object") return { ...DEFAULT_CONFIG };
  const clamp = (v, min, max, fb) => {
    const n = typeof v === "number" ? Math.round(v) : NaN;
    return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fb;
  };
  const list = (v) =>
    Array.isArray(v) ? v.filter((x) => typeof x === "string" && x.trim()).map((x) => x.trim()) : [];

  return {
    enabled: raw.enabled === true,
    scheduleEnabled: raw.scheduleEnabled === true,
    slots: Array.isArray(raw.slots)
      ? raw.slots.filter(
          (s) =>
            s && typeof s.startMin === "number" && typeof s.endMin === "number" && s.endMin > s.startMin
        )
      : [],
    slowMs: clamp(raw.slowMs, 1_000, 300_000, DEFAULT_CONFIG.slowMs),
    autoSlow: raw.autoSlow !== false,
    maxChars: clamp(raw.maxChars, 40, 500, DEFAULT_CONFIG.maxChars),
    capacity: clamp(raw.capacity, 1, 5_000, DEFAULT_CONFIG.capacity),
    blockLinks: raw.blockLinks !== false,
    blockedWords: list(raw.blockedWords),
    reservedNicks: list(raw.reservedNicks),
  };
}

function isOpenNow(config, now) {
  if (!config.enabled) return false;
  if (!config.scheduleEnabled || config.slots.length === 0) return true;
  const minute = vetMinutesOfDay(now);
  return config.slots.some((s) => minute >= s.startMin && minute < s.endMin);
}

// ------------------------------------------------------------
// El Durable Object
// ------------------------------------------------------------

export class ChatRoom extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env);
    this.ctx = ctx;
    this.env = env;

    /** Historial efímero, en memoria. Se vuelca a storage como mucho cada CHECKPOINT_MS. */
    this.messages = [];
    this.pin = "";
    this.frozen = false;
    /** nickKey -> { until, shadow } */
    this.bans = new Map();
    /** nickKey -> epoch ms del último mensaje. Cierra el hueco de reconectar para saltarse el modo lento. */
    this.lastByNick = new Map();

    this.pending = [];
    this.pendingDeletes = [];
    this.flushTimer = null;

    this.dirty = false;
    this.lastCheckpoint = 0;
    this.lastCountBroadcast = 0;

    this.config = { ...DEFAULT_CONFIG };
    this.configAt = 0;

    /** Marcas de tiempo recientes, para decidir si sube el modo lento solo. */
    this.recent = [];
    this.autoSlowUntil = 0;

    // El ping/pong se responde sin despertar al objeto: es la diferencia entre
    // hibernar de verdad y estar despierto 24/7 pagando duración.
    this.ctx.setWebSocketAutoResponse(new WebSocketRequestResponsePair("p", "P"));

    this.ctx.blockConcurrencyWhile(async () => {
      const snapshot = await this.ctx.storage.get("snapshot");
      if (snapshot) {
        this.messages = Array.isArray(snapshot.messages) ? snapshot.messages.slice(-MAX_MESSAGES) : [];
        this.pin = typeof snapshot.pin === "string" ? snapshot.pin : "";
        this.frozen = snapshot.frozen === true;
        this.bans = new Map(Array.isArray(snapshot.bans) ? snapshot.bans : []);
        this.lastByNick = new Map(Array.isArray(snapshot.lastByNick) ? snapshot.lastByNick : []);
      }
      this.lastCheckpoint = Date.now();
    });
  }

  // ---------- configuración ----------

  /**
   * Lee `chat_config` y `chat_pin` de D1, con caché de CONFIG_TTL_MS.
   *
   * Se cachea porque en un chat activo esto se consultaría en cada mensaje, y
   * D1 tiene su propio techo de filas leídas al día.
   */
  async loadConfig(force = false) {
    const now = Date.now();
    if (!force && now - this.configAt < CONFIG_TTL_MS) return this.config;

    try {
      const { results } = await this.env.DB.prepare(
        "SELECT key, value FROM settings WHERE key IN ('chat_config', 'chat_pin')"
      ).all();

      for (const row of results ?? []) {
        if (row.key === "chat_config") {
          this.config = normalizeConfig(JSON.parse(row.value));
        } else if (row.key === "chat_pin") {
          const parsed = JSON.parse(row.value);
          this.pin = typeof parsed === "string" ? parsed : "";
        }
      }
      this.configAt = now;
    } catch (e) {
      // Si D1 falla nos quedamos con la última configuración conocida: es mejor
      // un chat que sigue funcionando que uno que se cae por un hipo de la base.
      console.error("chat: no se pudo leer la configuración", e);
    }
    return this.config;
  }

  effectiveSlowMs() {
    return Date.now() < this.autoSlowUntil
      ? Math.max(this.config.slowMs, AUTO_SLOW_MS)
      : this.config.slowMs;
  }

  // ---------- entrada HTTP ----------

  async fetch(request) {
    const url = new URL(request.url);

    if (url.pathname === "/count") {
      return Response.json({ count: this.ctx.getWebSockets().length });
    }

    if (url.pathname === "/reload") {
      // Lo llama el admin al guardar: sin esto, apagar el chat no expulsaría a
      // nadie hasta que alguien intentara escribir.
      await this.loadConfig(true);
      if (!isOpenNow(this.config, Date.now())) {
        this.closeAll(CLOSE.CHAT_CLOSED, "El chat se ha cerrado.");
      } else {
        this.broadcast({ k: "state", frozen: this.frozen, slowMs: this.effectiveSlowMs(), pin: this.pin });
      }
      return Response.json({ ok: true });
    }

    if (url.pathname !== "/ws") return new Response("Not found", { status: 404 });
    if (request.headers.get("Upgrade") !== "websocket") {
      return new Response("Expected WebSocket", { status: 426 });
    }

    const ticket = await verifyTicket(this.env.AUTH_SECRET, url.searchParams.get("t"));
    if (!ticket) return Response.json({ error: "bad_ticket" }, { status: 401 });
    if (ticket.x < Date.now()) return Response.json({ error: "expired" }, { status: 401 });

    await this.loadConfig();
    if (!isOpenNow(this.config, Date.now())) {
      return this.rejectSocket(CLOSE.CHAT_CLOSED, {
        k: "err",
        c: "closed",
        t: "El chat está cerrado ahora mismo.",
      });
    }

    const key = nickKey(ticket.n);
    const ban = this.bans.get(key);
    const isMod = ticket.r === "mod";

    // Un baneo normal cierra la puerta; el shadowban la deja abierta a
    // propósito, para que el sancionado no sepa que lo está.
    if (ban && !isMod && ban.until > Date.now() && !ban.shadow) {
      return this.rejectSocket(CLOSE.BANNED, {
        k: "err",
        c: "banned",
        t: "No puedes participar en el chat.",
        until: ban.until,
      });
    }

    const connected = this.ctx.getWebSockets().length;
    if (!isMod && connected >= this.config.capacity) {
      // Aforo lleno: no es un error, es una cola. El cliente reintenta solo.
      return this.rejectSocket(CLOSE.FULL, {
        k: "err",
        c: "full",
        t: "El chat está lleno. Te pondremos dentro en cuanto se libere un sitio.",
        position: connected - this.config.capacity + 1,
        retryAfterMs: 5_000 + Math.floor(Math.random() * 5_000),
      });
    }

    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);

    this.ctx.acceptWebSocket(server, [`n:${key}`.slice(0, 256), `r:${ticket.r}`]);
    server.serializeAttachment({
      n: ticket.n,
      k: key,
      r: ticket.r,
      kind: ticket.k ?? null,
      shadow: !!(ban && ban.until > Date.now() && ban.shadow),
      lastAt: this.lastByNick.get(key) ?? 0,
      lastHash: "",
    });

    server.send(
      JSON.stringify({
        k: "hello",
        you: { n: ticket.n, r: ticket.r },
        msgs: this.visibleFor(key),
        pin: this.pin,
        frozen: this.frozen,
        slowMs: this.effectiveSlowMs(),
        maxChars: this.config.maxChars,
        count: connected + 1,
      })
    );

    this.maybeBroadcastCount();
    return new Response(null, { status: 101, webSocket: client });
  }

  /**
   * Rechaza una conexión explicándose.
   *
   * Un navegador no puede leer el cuerpo ni el código de una respuesta HTTP de
   * error en un upgrade fallido: solo ve "la conexión falló". Así que en vez de
   * devolver 403, aceptamos el socket, mandamos el motivo y cerramos con un
   * código propio. Es la única forma de que la interfaz pueda distinguir entre
   * "estás expulsado", "el chat está cerrado" y "hay aforo completo, espera".
   *
   * Usa accept() y no acceptWebSocket(), así este socket no cuenta como sesión
   * hibernable ni ocupa una plaza del aforo.
   */
  rejectSocket(code, payload) {
    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);
    server.accept();
    try {
      server.send(JSON.stringify(payload));
    } catch {
      // Si ni siquiera podemos explicarnos, el cierre habla por sí solo.
    }
    server.close(code, payload.c);
    return new Response(null, { status: 101, webSocket: client });
  }

  /** El historial que puede ver un nick: el suyo propio incluye sus mensajes en la sombra. */
  visibleFor(key) {
    return this.messages.filter((m) => !m.s || m.k === key).map(({ k, s, ...rest }) => rest);
  }

  // ---------- WebSocket ----------

  async webSocketMessage(ws, raw) {
    let msg;
    try {
      msg = JSON.parse(typeof raw === "string" ? raw : new TextDecoder().decode(raw));
    } catch {
      return;
    }

    const att = ws.deserializeAttachment();
    if (!att) return ws.close(CLOSE.BAD_TICKET, "sesión perdida");

    await this.loadConfig();
    if (!isOpenNow(this.config, Date.now())) {
      return this.closeAll(CLOSE.CHAT_CLOSED, "El chat se ha cerrado.");
    }

    const isMod = att.r === "mod";

    switch (msg.k) {
      case "msg":
        return this.handleMessage(ws, att, msg.t);
      case "del":
        return isMod ? this.handleDelete(att, msg.i) : this.deny(ws);
      case "ban":
        return isMod ? this.handleBan(att, msg) : this.deny(ws);
      case "unban":
        return isMod ? this.handleUnban(att, msg.n) : this.deny(ws);
      case "freeze":
        return isMod ? this.handleFreeze(att, msg.on === true) : this.deny(ws);
      case "clear":
        return isMod ? this.handleClear(att) : this.deny(ws);
      case "pin":
        return isMod ? this.handlePin(att, msg.t) : this.deny(ws);
      default:
        return;
    }
  }

  deny(ws) {
    ws.send(JSON.stringify({ k: "err", c: "forbidden", t: "No tienes permiso para eso." }));
  }

  handleMessage(ws, att, rawText) {
    const now = Date.now();
    const isMod = att.r === "mod";

    if (this.frozen && !isMod) {
      return ws.send(
        JSON.stringify({ k: "err", c: "frozen", t: "El chat está en modo solo lectura." })
      );
    }

    const ban = this.bans.get(att.k);
    if (ban && !isMod && ban.until > now && !ban.shadow) {
      return ws.close(CLOSE.BANNED, "expulsado");
    }

    if (!isMod) {
      // El límite se mide contra el mapa por nick, no solo contra el attachment:
      // así reconectar (o abrir otra pestaña) no regala un mensaje gratis.
      const lastAt = Math.max(att.lastAt || 0, this.lastByNick.get(att.k) || 0);
      const wait = this.effectiveSlowMs() - (now - lastAt);
      if (wait > 0) {
        return ws.send(
          JSON.stringify({ k: "err", c: "slow", t: "Espera un momento antes de volver a escribir.", w: wait })
        );
      }
    }

    const result = validateText(rawText, this.config, isMod);
    if (result.error) {
      return ws.send(JSON.stringify({ k: "err", c: "invalid", t: result.error }));
    }

    if (!isMod && result.text === att.lastHash) {
      return ws.send(
        JSON.stringify({ k: "err", c: "repeat", t: "Ya enviaste ese mismo mensaje." })
      );
    }

    const shadow = !!(ban && ban.until > now && ban.shadow);
    const message = {
      i: crypto.randomUUID().slice(0, 8),
      n: att.n,
      t: result.text,
      ts: now,
      ...(isMod ? { r: "mod" } : {}),
    };

    ws.serializeAttachment({ ...att, lastAt: now, lastHash: result.text });
    if (!isMod) this.lastByNick.set(att.k, now);

    // El historial guarda la marca de sombra y el nick normalizado; ninguno de
    // los dos sale al cliente (los quita visibleFor / el envelope del lote).
    this.messages.push({ ...message, k: att.k, s: shadow });
    if (this.messages.length > MAX_MESSAGES) this.messages.splice(0, this.messages.length - MAX_MESSAGES);

    if (shadow) {
      // Solo se lo devolvemos a quien lo escribió. Para él no ha pasado nada.
      ws.send(JSON.stringify({ k: "batch", msgs: [message] }));
      this.checkpoint(now);
      return;
    }

    this.trackRate(now);
    this.pending.push(message);
    this.scheduleFlush();
    this.checkpoint(now);
  }

  /** Sube el modo lento solo cuando el chat se desborda, y avisa una vez. */
  trackRate(now) {
    if (!this.config.autoSlow) return;
    this.recent.push(now);
    const cutoff = now - AUTO_SLOW_WINDOW_MS;
    while (this.recent.length && this.recent[0] < cutoff) this.recent.shift();

    if (this.recent.length >= AUTO_SLOW_TRIGGER && now >= this.autoSlowUntil) {
      this.autoSlowUntil = now + AUTO_SLOW_HOLD_MS;
      this.broadcast({
        k: "sys",
        t: "El chat va muy rápido: modo lento activado un momento.",
        level: "warn",
      });
      this.broadcast({ k: "state", slowMs: this.effectiveSlowMs() });
    }
  }

  handleDelete(att, id) {
    if (typeof id !== "string") return;
    const index = this.messages.findIndex((m) => m.i === id);
    if (index === -1) return;
    const [removed] = this.messages.splice(index, 1);

    this.pendingDeletes.push(id);
    this.scheduleFlush();
    this.dirty = true;
    this.checkpoint(Date.now(), true);
    this.audit(att, "delete", removed.n, removed.t);
  }

  handleBan(att, msg) {
    const target = typeof msg.n === "string" ? nickKey(msg.n) : "";
    if (!target) return;

    const shadow = msg.shadow === true;
    // `mins` a 0 o ausente = permanente (100 años, que a efectos de una radio
    // es lo mismo y evita tener que representar el infinito).
    const mins = typeof msg.mins === "number" && msg.mins > 0 ? Math.min(msg.mins, 525_600) : 0;
    const until = mins ? Date.now() + mins * 60_000 : Date.now() + 100 * 365 * 24 * 3600_000;

    this.bans.set(target, { until, shadow });
    this.dirty = true;
    this.checkpoint(Date.now(), true);

    for (const socket of this.ctx.getWebSockets(`n:${target}`)) {
      const a = socket.deserializeAttachment();
      if (!a) continue;
      if (shadow) {
        socket.serializeAttachment({ ...a, shadow: true });
      } else {
        socket.close(CLOSE.BANNED, "expulsado");
      }
    }

    if (!shadow) {
      // Sus mensajes se van con él: dejarlos sería dejar el motivo del baneo a la vista.
      const ids = this.messages.filter((m) => m.k === target).map((m) => m.i);
      if (ids.length) {
        this.messages = this.messages.filter((m) => m.k !== target);
        this.pendingDeletes.push(...ids);
        this.scheduleFlush();
      }
    }

    this.audit(att, shadow ? "shadowban" : "ban", msg.n, mins ? `${mins} min` : "permanente");
  }

  handleUnban(att, nick) {
    const target = typeof nick === "string" ? nickKey(nick) : "";
    if (!target || !this.bans.delete(target)) return;
    for (const socket of this.ctx.getWebSockets(`n:${target}`)) {
      const a = socket.deserializeAttachment();
      if (a) socket.serializeAttachment({ ...a, shadow: false });
    }
    this.dirty = true;
    this.checkpoint(Date.now(), true);
    this.audit(att, "unban", nick, null);
  }

  handleFreeze(att, on) {
    if (this.frozen === on) return;
    this.frozen = on;
    this.dirty = true;
    this.checkpoint(Date.now(), true);
    this.broadcast({ k: "state", frozen: on });
    this.broadcast({
      k: "sys",
      t: on ? "Un moderador pausó el chat." : "El chat se reabrió.",
      level: "info",
    });
    this.audit(att, on ? "freeze" : "unfreeze", null, null);
  }

  handleClear(att) {
    this.messages = [];
    this.pending = [];
    this.pendingDeletes = [];
    this.dirty = true;
    this.checkpoint(Date.now(), true);
    this.broadcast({ k: "clear" });
    this.audit(att, "clear", null, null);
  }

  handlePin(att, text) {
    const clean = typeof text === "string" ? text.replace(INVISIBLE_RE, "").trim().slice(0, 240) : "";
    this.pin = clean;
    this.broadcast({ k: "state", pin: clean });
    this.dirty = true;
    this.checkpoint(Date.now(), true);

    // El pin sí va a D1: tiene que sobrevivir a que el objeto se duerma y
    // poder editarse desde el panel aunque no haya nadie conectado.
    this.env.DB.prepare(
      "INSERT INTO settings (key, value, updated_at) VALUES ('chat_pin', ?, ?) " +
        "ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at"
    )
      .bind(JSON.stringify(clean), Date.now())
      .run()
      .catch((e) => console.error("chat: no se pudo guardar el pin", e));

    this.audit(att, clean ? "pin" : "unpin", null, clean || null);
  }

  webSocketClose(ws) {
    // El historial se vuelca sin esperar cuando se va el último: es el momento
    // justo antes de que el objeto se duerma del todo.
    const remaining = this.ctx.getWebSockets().length - 1;
    this.checkpoint(Date.now(), remaining <= 0);
    this.maybeBroadcastCount();
  }

  webSocketError(ws, error) {
    console.error("chat: error de websocket", error);
  }

  // ---------- difusión ----------

  scheduleFlush() {
    if (this.ctx.getWebSockets().length < BATCH_THRESHOLD || this.pending.length >= MAX_PENDING) {
      return this.flush();
    }
    if (this.flushTimer) return;
    this.flushTimer = setTimeout(() => {
      this.flushTimer = null;
      this.flush();
    }, FLUSH_MS);
  }

  flush() {
    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
      this.flushTimer = null;
    }
    if (this.pending.length) {
      this.broadcast({ k: "batch", msgs: this.pending });
      this.pending = [];
    }
    if (this.pendingDeletes.length) {
      this.broadcast({ k: "del", ids: this.pendingDeletes });
      this.pendingDeletes = [];
    }
  }

  broadcast(payload) {
    const data = JSON.stringify(payload);
    for (const socket of this.ctx.getWebSockets()) {
      try {
        socket.send(data);
      } catch {
        // Un socket muerto no debe interrumpir la difusión a los demás.
      }
    }
  }

  maybeBroadcastCount() {
    const now = Date.now();
    if (now - this.lastCountBroadcast < COUNT_BROADCAST_MS) return;
    this.lastCountBroadcast = now;
    this.broadcast({ k: "count", n: this.ctx.getWebSockets().length });
  }

  // ---------- persistencia ----------

  /**
   * Vuelca el estado al almacenamiento del objeto, como mucho una vez cada
   * CHECKPOINT_MS salvo que se fuerce. Ver el comentario de CHECKPOINT_MS: es
   * lo que mantiene el chat dentro del plan gratuito.
   */
  checkpoint(now, force = false) {
    this.dirty = true;
    if (!force && now - this.lastCheckpoint < CHECKPOINT_MS) return;
    this.lastCheckpoint = now;
    this.dirty = false;

    // Los baneos caducados no tienen por qué viajar al almacenamiento.
    for (const [key, ban] of this.bans) if (ban.until <= now) this.bans.delete(key);

    this.ctx.storage
      .put("snapshot", {
        messages: this.messages,
        pin: this.pin,
        frozen: this.frozen,
        bans: [...this.bans],
        lastByNick: [...this.lastByNick].slice(-500),
      })
      .catch((e) => console.error("chat: no se pudo guardar el historial", e));
  }

  closeAll(code, reason) {
    for (const socket of this.ctx.getWebSockets()) {
      try {
        socket.close(code, reason);
      } catch {
        // ya estaba cerrado
      }
    }
  }

  /** La auditoría sí va a D1: son pocas filas y tienen que durar. */
  audit(att, action, target, detail) {
    this.env.DB.prepare(
      "INSERT INTO chat_audit (id, ts, actor, actor_kind, action, target, detail) VALUES (?, ?, ?, ?, ?, ?, ?)"
    )
      .bind(
        crypto.randomUUID(),
        Date.now(),
        att.n,
        att.kind === "admin" ? "admin" : "mod",
        action,
        target ?? null,
        detail ? String(detail).slice(0, 200) : null
      )
      .run()
      .catch((e) => console.error("chat: no se pudo registrar la auditoría", e));
  }
}

// ------------------------------------------------------------
// Entrada del worker
// ------------------------------------------------------------

function originAllowed(request, env) {
  const origin = request.headers.get("Origin");
  if (!origin) return true; // llamadas servidor a servidor (/count, /reload)
  const allowed = (env.ALLOWED_ORIGINS || "").split(",").map((o) => o.trim()).filter(Boolean);
  return allowed.length === 0 || allowed.includes(origin);
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/health") return Response.json({ ok: true });

    if (!originAllowed(request, env)) {
      return new Response("Forbidden origin", { status: 403 });
    }

    // Una sola sala global. Si algún día hay chat por programa, aquí es donde
    // el nombre pasa a venir de la URL.
    const id = env.CHAT_ROOM.idFromName("global");
    return env.CHAT_ROOM.get(id).fetch(request);
  },
};
