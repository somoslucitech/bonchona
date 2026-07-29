import { NextResponse } from "next/server";
import { getCloudflareEnv } from "@/lib/cf-env";
import { getSession } from "@/lib/auth";
import { getDemo } from "@/lib/demos";

export const dynamic = "force-dynamic";

/**
 * Descarga de un demo. SIEMPRE requiere sesión del panel: son canciones
 * inéditas de terceros, no pueden quedar accesibles con solo adivinar una URL.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Acceso no autorizado." }, { status: 401 });
  }

  const { id } = await params;
  const demo = await getDemo(id);
  if (!demo) {
    return NextResponse.json({ error: "Demo no encontrado." }, { status: 404 });
  }

  const env = getCloudflareEnv();
  if (!env?.DEMOS_BUCKET) {
    return NextResponse.json({ error: "Almacenamiento no disponible." }, { status: 503 });
  }

  const object = await env.DEMOS_BUCKET.get(demo.fileKey);
  if (!object) {
    return NextResponse.json({ error: "El archivo ya no está disponible." }, { status: 404 });
  }

  // Nombre amable al guardar: "Artista - Tema.mp3"
  const safeName = `${demo.artistName} - ${demo.trackTitle}`
    .replace(/[^\w\s.-]/g, "")
    .trim()
    .slice(0, 100);

  const headers = new Headers();
  headers.set("Content-Type", "audio/mpeg");
  headers.set("Content-Disposition", `attachment; filename="${safeName || "demo"}.mp3"`);
  // Material privado: que no quede en ninguna caché intermedia.
  headers.set("Cache-Control", "private, no-store");

  return new Response(object.body as unknown as BodyInit, { headers });
}
