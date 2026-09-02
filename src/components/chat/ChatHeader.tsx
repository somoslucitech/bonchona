"use client";

interface Props {
  nick?: string;
  count: number | null;
  isMod?: boolean;
  onClose: () => void;
  /** Si falta, no se ofrece cambiar de nombre (aún no hay sala conectada). */
  onChangeNick?: () => void;
}

export default function ChatHeader({ nick, count, isMod, onClose, onChangeNick }: Props) {
  return (
    <header className="shrink-0 flex items-center justify-between gap-3 px-4 h-14 border-b border-white/10">
      <div className="flex items-center gap-2 min-w-0">
        <span className="w-1.5 h-1.5 rounded-full bg-bonchona-red animate-pulse shrink-0" />
        <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-white truncate">
          Chat en vivo
        </h2>
        {count !== null && (
          <span className="text-[10px] font-black text-zinc-500 tabular-nums shrink-0">
            {count}
          </span>
        )}
      </div>

      <div className="flex items-center gap-1 shrink-0">
        {nick && onChangeNick && (
          <button
            type="button"
            onClick={onChangeNick}
            title={`Estás como ${nick}. Pulsa para cambiar de nombre.`}
            className="flex items-center gap-1 px-2 py-1 rounded-full text-[9px] font-black uppercase tracking-widest text-zinc-600 hover:text-white transition-colors max-w-[120px]"
          >
            {isMod && <span className="text-bonchona-red">★</span>}
            <span className="truncate">{nick}</span>
          </button>
        )}
        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar el chat"
          className="w-8 h-8 rounded-full flex items-center justify-center text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
      </div>
    </header>
  );
}
