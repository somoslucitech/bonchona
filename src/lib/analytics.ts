import { getCloudflareEnv } from "./cf-env";

/** Venezuela es UTC-4 fijo, sin horario de verano. */
const VET_OFFSET_MS = 4 * 60 * 60 * 1000;

/** Clave de día 'YYYY-MM-DD' en hora de Venezuela. */
export function vetDayKey(epochMs: number): string {
  return new Date(epochMs - VET_OFFSET_MS).toISOString().slice(0, 10);
}

export interface DayPoint {
  day: string;        // 'YYYY-MM-DD'
  peak: number;       // máximo de oyentes concurrentes ese día
  avg: number;        // promedio de concurrentes
  views: number;      // vistas de página
  visitors: number;   // visitantes únicos
}

export interface AnalyticsSummary {
  series: DayPoint[];
  /** Oyentes ahora mismo (última muestra), o null si no hay datos. */
  listenersNow: number | null;
  lastSampleAt: number | null;
  totals: {
    peakAllTime: number;
    viewsToday: number;
    visitorsToday: number;
    viewsPrev: number;      // mismo periodo anterior, para el delta
    visitorsPrev: number;
    sampleCount: number;
  };
}

/**
 * Serie diaria de los últimos `days` días, combinando las muestras de oyentes
 * del Icecast con el contador propio de visitas.
 */
export async function getAnalytics(days = 30): Promise<AnalyticsSummary> {
  const env = getCloudflareEnv();
  const empty: AnalyticsSummary = {
    series: [],
    listenersNow: null,
    lastSampleAt: null,
    totals: { peakAllTime: 0, viewsToday: 0, visitorsToday: 0, viewsPrev: 0, visitorsPrev: 0, sampleCount: 0 },
  };
  if (!env?.DB) return empty;

  const now = Date.now();
  const since = now - days * 24 * 60 * 60 * 1000;
  const today = vetDayKey(now);

  try {
    const [listenerRows, viewRows, visitorRows, lastSample, peakRow, countRow] = await Promise.all([
      // Agrupamos por día VET restando el offset antes de formatear.
      env.DB.prepare(
        `SELECT date((ts - ?) / 1000, 'unixepoch') AS day,
                MAX(listeners) AS peak,
                AVG(listeners) AS avg
         FROM listener_samples
         WHERE ts >= ? AND online = 1
         GROUP BY day ORDER BY day ASC`
      ).bind(VET_OFFSET_MS, since).all<{ day: string; peak: number; avg: number }>(),

      env.DB.prepare(
        "SELECT day, views FROM daily_pageviews WHERE day >= ? ORDER BY day ASC"
      ).bind(vetDayKey(since)).all<{ day: string; views: number }>(),

      env.DB.prepare(
        `SELECT day, COUNT(*) AS visitors FROM daily_visitors
         WHERE day >= ? GROUP BY day ORDER BY day ASC`
      ).bind(vetDayKey(since)).all<{ day: string; visitors: number }>(),

      env.DB.prepare(
        "SELECT ts, listeners FROM listener_samples WHERE online = 1 ORDER BY ts DESC LIMIT 1"
      ).first<{ ts: number; listeners: number }>(),

      env.DB.prepare("SELECT MAX(listeners) AS p FROM listener_samples").first<{ p: number | null }>(),

      env.DB.prepare("SELECT COUNT(*) AS c FROM listener_samples").first<{ c: number }>(),
    ]);

    // Unimos las tres fuentes en un solo eje de días continuo, para que la
    // gráfica no invente puntos ni deje huecos silenciosos.
    const byDay = new Map<string, DayPoint>();
    for (let i = days - 1; i >= 0; i--) {
      const key = vetDayKey(now - i * 24 * 60 * 60 * 1000);
      byDay.set(key, { day: key, peak: 0, avg: 0, views: 0, visitors: 0 });
    }
    for (const r of listenerRows.results ?? []) {
      const p = byDay.get(r.day);
      if (p) { p.peak = r.peak ?? 0; p.avg = Math.round((r.avg ?? 0) * 10) / 10; }
    }
    for (const r of viewRows.results ?? []) {
      const p = byDay.get(r.day);
      if (p) p.views = r.views ?? 0;
    }
    for (const r of visitorRows.results ?? []) {
      const p = byDay.get(r.day);
      if (p) p.visitors = r.visitors ?? 0;
    }

    const series = [...byDay.values()];
    const half = Math.floor(series.length / 2);
    const sum = (arr: DayPoint[], k: "views" | "visitors") => arr.reduce((a, b) => a + b[k], 0);

    const todayPoint = byDay.get(today);

    return {
      series,
      listenersNow: lastSample?.listeners ?? null,
      lastSampleAt: lastSample?.ts ?? null,
      totals: {
        peakAllTime: peakRow?.p ?? 0,
        viewsToday: todayPoint?.views ?? 0,
        visitorsToday: todayPoint?.visitors ?? 0,
        viewsPrev: sum(series.slice(0, half), "views"),
        visitorsPrev: sum(series.slice(0, half), "visitors"),
        sampleCount: countRow?.c ?? 0,
      },
    };
  } catch (e) {
    console.error("getAnalytics error:", e);
    return empty;
  }
}

/** Purga datos viejos para que las tablas no crezcan sin control. */
export async function purgeOldAnalytics(retentionDays = 90): Promise<void> {
  const env = getCloudflareEnv();
  if (!env?.DB) return;
  const cutoffMs = Date.now() - retentionDays * 24 * 60 * 60 * 1000;
  const cutoffDay = vetDayKey(cutoffMs);
  await env.DB.batch([
    env.DB.prepare("DELETE FROM listener_samples WHERE ts < ?").bind(cutoffMs),
    env.DB.prepare("DELETE FROM daily_visitors WHERE day < ?").bind(cutoffDay),
  ]);
}
