"use client";

// De dónde llega cada visita, para saber qué canal trae oyentes. Se decide una
// sola vez por sesión (pestaña) y se guarda en sessionStorage: así las páginas
// siguientes y el "play" se atribuyen al canal que trajo a la persona, no a la
// navegación interna. No se guarda nada que identifique a nadie.

const SESSION_KEY = "bonchona:source";
const PLAY_KEY = "bonchona:played";

// Lo que se puede decir al aire o poner en un enlace: ?utm_source=fm, =app,
// =whatsapp... Se limita el formato para que nadie llene la tabla de basura.
function cleanSource(value: string | null): string | null {
  const v = (value || "").trim().toLowerCase().replace(/[^a-z0-9_-]/g, "").slice(0, 24);
  return v || null;
}

const REFERRER_RULES: Array<[RegExp, string]> = [
  [/(^|\.)google\./, "google"],
  [/(^|\.)bing\.com$/, "bing"],
  [/(^|\.)(duckduckgo\.com|yahoo\.com|search\.brave\.com|ecosia\.org)$/, "buscadores"],
  [/(^|\.)(chatgpt\.com|openai\.com|perplexity\.ai|gemini\.google\.com|copilot\.microsoft\.com|claude\.ai)$/, "ia"],
  [/(^|\.)(facebook\.com|fb\.com|fb\.me|m\.facebook\.com|l\.facebook\.com)$/, "facebook"],
  [/(^|\.)(instagram\.com|l\.instagram\.com)$/, "instagram"],
  [/(^|\.)tiktok\.com$/, "tiktok"],
  [/(^|\.)(youtube\.com|youtu\.be)$/, "youtube"],
  [/(^|\.)(t\.co|twitter\.com|x\.com)$/, "x"],
  [/(^|\.)(whatsapp\.com|wa\.me)$/, "whatsapp"],
  [/(^|\.)(streema\.com|tunein\.com|mytuner-radio\.com|radio\.garden|radio\.net|zeno\.fm|radio-browser\.info)$/, "directorios"],
];

function sourceFromReferrer(referrer: string): string {
  if (!referrer) return "directo";
  let host: string;
  try {
    host = new URL(referrer).hostname.toLowerCase();
  } catch {
    return "directo";
  }
  if (host === location.hostname || host.endsWith("bonchonaradio.com")) return "directo";
  for (const [pattern, name] of REFERRER_RULES) if (pattern.test(host)) return name;
  return "otros-sitios";
}

/**
 * Canal de la sesión actual. `isNew` es true solo en la primera página de la
 * sesión: es la que cuenta como una visita de ese canal.
 */
export function getSessionSource(): { source: string; isNew: boolean } {
  try {
    const stored = sessionStorage.getItem(SESSION_KEY);
    if (stored) return { source: stored, isNew: false };
  } catch {
    /* sin storage cada página parece nueva; se cuenta igual, solo peor atribuida */
  }
  const params = new URLSearchParams(location.search);
  const source = cleanSource(params.get("utm_source")) ?? sourceFromReferrer(document.referrer);
  try {
    sessionStorage.setItem(SESSION_KEY, source);
  } catch {}
  return { source, isNew: true };
}

export function sendTrack(kind: "pageview" | "play", extra: Record<string, unknown> = {}) {
  // keepalive para que el navegador no cancele el aviso si se navega enseguida.
  fetch("/api/track", {
    method: "POST",
    keepalive: true,
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ kind, ...extra }),
  }).catch(() => {
    /* las métricas nunca deben romper el sitio */
  });
}

/**
 * Avisa que esta sesión empezó a escuchar el vivo. Una vez por sesión: lo que
 * importa es cuántas visitas terminan escuchando, no cuántas veces se pausó.
 */
export function reportListening() {
  // Para lo que reacciona a "empezó a escuchar" (p. ej. el aviso de instalar
  // la app), en cada play y no solo el primero de la sesión.
  window.dispatchEvent(new Event("bonchona:listening"));
  try {
    if (sessionStorage.getItem(PLAY_KEY)) return;
    sessionStorage.setItem(PLAY_KEY, "1");
  } catch {}
  sendTrack("play", { source: getSessionSource().source });
}
