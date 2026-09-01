"use client";

import { useChatSocket } from "./useChatSocket";
import ChatMessageList from "./ChatMessageList";
import ChatComposer from "./ChatComposer";
import ChatHeader from "./ChatHeader";

interface Props {
  nick: string;
  modCode: string;
  onClose: () => void;
  onChangeNick: () => void;
}

/**
 * La sala conectada.
 *
 * Existe como componente propio para que el socket viva y muera con ella: al
 * cerrar el panel este componente se desmonta, el WebSocket se cierra y todo el
 * estado desaparece sin necesidad de resetearlo a mano.
 */
export default function ChatRoom({ nick, modCode, onClose, onChangeNick }: Props) {
  const chat = useChatSocket(nick, modCode);

  const header = (
    <ChatHeader
      nick={nick}
      count={chat.status === "open" ? chat.count : null}
      isMod={chat.isMod}
      onClose={onClose}
      onChangeNick={chat.status === "open" ? onChangeNick : undefined}
    />
  );

  if (chat.status === "banned") {
    return (
      <>
        {header}
        <Estado
          titulo="No puedes escribir"
          texto="Un moderador limitó tu participación en el chat."
        />
      </>
    );
  }

  if (chat.status === "closed") {
    return (
      <>
        {header}
        <Estado titulo="Chat cerrado" texto="Vuelve durante la próxima transmisión en vivo." />
      </>
    );
  }

  if (chat.status === "error") {
    return (
      <>
        {header}
        <Estado
          titulo="No pudimos entrar"
          texto={chat.notice?.text ?? "Inténtalo de nuevo en un momento."}
          accion={{ label: "Usar otro nombre", onClick: onChangeNick }}
        />
      </>
    );
  }

  if (chat.status === "queued") {
    return (
      <>
        {header}
        <Estado
          titulo="Sala llena"
          texto={
            chat.queuePosition
              ? `Estás en la posición ${chat.queuePosition}. Entras en cuanto se libere un sitio.`
              : "Entras en cuanto se libere un sitio."
          }
        />
      </>
    );
  }

  return (
    <>
      {header}

      {chat.pin && (
        <div className="shrink-0 flex gap-2 items-start px-4 py-2.5 bg-bonchona-purple/25 border-b border-white/10">
          <span aria-hidden className="text-[13px] leading-tight">
            📌
          </span>
          <p className="text-[12px] text-zinc-200 font-medium leading-snug">{chat.pin}</p>
        </div>
      )}

      {chat.notice && (
        <button
          type="button"
          onClick={chat.dismissNotice}
          aria-label="Descartar aviso"
          className={`shrink-0 w-full text-left px-4 py-2 text-[11px] font-bold border-b border-white/10 ${
            chat.notice.level === "error"
              ? "bg-bonchona-red/20 text-bonchona-red"
              : chat.notice.level === "warn"
                ? "bg-amber-500/15 text-amber-300"
                : "bg-white/5 text-zinc-300"
          }`}
        >
          {chat.notice.text}
        </button>
      )}

      <ChatMessageList
        messages={chat.messages}
        emptyLabel={
          chat.status === "connecting"
            ? "Conectando…"
            : "Todavía no hay mensajes. Rompe el hielo."
        }
      />

      <ChatComposer
        maxChars={chat.maxChars}
        nextAllowedAt={chat.isMod ? 0 : chat.nextAllowedAt}
        disabled={chat.status !== "open" || (chat.frozen && !chat.isMod)}
        disabledLabel={
          chat.frozen && !chat.isMod
            ? "Un moderador pausó el chat"
            : chat.status !== "open"
              ? "Conectando…"
              : null
        }
        onSend={chat.send}
      />
    </>
  );
}

function Estado({
  titulo,
  texto,
  accion,
}: {
  titulo: string;
  texto: string;
  accion?: { label: string; onClick: () => void };
}) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center text-center px-8 gap-3">
      <h3 className="text-lg font-black tracking-tighter uppercase italic text-white leading-none">
        {titulo}
      </h3>
      <p className="text-[12px] text-zinc-500 font-medium leading-relaxed">{texto}</p>
      {accion && (
        <button
          type="button"
          onClick={accion.onClick}
          className="mt-2 px-5 h-9 rounded-full bg-white/10 hover:bg-white/20 text-white text-[10px] font-black uppercase tracking-widest transition-colors"
        >
          {accion.label}
        </button>
      )}
    </div>
  );
}
