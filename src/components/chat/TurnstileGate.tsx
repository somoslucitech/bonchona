"use client";

import { useEffect, useRef, useState } from "react";

/** La misma acción que exige el servidor al validar contra siteverify. */
const ACTION = "chat";

const SCRIPT_SRC = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

interface TurnstileApi {
  render: (
    el: HTMLElement,
    options: {
      sitekey: string;
      action?: string;
      size?: "normal" | "flexible" | "compact" | "invisible";
      appearance?: "always" | "execute" | "interaction-only";
      theme?: "light" | "dark" | "auto";
      callback?: (token: string) => void;
      "expired-callback"?: () => void;
      "error-callback"?: () => void;
    }
  ) => string;
  reset: (id: string) => void;
  remove: (id: string) => void;
}

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

let scriptPromise: Promise<void> | null = null;

/** Carga el script una sola vez aunque el panel se abra y se cierre varias veces. */
function loadTurnstile(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.turnstile) return Promise.resolve();
  if (scriptPromise) return scriptPromise;

  scriptPromise = new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${SCRIPT_SRC}"]`);
    if (existing) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () => reject(new Error("turnstile")));
      return;
    }
    const script = document.createElement("script");
    script.src = SCRIPT_SRC;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("turnstile"));
    document.head.appendChild(script);
  });

  return scriptPromise;
}

interface Props {
  onToken: (token: string) => void;
}

/**
 * Widget invisible de Turnstile.
 *
 * Solo aparece si el visitante tiene que resolver algo; en el caso normal no se
 * ve nada y el token llega solo. Se monta en la pantalla de entrada al chat,
 * antes del primer mensaje.
 *
 * La clave pública se pide al servidor en vez de leerse de una variable
 * `NEXT_PUBLIC_`, porque esas se incrustan durante `next build` y no se podrían
 * configurar desde el panel de Cloudflare.
 *
 * Si no hay clave configurada no renderiza nada y avisa con un token vacío: en
 * desarrollo el servidor lo tolera, y en producción rechaza la entrada, que es
 * el lado correcto en el que fallar.
 */
export default function TurnstileGate({ onToken }: Props) {
  const boxRef = useRef<HTMLDivElement | null>(null);
  const widgetRef = useRef<string | null>(null);
  const onTokenRef = useRef(onToken);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    onTokenRef.current = onToken;
  }, [onToken]);

  useEffect(() => {
    let cancelled = false;

    Promise.all([
      fetch("/api/chat/turnstile")
        .then((r) => (r.ok ? r.json() : { siteKey: "" }))
        .then((d: { siteKey?: string }) => d.siteKey ?? ""),
      loadTurnstile(),
    ])
      .then(([sitekey]) => {
        if (cancelled) return;
        if (!sitekey) {
          console.warn("Turnstile sin clave pública configurada: el chat entra sin verificar.");
          return;
        }
        if (!boxRef.current || !window.turnstile) return;
        widgetRef.current = window.turnstile.render(boxRef.current, {
          sitekey,
          action: ACTION,
          size: "flexible",
          // Solo se muestra si hace falta interacción; si no, es invisible.
          appearance: "interaction-only",
          theme: "dark",
          callback: (token) => onTokenRef.current(token),
          "expired-callback": () => onTokenRef.current(""),
          "error-callback": () => {
            if (!cancelled) setFailed(true);
            onTokenRef.current("");
          },
        });
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });

    return () => {
      cancelled = true;
      const id = widgetRef.current;
      widgetRef.current = null;
      if (id && window.turnstile) {
        try {
          window.turnstile.remove(id);
        } catch {
          // El widget ya no existe; nada que limpiar.
        }
      }
    };
  }, []);

  return (
    <div>
      <div ref={boxRef} className="empty:hidden" />
      {failed && (
        <p className="text-[10px] text-amber-400 font-bold mt-2">
          No se pudo cargar la verificación anti-bots. Revisa tu conexión y recarga.
        </p>
      )}
    </div>
  );
}
