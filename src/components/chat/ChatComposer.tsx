"use client";

import { useEffect, useRef, useState } from "react";
import { CHAT_EMOJIS } from "@/lib/chat-client";

interface Props {
  maxChars: number;
  /** epoch ms a partir del cual se puede volver a escribir */
  nextAllowedAt: number;
  disabled: boolean;
  disabledLabel: string | null;
  onSend: (text: string) => void;
}

export default function ChatComposer({
  maxChars,
  nextAllowedAt,
  disabled,
  disabledLabel,
  onSend,
}: Props) {
  const [text, setText] = useState("");
  const [showEmojis, setShowEmojis] = useState(false);
  const [remaining, setRemaining] = useState(0);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const emojiRef = useRef<HTMLDivElement | null>(null);

  // La cuenta atrás late aquí y no en el panel: así el tic de cada segundo no
  // vuelve a renderizar la lista de mensajes entera.
  useEffect(() => {
    const tick = () => setRemaining(Math.max(0, nextAllowedAt - Date.now()));
    tick();
    if (nextAllowedAt <= Date.now()) return;
    const id = setInterval(tick, 250);
    return () => clearInterval(id);
  }, [nextAllowedAt]);

  useEffect(() => {
    if (!showEmojis) return;
    const onDown = (e: MouseEvent) => {
      if (!emojiRef.current?.contains(e.target as Node)) setShowEmojis(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setShowEmojis(false);
        inputRef.current?.focus();
      }
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [showEmojis]);

  // Se cuentan puntos de código, no unidades UTF-16: un emoji vale 1, igual
  // que en el servidor.
  const length = [...text].length;
  const waiting = remaining > 0;
  const overflow = length > maxChars;
  const canSend = !disabled && !waiting && !overflow && text.trim().length > 0;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSend) return;
    onSend(text.trim());
    setText("");
    setShowEmojis(false);
  };

  const insertEmoji = (emoji: string) => {
    setText((prev) => ([...prev].length + [...emoji].length > maxChars ? prev : prev + emoji));
    inputRef.current?.focus();
  };

  if (disabled && disabledLabel) {
    return (
      <div className="border-t border-white/10 px-4 py-4">
        <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500 text-center">
          {disabledLabel}
        </p>
      </div>
    );
  }

  return (
    <div className="relative border-t border-white/10">
      {showEmojis && (
        <div
          ref={emojiRef}
          className="absolute bottom-full left-3 right-3 mb-2 p-2 rounded-2xl bg-black/95 border border-white/10 backdrop-blur-xl shadow-[0_20px_40px_rgba(0,0,0,0.6)] grid grid-cols-8 gap-1 max-h-44 overflow-y-auto"
        >
          {CHAT_EMOJIS.map((emoji) => (
            <button
              key={emoji}
              type="button"
              onClick={() => insertEmoji(emoji)}
              className="text-lg leading-none p-1.5 rounded-lg hover:bg-white/10 transition-colors"
              aria-label={`Insertar ${emoji}`}
            >
              {emoji}
            </button>
          ))}
        </div>
      )}

      <form onSubmit={submit} className="flex items-center gap-2 px-3 py-3">
        <button
          type="button"
          onClick={() => setShowEmojis((v) => !v)}
          aria-label="Abrir selector de emojis"
          aria-expanded={showEmojis}
          className="shrink-0 w-9 h-9 rounded-full flex items-center justify-center text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="9" />
            <path d="M8.5 14.5a4.5 4.5 0 0 0 7 0" strokeLinecap="round" />
            <circle cx="9" cy="9.5" r="1" fill="currentColor" stroke="none" />
            <circle cx="15" cy="9.5" r="1" fill="currentColor" stroke="none" />
          </svg>
        </button>

        <div className="relative flex-1">
          <input
            ref={inputRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            maxLength={maxChars * 2}
            placeholder={waiting ? "Espera un momento…" : "Escribe un mensaje"}
            aria-label="Mensaje"
            className="w-full h-10 pl-4 pr-14 rounded-full bg-white/5 border border-white/10 focus:border-bonchona-red focus:outline-none text-[13px] text-white placeholder:text-zinc-600 font-medium transition-colors"
          />
          {(length > maxChars * 0.75 || overflow) && (
            <span
              className={`absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-black tabular-nums ${
                overflow ? "text-bonchona-red" : "text-zinc-600"
              }`}
            >
              {maxChars - length}
            </span>
          )}
        </div>

        <button
          type="submit"
          disabled={!canSend}
          aria-label="Enviar mensaje"
          className="shrink-0 w-10 h-10 rounded-full bg-bonchona-red text-white flex items-center justify-center font-black disabled:opacity-30 disabled:cursor-not-allowed enabled:hover:scale-105 transition-transform"
        >
          {waiting ? (
            <span className="text-[11px] tabular-nums">{Math.ceil(remaining / 1000)}</span>
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 12h15M13 6l6 6-6 6" />
            </svg>
          )}
        </button>
      </form>
    </div>
  );
}
