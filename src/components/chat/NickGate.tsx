"use client";

import { useEffect, useRef, useState } from "react";

const field =
  "w-full h-11 px-4 rounded-xl bg-white/5 border border-white/10 focus:border-bonchona-red focus:outline-none text-[13px] text-white placeholder:text-zinc-600 font-medium transition-colors";
const label = "text-[9px] font-black uppercase tracking-widest text-zinc-500";

interface Props {
  initialNick: string;
  onEnter: (nick: string) => void;
}

/**
 * Puerta de entrada al chat: solo un nombre.
 *
 * Sin cuenta y sin foto de perfil, por decisión de producto. El nombre se
 * recuerda en el navegador para no tener que escribirlo cada vez.
 *
 * Aquí no se pide ningún código de moderador. Quien modera lo hace por su
 * sesión del sitio: entra una vez con su cuenta y el chat lo reconoce solo.
 */
export default function NickGate({ initialNick, onEnter }: Props) {
  const [nick, setNick] = useState(initialNick);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const trimmed = nick.replace(/\s+/g, " ").trim();
  const length = [...trimmed].length;
  const valid = length >= 2 && length <= 20;

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (valid) onEnter(trimmed);
      }}
      className="flex-1 flex flex-col justify-center px-6 py-8 gap-5"
    >
      <div className="space-y-2">
        <h3 className="text-2xl font-black tracking-tighter uppercase italic text-white leading-none">
          Entra al chat
        </h3>
        <p className="text-[12px] text-zinc-500 font-medium leading-relaxed">
          Elige un nombre para participar. No hace falta registrarse.
        </p>
      </div>

      <div className="space-y-2">
        <label htmlFor="chat-nick" className={label}>
          Tu nombre
        </label>
        <input
          id="chat-nick"
          ref={inputRef}
          value={nick}
          onChange={(e) => setNick(e.target.value)}
          maxLength={40}
          placeholder="Cómo quieres que te vean"
          className={field}
        />
        <p className="text-[10px] text-zinc-600 font-medium">
          Entre 2 y 20 caracteres. Puedes usar emojis.
        </p>
      </div>

      <button
        type="submit"
        disabled={!valid}
        className="h-11 rounded-full bg-bonchona-red text-white text-[11px] font-black uppercase tracking-widest disabled:opacity-30 disabled:cursor-not-allowed enabled:hover:scale-[1.02] transition-transform"
      >
        Entrar
      </button>
    </form>
  );
}
