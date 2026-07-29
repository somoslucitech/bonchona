import { NextResponse } from "next/server";
import { getCloudflareEnv } from "@/lib/cf-env";
import { vetDayKey } from "@/lib/analytics";

export const dynamic = "force-dynamic";

/**
 * Beacon de visitas, llamado desde el cliente.
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

export async function POST(request: Request) {
  const env = getCloudflareEnv();
  if (!env?.DB) return NextResponse.json({ ok: false }, { status: 204 });

  try {
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

    await env.DB.batch([
      env.DB.prepare(
        `INSERT INTO daily_pageviews (day, views) VALUES (?, 1)
         ON CONFLICT(day) DO UPDATE SET views = views + 1`
      ).bind(day),
      env.DB.prepare(
        "INSERT OR IGNORE INTO daily_visitors (day, vid) VALUES (?, ?)"
      ).bind(day, vid),
    ]);

    return new NextResponse(null, { status: 204 });
  } catch (e) {
    // Nunca romper la navegación por un fallo de métricas.
    console.error("track error:", e);
    return new NextResponse(null, { status: 204 });
  }
}
