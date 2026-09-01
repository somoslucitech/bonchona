"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { CHAT_CLOSE, type ChatMessage, type ChatStatus } from "@/lib/chat-client";

/** Tope del historial en pantalla: el mismo que guarda el Durable Object. */
const MAX_MESSAGES = 100;

/** El ping mantiene viva la conexión. El worker lo contesta sin despertarse. */
const PING_MS = 25_000;

const BACKOFF_MS = [1_000, 2_000, 4_000, 8_000, 15_000, 30_000];

export interface ChatNotice {
  text: string;
  level: "info" | "warn" | "error";
}

export interface UseChatSocket {
  status: ChatStatus;
  messages: ChatMessage[];
  pin: string;
  frozen: boolean;
  maxChars: number;
  count: number;
  isMod: boolean;
  notice: ChatNotice | null;
  queuePosition: number | null;
  /** epoch ms a partir del cual se puede volver a escribir */
  nextAllowedAt: number;
  send: (text: string) => void;
  /** Envía una orden de moderación. El worker vuelve a comprobar el rol. */
  moderate: (payload: Record<string, unknown>) => void;
  dismissNotice: () => void;
}

/**
 * Ciclo de vida del socket del chat.
 *
 * El hook asume que solo se monta cuando de verdad hay que conectar: quien lo
 * usa (ChatRoom) se monta y se desmonta con el panel. Así cerrar el chat tira
 * el socket y resetea el estado sin necesidad de un interruptor interno.
 *
 * La conexión nunca se abre al cargar la página: el contador de la barra ya
 * viaja dentro de /api/now-playing, así que mantener mil sockets abiertos "por
 * si acaso" sería pagar por nada e impediría hibernar al Durable Object.
 */
