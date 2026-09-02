"use client";

import { useState } from "react";

interface Props {
  frozen: boolean;
  pin: string;
  onModerate: (payload: Record<string, unknown>) => void;
}

const pill =
  "px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest transition-colors";

/**
 * Barra de moderación, visible solo para quien tiene el rol.
 *
 * Las acciones destructivas (vaciar el chat) piden confirmación en el propio
 * botón en vez de abrir un diálogo: en mitad de una transmisión en vivo, un
 * modal es justo lo que no quieres.
 */
export default function ChatModBar({ frozen, pin, onModerate }: Props) {
  const [confirmClear, setConfirmClear] = useState(false);
  const [editingPin, setEditingPin] = useState(false);
  const [pinDraft, setPinDraft] = useState(pin);

  if (editingPin) {
    return (
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onModerate({ k: "pin", t: pinDraft });
          setEditingPin(false);
        }}
        className="shrink-0 flex gap-2 px-3 py-2 bg-bonchona-purple/20 border-b border-white/10"
      >
        <input
          autoFocus
          value={pinDraft}
          maxLength={240}
          onChange={(e) => setPinDraft(e.target.value)}
          placeholder="Mensaje fijado (vacío para quitarlo)"
          className="flex-1 h-8 px-3 rounded-full bg-white/5 border border-white/10 focus:border-bonchona-red focus:outline-none text-[12px] text-white placeholder:text-zinc-600 font-medium"
        />
        <button type="submit" className={`${pill} bg-bonchona-red text-white`}>
          Fijar
        </button>
        <button
          type="button"
          onClick={() => {
            setPinDraft(pin);
            setEditingPin(false);
          }}
          className={`${pill} text-zinc-500 hover:text-white`}
        >
          Cancelar
        </button>
      </form>
    );
  }

  return (
    <div className="shrink-0 flex items-center gap-1.5 px-3 py-2 bg-white/[0.03] border-b border-white/10 overflow-x-auto">
      <span className="text-[8px] font-black uppercase tracking-widest text-bonchona-red shrink-0 mr-1">
        Mod
      </span>

      <button
        type="button"
        onClick={() => onModerate({ k: "freeze", on: !frozen })}
        className={`${pill} shrink-0 ${
          frozen ? "bg-amber-500/25 text-amber-300" : "bg-white/10 text-zinc-400 hover:text-white"
        }`}
      >
        {frozen ? "Reanudar" : "Pausar"}
      </button>

      <button
        type="button"
        onClick={() => {
          setPinDraft(pin);
          setEditingPin(true);
        }}
        className={`${pill} shrink-0 bg-white/10 text-zinc-400 hover:text-white`}
      >
        {pin ? "Editar fijado" : "Fijar mensaje"}
      </button>

      {confirmClear ? (
        <>
          <button
            type="button"
            onClick={() => {
              onModerate({ k: "clear" });
              setConfirmClear(false);
            }}
            className={`${pill} shrink-0 bg-bonchona-red text-white`}
          >
            Confirmar vaciado
          </button>
          <button
            type="button"
            onClick={() => setConfirmClear(false)}
            className={`${pill} shrink-0 text-zinc-500 hover:text-white`}
          >
            No
          </button>
        </>
      ) : (
        <button
          type="button"
          onClick={() => setConfirmClear(true)}
          className={`${pill} shrink-0 bg-white/10 text-zinc-400 hover:text-bonchona-red`}
        >
          Vaciar
        </button>
      )}
    </div>
  );
}
