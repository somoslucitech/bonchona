import { NextResponse } from "next/server";
import { getStreamConfig } from "@/lib/settings";

export const dynamic = "force-dynamic";

/** Ventana de caché. Con 10s, el Icecast recibe como mucho 6 peticiones/minuto. */
const CACHE_SECONDS = 10;

/**
 * Proxy con caché de la metadata del Icecast (canción sonando + oyentes).
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

  try {
    const { metadataUrl } = await getStreamConfig();

    const cache = (caches as unknown as { default: Cache }).default;
    const cacheKey = new Request(`https://bonchona.internal/now-playing`);

    const cached = await cache.match(cacheKey);
    if (cached) return cached;

    const res = await fetch(metadataUrl, {
      headers: { "User-Agent": "BonchonaPlayer/1.0" },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) {
      return NextResponse.json({ title: "", listeners: null }, { headers: cacheHeaders });
    }

    const data = (await res.json()) as {
      icestats?: { source?: unknown };
    };

    // Icecast devuelve `source` como objeto con un solo montaje, o array con varios.
    const src = data?.icestats?.source;
    const node = (Array.isArray(src) ? src[0] : src) as
      | { title?: string; listeners?: number }
      | undefined;

    const body = JSON.stringify({
      title: node?.title?.trim() ?? "",
      listeners: typeof node?.listeners === "number" ? node.listeners : null,
    });

    const response = new Response(body, { headers: cacheHeaders });
    // Guardamos en la caché del borde para las siguientes peticiones.
    await cache.put(cacheKey, response.clone());
    return response;
  } catch (e) {
    console.error("now-playing error:", e);
    // Nunca romper el reproductor por un fallo de metadata.
    return NextResponse.json({ title: "", listeners: null }, { headers: cacheHeaders });
  }
}
