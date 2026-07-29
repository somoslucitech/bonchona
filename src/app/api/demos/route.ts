import { NextResponse } from "next/server";
import { getCloudflareEnv } from "@/lib/cf-env";
import {
  createDemo, countRecentByIp, MAX_DEMO_BYTES, ALLOWED_AUDIO_TYPES,
  MAX_SUBMISSIONS_PER_DAY, formatBytes,
} from "@/lib/demos";
import { sendDemoNotification } from "@/lib/email";

export const dynamic = "force-dynamic";

async function hashIp(ip: string, secret: string): Promise<string> {
  const data = new TextEncoder().encode(`demo|${ip}|${secret}`);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(digest).slice(0, 16)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function clean(v: FormDataEntryValue | null, max = 200): string {
  return typeof v === "string" ? v.trim().slice(0, max) : "";
}

/** Nombre de archivo seguro y único para R2. */
function buildKey(artistName: string, trackTitle: string, ext: string): string {
  const slug = (s: string) =>
    s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase()
      .replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)+/g, "").slice(0, 40);
  const stamp = new Date().toISOString().slice(0, 10);
  const rand = crypto.randomUUID().slice(0, 8);
  return `${stamp}-${slug(artistName) || "artista"}-${slug(trackTitle) || "tema"}-${rand}.${ext}`;
}

export async function POST(request: Request) {
  const env = getCloudflareEnv();

  try {
    const form = await request.formData();

    // Honeypot: campo invisible que solo rellenan los bots. Respondemos
    // "ok" para no darles pistas de que fueron detectados.
    if (clean(form.get("website"))) {
      return NextResponse.json({ ok: true });
    }

    const firstName = clean(form.get("firstName"), 80);
    const lastName = clean(form.get("lastName"), 80);
    const artistName = clean(form.get("artistName"), 80);
    const email = clean(form.get("email"), 120);
    const trackTitle = clean(form.get("trackTitle"), 120);
    const rightsConfirmed = form.get("rightsConfirmed") === "true";

    const missing: string[] = [];
    if (!firstName) missing.push("nombre");
    if (!lastName) missing.push("apellido");
    if (!artistName) missing.push("nombre artístico");
    if (!email) missing.push("correo");
    if (!trackTitle) missing.push("título del tema");
    if (missing.length) {
      return NextResponse.json(
        { ok: false, error: `Falta completar: ${missing.join(", ")}.` },
        { status: 400 }
      );
    }
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      return NextResponse.json({ ok: false, error: "El correo no parece válido." }, { status: 400 });
    }
    if (!rightsConfirmed) {
      return NextResponse.json(
        { ok: false, error: "Debes confirmar que la canción es tuya y autorizas transmitirla." },
        { status: 400 }
      );
    }

    const file = form.get("demo");
    if (!(file instanceof File) || file.size === 0) {
      return NextResponse.json({ ok: false, error: "Adjunta tu canción en MP3." }, { status: 400 });
    }
    if (file.size > MAX_DEMO_BYTES) {
      return NextResponse.json(
        { ok: false, error: `El archivo pesa ${formatBytes(file.size)}. El máximo es ${formatBytes(MAX_DEMO_BYTES)}.` },
        { status: 400 }
      );
    }
    const type = (file.type || "").toLowerCase();
    if (!ALLOWED_AUDIO_TYPES.includes(type) && !file.name.toLowerCase().endsWith(".mp3")) {
      return NextResponse.json({ ok: false, error: "Solo aceptamos archivos MP3." }, { status: 400 });
    }

    // Límite por IP: la IP no se guarda, solo su hash.
    const ip =
      request.headers.get("cf-connecting-ip") ??
      request.headers.get("x-forwarded-for") ??
      "unknown";
    const secret = env?.AUTH_SECRET || process.env.AUTH_SECRET || "bonchona";
    const ipHash = await hashIp(ip, secret);

    const recent = await countRecentByIp(ipHash);
    if (recent >= MAX_SUBMISSIONS_PER_DAY) {
      return NextResponse.json(
        { ok: false, error: "Ya enviaste varios demos hoy. Inténtalo de nuevo mañana." },
        { status: 429 }
      );
    }

    if (!env?.DEMOS_BUCKET) {
      return NextResponse.json(
        { ok: false, error: "El almacenamiento no está disponible ahora mismo." },
        { status: 503 }
      );
    }

    const fileKey = buildKey(artistName, trackTitle, "mp3");
    await env.DEMOS_BUCKET.put(fileKey, await file.arrayBuffer(), {
      httpMetadata: { contentType: "audio/mpeg" },
    });

    const id = await createDemo({
      firstName, lastName, artistName, email,
      whatsapp: clean(form.get("whatsapp"), 40) || undefined,
      trackTitle,
      genre: clean(form.get("genre"), 60) || undefined,
      city: clean(form.get("city"), 80) || undefined,
      instagram: clean(form.get("instagram"), 120) || undefined,
      spotify: clean(form.get("spotify"), 200) || undefined,
      message: clean(form.get("message"), 800) || undefined,
      fileKey,
      fileName: file.name.slice(0, 160),
      fileSize: file.size,
      rightsConfirmed,
      ipHash,
    });

    // El aviso por correo no debe bloquear ni tumbar el envío del artista.
    try {
      const origin = new URL(request.url).origin;
      await sendDemoNotification({
        artistName, firstName, lastName, email,
        whatsapp: clean(form.get("whatsapp"), 40),
        trackTitle,
        genre: clean(form.get("genre"), 60),
        city: clean(form.get("city"), 80),
        adminUrl: `${origin}/admin`,
      });
    } catch (e) {
      console.error("No se pudo enviar el aviso del demo:", e);
    }

    return NextResponse.json({ ok: true, id });
  } catch (e) {
    console.error("Error recibiendo demo:", e);
    return NextResponse.json(
      { ok: false, error: "No pudimos recibir tu demo. Intenta de nuevo." },
      { status: 500 }
    );
  }
}
