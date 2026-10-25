import { NextResponse } from "next/server";
import { getCloudflareEnv } from "@/lib/cf-env";
import { vetDayKey } from "@/lib/analytics";

export const dynamic = "force-dynamic";

/**
 * Beacon de visitas y de "play", llamado desde el cliente. Cada aviso trae el
 * canal de la sesión (google, fm, whatsapp...) para saber qué trae oyentes.
 *
 * Se hace desde el navegador y no en el middleware a propósito: así no añade
 * latencia al render y los bots (que no ejecutan JS) quedan fuera, con lo que
 * el número refleja personas reales.
 *
 * Privacidad: no se guarda IP ni user-agent. Solo un hash irreversible de
 * (ip + ua + día + secreto). Como el día entra en el hash, la misma persona
 * produce un identificador distinto cada día y no se puede seguir en el tiempo.
 */
async function visitorHash(ip: string, ua: string, day: string, secret: string): Promise<string> {
  const data = new TextEncoder().encode(`${ip}|${ua}|${day}|${secret}`);
  const digest = await crypto.subtle.digest("SHA-256", data);
  // 16 bytes bastan: colisión despreciable a esta escala y ocupa la mitad.
  return [...new Uint8Array(digest).slice(0, 16)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// Mismo formato que acepta el cliente (traffic-source.ts): nadie puede meter
// texto arbitrario en la tabla.
function cleanSource(value: unknown): string {
  const v = typeof value === "string" ? value.toLowerCase().replace(/[^a-z0-9_-]/g, "").slice(0, 24) : "";
  return v || "directo";
}

const SOURCES_TABLE = `CREATE TABLE IF NOT EXISTS daily_sources (
  day TEXT NOT NULL, source TEXT NOT NULL,
  visits INTEGER NOT NULL DEFAULT 0, plays INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (day, source))`;
// Se crea una vez por isolate: la migración 0009 no se puede aplicar desde
// todas las máquinas que despliegan, y un CREATE IF NOT EXISTS es idempotente.
let sourcesTableReady = false;

interface TrackBody {
  kind?: "pageview" | "play";
  source?: unknown;
  newSession?: unknown;
}

export async function POST(request: Request) {
  const env = getCloudflareEnv();
  if (!env?.DB) return NextResponse.json({ ok: false }, { status: 204 });

  try {
    // Los clientes viejos (caché del navegador) mandan el POST sin cuerpo.
    const body = (await request.json().catch(() => ({}))) as TrackBody;
    const kind = body.kind === "play" ? "play" : "pageview";
    const source = cleanSource(body.source);
    const day = vetDayKey(Date.now());
    const ip =
      request.headers.get("cf-connecting-ip") ??
      request.headers.get("x-forwarded-for") ??
      "unknown";
    const ua = request.headers.get("user-agent") ?? "unknown";

    // Filtro barato de bots declarados, por si alguno ejecuta JS.
    if (/bot|crawler|spider|crawling|headless|preview/i.test(ua)) {
      return new NextResponse(null, { status: 204 });
    }

    const secret = env.AUTH_SECRET || process.env.AUTH_SECRET || "bonchona";
    const vid = await visitorHash(ip, ua, day, secret);

    if (!sourcesTableReady) {
      await env.DB.prepare(SOURCES_TABLE).run();
      sourcesTableReady = true;
    }

    if (kind === "play") {
      await env.DB.prepare(
        `INSERT INTO daily_sources (day, source, plays) VALUES (?, ?, 1)
         ON CONFLICT(day, source) DO UPDATE SET plays = plays + 1`
      ).bind(day, source).run();
      return new NextResponse(null, { status: 204 });
    }

    const statements = [
      env.DB.prepare(
        `INSERT INTO daily_pageviews (day, views) VALUES (?, 1)
         ON CONFLICT(day) DO UPDATE SET views = views + 1`
      ).bind(day),
      env.DB.prepare(
        "INSERT OR IGNORE INTO daily_visitors (day, vid) VALUES (?, ?)"
      ).bind(day, vid),
    ];
    if (body.newSession === true) {
      statements.push(
        env.DB.prepare(
          `INSERT INTO daily_sources (day, source, visits) VALUES (?, ?, 1)
           ON CONFLICT(day, source) DO UPDATE SET visits = visits + 1`
        ).bind(day, source),
      );
    }
    await env.DB.batch(statements);

    return new NextResponse(null, { status: 204 });
  } catch (e) {
    // Nunca romper la navegación por un fallo de métricas.
    console.error("track error:", e);
    return new NextResponse(null, { status: 204 });
  }
}
