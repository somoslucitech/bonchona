"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { NICK_STORAGE_KEY } from "@/lib/chat-client";
import ChatRoom from "./ChatRoom";
import ChatHeader from "./ChatHeader";
import NickGate from "./NickGate";

/** El mismo easing que usan PageTransition y GlobalPlayer. */
const EASE = [0.16, 1, 0.3, 1] as const;

interface Props {
  open: boolean;
  onClose: () => void;
}

/**
 * Contenedor del chat: drawer lateral en escritorio, hoja inferior en móvil.
 *
 * Solo se ocupa del envoltorio y del nombre. La conexión vive en ChatRoom, que
 * se monta únicamente cuando hay nick y el panel está abierto, para que cerrar
 * el chat cierre de verdad el socket.
 */
export default function ChatPanel({ open, onClose }: Props) {
  const [mounted, setMounted] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);
  const [nick, setNick] = useState("");
  const [modCode, setModCode] = useState("");
  const panelRef = useRef<HTMLDivElement | null>(null);
  const reduceMotion = useReducedMotion();

  // El setState va dentro de un timeout por la misma razón que en
  // GlobalPlayer: evita el aviso de estado sincrónico dentro de un efecto, y
  // deja que la primera pintura coincida con el HTML del servidor.
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 640px)");
    const sync = () => setIsDesktop(mq.matches);

    const id = setTimeout(() => {
      setMounted(true);
      sync();
      try {
        setNick(localStorage.getItem(NICK_STORAGE_KEY) ?? "");
      } catch {
        // Navegación privada o almacenamiento bloqueado: se pedirá el nombre.
      }
    }, 0);

    mq.addEventListener("change", sync);
    return () => {
      clearTimeout(id);
      mq.removeEventListener("change", sync);
    };
  }, []);

  const enter = useCallback((chosen: string, code: string) => {
    setNick(chosen);
    setModCode(code);
    try {
      localStorage.setItem(NICK_STORAGE_KEY, chosen);
    } catch {
      // Si no se puede recordar, el chat funciona igual esta sesión.
    }
  }, []);

  const changeNick = useCallback(() => {
    setNick("");
    setModCode("");
    try {
      localStorage.removeItem(NICK_STORAGE_KEY);
    } catch {
      // nada que limpiar
    }
  }, []);

  // Escape cierra, y el foco entra al panel al abrirse para que quien navega
  // con teclado no tenga que recorrer toda la página para llegar hasta aquí.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    panelRef.current?.focus();
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!mounted) return null;

  const slide = reduceMotion
    ? { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 } }
    : isDesktop
      ? {
          initial: { opacity: 0, x: 40 },
          animate: { opacity: 1, x: 0 },
          exit: { opacity: 0, x: 40 },
        }
      : {
          initial: { opacity: 0, y: 40 },
          animate: { opacity: 1, y: 0 },
          exit: { opacity: 0, y: 40 },
        };

  return createPortal(
    <AnimatePresence>
      {open && (
        <>
          {/* En móvil la hoja tapa medio sitio, así que se atenúa el fondo. En
              escritorio no: el chat convive con la página, no la bloquea. */}
          {!isDesktop && (
            <motion.button
              type="button"
              aria-label="Cerrar el chat"
              onClick={onClose}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="fixed inset-0 bottom-20 z-[44] bg-black/60 backdrop-blur-sm"
            />
          )}

          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal={!isDesktop}
            aria-label="Chat en vivo"
            tabIndex={-1}
            {...slide}
            transition={{ duration: reduceMotion ? 0.15 : 0.45, ease: EASE }}
            className="fixed z-[45] flex flex-col bg-black/95 backdrop-blur-xl border-white/10 outline-none
                       inset-x-0 bottom-20 h-[58dvh] rounded-t-3xl border-t
                       sm:inset-x-auto sm:right-0 sm:left-auto sm:top-24 sm:bottom-20 sm:h-auto sm:w-[380px] sm:rounded-t-none sm:border-l sm:border-t-0
                       md:bottom-24"
          >
            {nick ? (
              <ChatRoom
                nick={nick}
                modCode={modCode}
                onClose={onClose}
                onChangeNick={changeNick}
              />
            ) : (
              <>
                <ChatHeader count={null} onClose={onClose} />
                <NickGate initialNick="" onEnter={enter} />
              </>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body
  );
}
