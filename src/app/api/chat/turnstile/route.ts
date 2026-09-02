import { NextResponse } from "next/server";
import { getCloudflareEnv } from "@/lib/cf-env";

export const dynamic = "force-dynamic";

/** 5 minutos. Cambiar la clave se propaga solo, sin recompilar ni redesplegar. */
const CACHE_SECONDS = 300;

/**
 * Clave pública del widget de Turnstile.
 *
 * Se sirve en tiempo de ejecución y no como `NEXT_PUBLIC_*` a propósito. Las
 * variables `NEXT_PUBLIC_` se incrustan en el bundle durante `next build`, que
 * corre en la máquina de quien despliega: configurarla en el panel de Cloudflare
 * no llegaría nunca al navegador, y el fallo sería silencioso. Leyéndola aquí,
 * la clave vive junto al resto de la configuración del Worker.
 *
 * No es un secreto: aparece en el HTML de cualquier página con el widget. El
 * que sí lo es, TURNSTILE_SECRET, jamás sale del servidor.
 */
export async function GET() {
  const env = getCloudflareEnv();
  const siteKey =
    env?.TURNSTILE_SITE_KEY ||
    process.env.TURNSTILE_SITE_KEY ||
    // Respaldo de desarrollo: las claves de prueba viven en .env.local.
    process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ||
    "";

  return NextResponse.json(
    { siteKey },
    {
      headers: {
        "Cache-Control": `public, max-age=${CACHE_SECONDS}, s-maxage=${CACHE_SECONDS}`,
      },
    }
  );
}