export function useChatSocket(nick: string): UseChatSocket {
  const [status, setStatus] = useState<ChatStatus>("connecting");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [pin, setPin] = useState("");
  const [frozen, setFrozen] = useState(false);
  const [maxChars, setMaxChars] = useState(200);
  const [count, setCount] = useState(0);
  const [isMod, setIsMod] = useState(false);
  const [notice, setNotice] = useState<ChatNotice | null>(null);
  const [queuePosition, setQueuePosition] = useState<number | null>(null);
  const [nextAllowedAt, setNextAllowedAt] = useState(0);

  const socketRef = useRef<WebSocket | null>(null);
  const retryRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // Impide que una reconexión programada resucite el socket tras desmontar.
  const aliveRef = useRef(true);
  const slowRef = useRef(30_000);
  const modRef = useRef(false);
  // connect() se reprograma a sí misma al reintentar. La referencia rompe el
  // ciclo: la función no puede nombrarse dentro de su propio useCallback.
  const connectRef = useRef<() => void>(() => {});

  const cleanup = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (pingRef.current) clearInterval(pingRef.current);
    timerRef.current = null;
    pingRef.current = null;
    const socket = socketRef.current;
    socketRef.current = null;
    if (socket) {
      socket.onclose = null;
      socket.onmessage = null;
      socket.onerror = null;
      socket.onopen = null;
      try {
        socket.close();
      } catch {
        // ya estaba cerrado
      }
    }
  }, []);

  const connect = useCallback(async () => {
    function scheduleRetry(fixedDelay?: number) {
      if (!aliveRef.current) return;
      const attempt = retryRef.current++;
      const base = fixedDelay ?? BACKOFF_MS[Math.min(attempt, BACKOFF_MS.length - 1)];
      // Con jitter: si se cae el worker, mil clientes no deben volver a la vez.
      const delay = base + Math.floor(Math.random() * 1_000);
      timerRef.current = setTimeout(() => connectRef.current(), delay);
    }

    function handleMessage(msg: Record<string, unknown>) {
      switch (msg.k) {
        case "hello": {
          const you = msg.you as { n: string; r: string } | undefined;
          modRef.current = you?.r === "mod";
          setIsMod(you?.r === "mod");
          setMessages((msg.msgs as ChatMessage[]) ?? []);
          setPin(typeof msg.pin === "string" ? msg.pin : "");
          setFrozen(msg.frozen === true);
          if (typeof msg.slowMs === "number") slowRef.current = msg.slowMs;
          if (typeof msg.maxChars === "number") setMaxChars(msg.maxChars);
          if (typeof msg.count === "number") setCount(msg.count);
          setQueuePosition(null);
          setStatus("open");
          break;
        }
        case "batch": {
          const incoming = (msg.msgs as ChatMessage[]) ?? [];
          if (!incoming.length) break;
          setMessages((prev) => [...prev, ...incoming].slice(-MAX_MESSAGES));
          break;
        }
        case "del": {
          const ids = new Set((msg.ids as string[]) ?? []);
          setMessages((prev) => prev.filter((m) => !ids.has(m.i)));
          break;
        }
        case "clear":
          setMessages([]);
          break;
        case "count":
          if (typeof msg.n === "number") setCount(msg.n);
          break;
        case "state":
          if (typeof msg.frozen === "boolean") setFrozen(msg.frozen);
          if (typeof msg.pin === "string") setPin(msg.pin);
          if (typeof msg.slowMs === "number") slowRef.current = msg.slowMs;
          break;
        case "sys":
          setNotice({
            text: String(msg.t ?? ""),
            level: msg.level === "warn" ? "warn" : "info",
          });
          break;
        case "err": {
          if (msg.c === "slow") {
            const wait = typeof msg.w === "number" ? msg.w : slowRef.current;
            setNextAllowedAt(Date.now() + wait);
            break;
          }
          if (msg.c === "full") {
            setStatus("queued");
            setQueuePosition(typeof msg.position === "number" ? msg.position : null);
            setNotice({ text: String(msg.t ?? "El chat está lleno."), level: "warn" });
            break;
          }
          // "banned" y "closed" llegan además por el código de cierre, que es
          // quien fija el estado final; aquí solo se guarda el motivo.
          setNotice({ text: String(msg.t ?? "No se pudo enviar."), level: "error" });
          break;
        }
        default:
          break;
      }
    }

    if (!aliveRef.current) return;

    let ticket: string;
    let wsUrl: string;
    try {
      const res = await fetch("/api/chat/ticket", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nick, turnstileToken: "" }),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        error?: string;
        ticket?: string;
        wsUrl?: string;
        slowMs?: number;
        maxChars?: number;
        role?: string;
      };

      if (!aliveRef.current) return;

      if (!res.ok || !data.ok || !data.ticket || !data.wsUrl) {
        // Un ticket denegado es definitivo: reintentar no cambiaría nada.
        setStatus("error");
        setNotice({ text: data.error || "No pudimos entrar al chat.", level: "error" });
        return;
      }

      ticket = data.ticket;
      wsUrl = data.wsUrl;
      if (typeof data.slowMs === "number") slowRef.current = data.slowMs;
      if (typeof data.maxChars === "number") setMaxChars(data.maxChars);
      modRef.current = data.role === "mod";
      setIsMod(data.role === "mod");
    } catch {
      scheduleRetry();
      return;
    }

    const socket = new WebSocket(`${wsUrl}?t=${encodeURIComponent(ticket)}`);
    socketRef.current = socket;

    socket.onopen = () => {
      retryRef.current = 0;
      pingRef.current = setInterval(() => {
        if (socket.readyState === WebSocket.OPEN) socket.send("p");
      }, PING_MS);
    };

    socket.onmessage = (event) => {
      // "P" es la respuesta automática al ping: la contesta el runtime sin
      // despertar al Durable Object, y no es JSON.
      if (event.data === "P") return;
      try {
        handleMessage(JSON.parse(event.data as string));
      } catch {
        // Un mensaje que no se entiende no debe tirar la conexión.
      }
    };

    socket.onclose = (event) => {
      if (pingRef.current) clearInterval(pingRef.current);
      pingRef.current = null;
      if (!aliveRef.current) return;

      if (event.code === CHAT_CLOSE.BANNED) return setStatus("banned");
      if (event.code === CHAT_CLOSE.CHAT_CLOSED) return setStatus("closed");

      // El aforo completo ya dejó la posición en la cola; lo demás es una
      // caída normal y se reintenta con espera creciente.
      if (event.code !== CHAT_CLOSE.FULL) setStatus("connecting");
      scheduleRetry(event.code === CHAT_CLOSE.FULL ? 6_000 : undefined);
    };

    socket.onerror = () => {
      // onclose siempre llega detrás y es quien decide qué hacer.
    };
  }, [nick]);

  useEffect(() => {
    connectRef.current = () => void connect();
  }, [connect]);

  // El primer intento se aplaza un tick para no arrancar una cadena de estado
  // dentro del propio efecto; connectRef ya quedó apuntada por el efecto de
  // arriba, que corre antes que este.
  useEffect(() => {
    aliveRef.current = true;
    const id = setTimeout(() => connectRef.current(), 0);
    return () => {
      aliveRef.current = false;
      clearTimeout(id);
      cleanup();
    };
  }, [connect, cleanup]);

  const send = useCallback((text: string) => {
    const socket = socketRef.current;
    if (!socket || socket.readyState !== WebSocket.OPEN) return;
    socket.send(JSON.stringify({ k: "msg", t: text }));
    // La cuenta atrás arranca al enviar. Si el servidor lo rechaza por modo
    // lento, el mensaje "slow" la corrige con el tiempo real que falta.
    if (!modRef.current) setNextAllowedAt(Date.now() + slowRef.current);
  }, []);

  // El rol viaja firmado dentro del ticket y el Durable Object lo verifica en
  // cada orden: esconder los botones es comodidad, no seguridad.
  const moderate = useCallback((payload: Record<string, unknown>) => {
    const socket = socketRef.current;
    if (!socket || socket.readyState !== WebSocket.OPEN) return;
    socket.send(JSON.stringify(payload));
  }, []);

  const dismissNotice = useCallback(() => setNotice(null), []);

  return {
    status,
    messages,
    pin,
    frozen,
    maxChars,
    count,
    isMod,
    notice,
    queuePosition,
    nextAllowedAt,
    send,
    moderate,
    dismissNotice,
  };
}
