/**
 * bonchona-sampler — Worker independiente con Cron Trigger.
 *
 * Cada 5 minutos pregunta al Icecast cuántos oyentes hay conectados y guarda
 * la muestra en la misma base D1 que usa el sitio. Va aparte del Worker
 * principal a propósito: @opennextjs/cloudflare genera su propio worker.js y
 * envolverlo para añadirle un handler `scheduled` haría el build frágil.
 *
 * Deploy:  npx wrangler deploy -c workers/sampler/wrangler.json
 */

const VET_OFFSET_MS = 4 * 60 * 60 * 1000; // Venezuela, UTC-4 fijo
const RETENTION_DAYS = 90;

// Solo se usa si D1 no responde. El valor real vive en la tabla `settings`
// (clave `stream_metadata_url`), la misma que edita el admin y que ya lee
// getStreamConfig() en el sitio principal — antes este worker tenía su propia
// copia fija (STREAM_STATUS_URL en wrangler.json) que quedó desactualizada
// cuando cambió el hostname del Icecast sin que nadie se acordara de tocar
// también este archivo.
const FALLBACK_METADATA_URL = "https://stream.bonchonaradio.com:8443/status-json.xsl";

function vetDayKey(epochMs) {
  return new Date(epochMs - VET_OFFSET_MS).toISOString().slice(0, 10);
}

async function getStreamMetadataUrl(env) {
  try {
    const row = await env.DB.prepare("SELECT value FROM settings WHERE key = 'stream_metadata_url'").first();
    if (row?.value) {
      const parsed = JSON.parse(row.value);
      if (typeof parsed === "string" && parsed) return parsed;
    }
  } catch (e) {
    console.error("No se pudo leer stream_metadata_url de settings:", e.message);
  }
  return FALLBACK_METADATA_URL;
}

async function sample(env) {
  const url = await getStreamMetadataUrl(env);
  const ts = Date.now();

  let listeners = 0;
  let peak = null;
  let online = 0;

  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "BonchonaSampler/1.0" },
      signal: AbortSignal.timeout(10_000),
    });
    if (res.ok) {
      const data = await res.json();
      // Icecast devuelve `source` como objeto si hay un solo stream, o array
      // si hay varios montajes.
      const src = data?.icestats?.source;
      const node = Array.isArray(src) ? src[0] : src;
      if (node) {
        listeners = Number(node.listeners) || 0;
        peak = Number(node.listener_peak) || null;
        online = 1;
      }
    } else {
      console.error("Icecast respondió", res.status);
    }
  } catch (e) {
    // Guardamos la muestra igual con online=0: así el hueco queda registrado
    // como caída del stream y no como "cero oyentes".
    console.error("No se pudo consultar el Icecast:", e.message);
  }

  await env.DB.prepare(
    "INSERT OR REPLACE INTO listener_samples (ts, listeners, peak, online) VALUES (?, ?, ?, ?)"
  ).bind(ts, listeners, peak, online).run();

  return { ts, listeners, peak, online };
}

/** Limpieza diaria, solo en la ejecución cercana a las 4:00 VET. */
async function maybePurge(env, now) {
  const vetHour = new Date(now - VET_OFFSET_MS).getUTCHours();
  const vetMin = new Date(now - VET_OFFSET_MS).getUTCMinutes();
  if (vetHour !== 4 || vetMin >= 5) return;

  const cutoffMs = now - RETENTION_DAYS * 24 * 60 * 60 * 1000;
  await env.DB.batch([
    env.DB.prepare("DELETE FROM listener_samples WHERE ts < ?").bind(cutoffMs),
    env.DB.prepare("DELETE FROM daily_visitors WHERE day < ?").bind(vetDayKey(cutoffMs)),
  ]);
}

export default {
  async scheduled(event, env, ctx) {
    ctx.waitUntil(
      (async () => {
        const result = await sample(env);
        console.log("muestra", JSON.stringify(result));
        await maybePurge(env, Date.now());
      })()
    );
  },

  // Permite forzar una muestra manualmente para probar, sin esperar al cron.
  // Requiere el mismo token del ingest, así no queda abierto.
  async fetch(request, env) {
    const auth = request.headers.get("authorization") ?? "";
    const expected = env.NEWS_INGEST_TOKEN;
    if (!expected || auth !== `Bearer ${expected}`) {
      return new Response("No autorizado", { status: 401 });
    }
    const result = await sample(env);
    return Response.json(result);
  },
};
