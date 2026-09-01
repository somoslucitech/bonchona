"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { chatTime, nickColor, type ChatMessage } from "@/lib/chat-client";

/** Margen en píxeles para considerar que el usuario sigue pegado al final. */
const STICK_THRESHOLD = 60;

interface Props {
  messages: ChatMessage[];
  emptyLabel: string;
  isMod?: boolean;
  onModerate?: (payload: Record<string, unknown>) => void;
}

/**
 * Lista de mensajes.
 *
 * No se virtualiza a propósito: el historial está limitado a 100 mensajes tanto
 * en el Durable Object como en el cliente, así que una lista normal rinde de
 * sobra y evita toda la complejidad (y los saltos de scroll) de virtualizar.
 */
export default function ChatMessageList({ messages, emptyLabel, isMod, onModerate }: Props) {
  const [menuFor, setMenuFor] = useState<string | null>(null);
  const boxRef = useRef<HTMLDivElement | null>(null);
  const stickRef = useRef(true);
  // Solo se toca desde manejadores de evento, nunca desde un efecto.
  const [stuck, setStuck] = useState(true);

  const scrollToEnd = (behavior: ScrollBehavior = "smooth") => {
    const box = boxRef.current;
    if (!box) return;
    box.scrollTo({ top: box.scrollHeight, behavior });
    stickRef.current = true;
    setStuck(true);
  };

  // useLayoutEffect y no useEffect: así el salto al final ocurre antes de
  // pintar, y no se ve el tirón cuando entra un mensaje.
  useLayoutEffect(() => {
    if (!stickRef.current) return;
    const box = boxRef.current;
    if (box) box.scrollTop = box.scrollHeight;
  }, [messages]);

  useEffect(() => {
    const box = boxRef.current;
    if (!box) return;

    const onScroll = () => {
      // Si alguien subió a leer, no se le arrastra hacia abajo cada vez que
      // llega un mensaje nuevo: se le ofrece un botón y decide él.
      const distance = box.scrollHeight - box.scrollTop - box.clientHeight;
      const nowStuck = distance <= STICK_THRESHOLD;
      if (nowStuck === stickRef.current) return;
      stickRef.current = nowStuck;
      setStuck(nowStuck);
    };

    box.addEventListener("scroll", onScroll, { passive: true });
    return () => box.removeEventListener("scroll", onScroll);
  }, []);

  const showJump = !stuck && messages.length > 0;

  return (
    <div className="relative flex-1 min-h-0">
      <div
        ref={boxRef}
        role="log"
        aria-live="polite"
        aria-relevant="additions"
        aria-label="Mensajes del chat"
        className="h-full overflow-y-auto overscroll-contain px-4 py-3 space-y-2.5"
      >
        {messages.length === 0 ? (
          <p className="text-[11px] text-zinc-600 font-medium text-center py-8 leading-relaxed">
            {emptyLabel}
          </p>
        ) : (
          messages.map((m) => (
            <div key={m.i} className="group relative text-[13px] leading-snug break-words">
              {isMod && onModerate && (
                <ModMenu
                  open={menuFor === m.i}
                  onToggle={() => setMenuFor((cur) => (cur === m.i ? null : m.i))}
                  onAction={(payload) => {
                    onModerate(payload);
                    setMenuFor(null);
                  }}
                  message={m}
                />
              )}
              <span className="text-[10px] text-zinc-600 font-mono mr-1.5 tabular-nums">
                {chatTime(m.ts)}
              </span>
              {m.r === "mod" && (
                <span className="inline-block align-middle mr-1.5 px-1.5 py-0.5 rounded-full bg-bonchona-red text-white text-[8px] font-black uppercase tracking-widest">
                  Mod
                </span>
              )}
              <span
                className="font-black"
                style={{ color: m.r === "mod" ? "#E84B32" : nickColor(m.n) }}
              >
                {m.n}
              </span>
              <span className="text-zinc-600 font-black mx-1">:</span>
              <span className="text-zinc-200 font-medium">{m.t}</span>
            </div>
          ))
        )}
      </div>

      {showJump && (
        <button
          type="button"
          onClick={() => scrollToEnd()}
          className="absolute bottom-3 left-1/2 -translate-x-1/2 px-3 py-1.5 rounded-full bg-bonchona-red text-white text-[9px] font-black uppercase tracking-widest shadow-[0_8px_20px_rgba(232,75,50,0.4)] hover:scale-105 transition-transform"
        >
          Ir al final ↓
        </button>
      )}
    </div>
  );
}

/**
 * Acciones de moderación sobre un mensaje concreto.
 *
 * El botón está siempre presente (no solo al pasar el ratón) porque en móvil no
 * hay hover y un moderador tiene que poder actuar desde el teléfono, que es
 * donde suele estar durante una transmisión.
 */
function ModMenu({
  open,
  onToggle,
  onAction,
  message,
}: {
  open: boolean;
  onToggle: () => void;
  onAction: (payload: Record<string, unknown>) => void;
  message: ChatMessage;
}) {
  const item =
    "w-full text-left px-3 py-2 text-[11px] font-bold text-zinc-300 hover:bg-white/10 transition-colors";

  return (
    <div className="absolute right-0 top-0 z-10">
      <button
        type="button"
        onClick={onToggle}
        aria-label={`Moderar el mensaje de ${message.n}`}
        aria-expanded={open}
        className="w-6 h-5 rounded-md text-zinc-700 hover:text-white hover:bg-white/10 opacity-60 group-hover:opacity-100 transition-all text-[13px] leading-none"
      >
        ⋯
      </button>

      {open && (
        <div className="absolute right-0 top-6 w-52 py-1 rounded-xl bg-black/95 border border-white/10 backdrop-blur-xl shadow-[0_20px_40px_rgba(0,0,0,0.6)] overflow-hidden">
          <p className="px-3 py-1.5 text-[9px] font-black uppercase tracking-widest text-zinc-600 truncate border-b border-white/5">
            {message.n}
          </p>
          <button type="button" className={item} onClick={() => onAction({ k: "del", i: message.i })}>
            Borrar mensaje
          </button>
          <button
            type="button"
            className={item}
            onClick={() => onAction({ k: "ban", n: message.n, mins: 0, shadow: true })}
          >
            Silenciar en la sombra
          </button>
          <button
            type="button"
            className={item}
            onClick={() => onAction({ k: "ban", n: message.n, mins: 5 })}
          >
            Expulsar 5 minutos
          </button>
          <button
            type="button"
            className={item}
            onClick={() => onAction({ k: "ban", n: message.n, mins: 60 })}
          >
            Expulsar 1 hora
          </button>
          <button
            type="button"
            className={`${item} text-bonchona-red`}
            onClick={() => onAction({ k: "ban", n: message.n, mins: 0 })}
          >
            Expulsar siempre
          </button>
          <button
            type="button"
            className={item}
            onClick={() => onAction({ k: "unban", n: message.n })}
          >
            Readmitir
          </button>
        </div>
      )}
    </div>
  );
}
