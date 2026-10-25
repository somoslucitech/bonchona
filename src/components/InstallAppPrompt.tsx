"use client";

import { useEffect, useState } from "react";
import * as gtag from "@/lib/gtag";

// Aviso para instalar el sitio como app en el celular. Sale solo a quien ya
// está escuchando (30 s después del primer play): es quien tiene motivo para
// volver, y a nadie se le interrumpe la primera visita. Si lo cierran, no
// vuelve a salir.

const DISMISS_KEY = "bonchona:install:dismissed";
const DELAY_AFTER_PLAY_MS = 30_000;

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

function dismissed(): boolean {
  try {
    return localStorage.getItem(DISMISS_KEY) === "1";
  } catch {
    return false;
  }
}

function isStandalone(): boolean {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

// iPhone/iPad en Safari no tiene botón de instalar: hay que explicar el gesto.
function isIosSafari(): boolean {
  const ua = navigator.userAgent;
  return /iphone|ipad|ipod/i.test(ua) && /safari/i.test(ua) && !/crios|fxios|edgios/i.test(ua);
}

export default function InstallAppPrompt() {
  const [promptEvent, setPromptEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [ios, setIos] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (isStandalone() || dismissed()) return;

    const onPrompt = (e: Event) => {
      e.preventDefault(); // lo mostramos nosotros, en el momento oportuno
      setPromptEvent(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      gtag.event({ action: "app_installed", category: "App" });
      setVisible(false);
    };
    let timer: ReturnType<typeof setTimeout> | null = null;
    const onListening = () => {
      if (timer) return;
      timer = setTimeout(() => {
        setIos(isIosSafari());
        setVisible(true);
      }, DELAY_AFTER_PLAY_MS);
    };

    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    window.addEventListener("bonchona:listening", onListening);
    return () => {
      if (timer) clearTimeout(timer);
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
      window.removeEventListener("bonchona:listening", onListening);
    };
  }, []);

  const close = () => {
    setVisible(false);
    try {
      localStorage.setItem(DISMISS_KEY, "1");
    } catch {}
  };

  const install = async () => {
    if (!promptEvent) return;
    gtag.event({ action: "app_install_prompt", category: "App" });
    await promptEvent.prompt();
    const { outcome } = await promptEvent.userChoice;
    gtag.event({ action: `app_install_${outcome}`, category: "App" });
    setPromptEvent(null);
    close();
  };

  // Sin evento de instalación (navegador que no lo ofrece) y sin ser iPhone,
  // no hay nada útil que mostrar.
  if (!visible || (!promptEvent && !ios)) return null;

  return (
    <div
      role="dialog"
      aria-label="Instalar la app de Bonchona"
      className="md:hidden fixed top-16 inset-x-0 z-[41] px-3 pt-2"
    >
      <div className="glass bg-bonchona-navy/95 rounded-2xl border-white/10 p-3 flex items-center gap-3 shadow-2xl">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/icons/icon-192.png" alt="" width={40} height={40} className="w-10 h-10 rounded-xl flex-shrink-0" />
        <div className="min-w-0 flex-1">
          <p className="text-white text-xs font-black uppercase tracking-tight">Bonchona en tu celular</p>
          <p className="text-zinc-400 text-[11px] leading-snug">
            {ios ? (
              <>Toca <span className="text-white font-bold">Compartir</span> y luego <span className="text-white font-bold">Agregar a inicio</span>.</>
            ) : (
              "Instálala y abre la radio con un toque."
            )}
          </p>
        </div>
        {!ios && (
          <button
            type="button"
            onClick={install}
            className="px-3 py-2 bg-bonchona-red text-white text-[10px] font-black uppercase tracking-widest rounded-full flex-shrink-0"
          >
            Instalar
          </button>
        )}
        <button
          type="button"
          onClick={close}
          aria-label="Cerrar"
          className="w-8 h-8 flex items-center justify-center text-zinc-500 hover:text-white flex-shrink-0"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" aria-hidden>
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>
    </div>
  );
}
