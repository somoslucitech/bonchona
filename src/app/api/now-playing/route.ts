import { NextResponse } from "next/server";
import { getStreamConfig } from "@/lib/settings";
import { getChatConfig, getChatOpenState, chatWorkerBase, type ChatClosedReason } from "@/lib/chat";

export const dynamic = "force-dynamic";

/** Ventana de caché. Con 10s, el Icecast recibe como mucho 6 peticiones/minuto. */
const CACHE_SECONDS = 10;

interface ChatStatus {
  open: boolean;
  reason: ChatClosedReason | null;
  opensInMin: number | null;
  /** Conectados ahora mismo. `null` si el worker del chat no respondió. */
  count: number | null;
}

const CHAT_CLOSED: ChatStatus = { open: false, reason: "disabled", opensInMin: null, count: 0 };

/**
 * Estado del chat, empaquetado dentro de esta misma respuesta a propósito.
 *
 * El reproductor ya consulta este endpoint cada 15s, así que colgar aquí el
 * "¿está abierto?" y el contador de conectados sale gratis. Un endpoint aparte
 * habría duplicado el tráfico: con 1.000 oyentes serían ~5,7 millones de
 * peticiones al día solo para pintar un número al lado de un icono.
 *
 * Nunca lanza: si el worker del chat está caído o lento, el reproductor tiene
 * que seguir mostrando la canción igual.
 */
async function getChatStatus(): Promise<ChatStatus> {
  try {
    const config = await getChatConfig();
    const state = getChatOpenState(config);

    // Con el chat cerrado no hay nada que preguntarle al Durable Object: así
    // además lo dejamos hibernar de verdad en vez de despertarlo cada 10s.
    if (!state.open) {
      return { open: false, reason: state.reason, opensInMin: state.opensInMin, count: 0 };
    }

    let count: number | null = null;
    try {
      const res = await fetch(`${chatWorkerBase()}/count`, {
        signal: AbortSignal.timeout(1500),
      });
      if (res.ok) {
        const data = (await res.json()) as { count?: unknown };
        if (typeof data.count === "number") count = data.count;
      }
    } catch {
      // El chat sigue anunciándose como abierto; solo nos quedamos sin cifra.
    }

    return { open: true, reason: null, opensInMin: null, count };
  } catch (e) {
    console.error("chat status error:", e);
    return CHAT_CLOSED;
  }
}

/**
 * Proxy con caché de la metadata del Icecast (canción sonando + oyentes) y del
 * estado del chat en vivo.
 *
 * Antes cada reproductor consultaba el Icecast directamente cada 15s. Con
 * 5.000 oyentes eso serían ~333 peticiones por segundo contra el servidor de
 * streaming, que caería por la metadata mucho antes que por el audio.
 *
 * Ahora los clientes pegan contra Cloudflare (que escala solo) y la respuesta
 * se cachea en el borde: el Icecast ve un puñado de peticiones por minuto sin
 * importar cuánta gente esté escuchando.
 */
export async function GET() {
  const cacheHeaders = {
    "Content-Type": "application/json",
    "Cache-Control": `public, max-age=${CACHE_SECONDS}, s-maxage=${CACHE_SECONDS}, stale-while-revalidate=30`,
  };

  // `caches` solo existe en el runtime de Workers. En `next dev` (Node) no
  // está, así que se trabaja sin caché de borde en vez de reventar.
  const cache =
    typeof caches !== "undefined" ? (caches as unknown as { default: Cache }).default : null;
  const cacheKey = new Request(`https://bonchona.internal/now-playing`);

  try {
    if (cache) {
      const cached = await cache.match(cacheKey);
      if (cached) return cached;
    }

    const { metadataUrl } = await getStreamConfig();

    // En paralelo: un chat lento no debe retrasar la metadata ni al revés.
    const [icecast, chat] = await Promise.all([
      fetch(metadataUrl, {
        headers: { "User-Agent": "BonchonaPlayer/1.0" },
        signal: AbortSignal.timeout(8000),
      }).catch(() => null),
      getChatStatus(),
    ]);

    let title = "";
    let listeners: number | null = null;

    if (icecast?.ok) {
      const data = (await icecast.json()) as { icestats?: { source?: unknown } };

      // Icecast devuelve `source` como objeto con un solo montaje, o array con varios.
      const src = data?.icestats?.source;
      const node = (Array.isArray(src) ? src[0] : src) as
        | { title?: string; listeners?: number }
        | undefined;

      title = node?.title?.trim() ?? "";
      listeners = typeof node?.listeners === "number" ? node.listeners : null;
    }

    const response = new Response(JSON.stringify({ title, listeners, chat }), {
      headers: cacheHeaders,
    });
    // Guardamos en la caché del borde para las siguientes peticiones.
    if (cache) await cache.put(cacheKey, response.clone());
    return response;
  } catch (e) {
    console.error("now-playing error:", e);
    // Nunca romper el reproductor por un fallo de metadata.
    return NextResponse.json(
      { title: "", listeners: null, chat: CHAT_CLOSED },
      { headers: cacheHeaders }
    );
  }
}
