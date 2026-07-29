"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

/**
 * Avisa a /api/track de cada vista de página.
 *
 * Va en el cliente y no en el middleware a propósito: no añade latencia al
 * render y deja fuera a los bots, que no ejecutan JS. Así el número del panel
 * refleja personas reales.
 */
export default function VisitTracker() {
  const pathname = usePathname();

  useEffect(() => {
    // El panel de administración no cuenta como visita del sitio.
    if (pathname.startsWith("/admin")) return;

    // keepalive para que el navegador no cancele el aviso si el usuario
    // navega justo después de cargar.
    fetch("/api/track", { method: "POST", keepalive: true }).catch(() => {
      /* las métricas nunca deben romper la navegación */
    });
  }, [pathname]);

  return null;
}
