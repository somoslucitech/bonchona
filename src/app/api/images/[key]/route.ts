import { NextResponse } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ key: string }> }
) {
  const { key } = await params;
  if (!key) {
    return new Response("Missing image key", { status: 400 });
  }

  const decodedKey = decodeURIComponent(key);

  try {
    const context = getCloudflareContext();
    if (context?.env?.IMAGES_BUCKET) {
      const bucket = context.env.IMAGES_BUCKET;
      const object = await bucket.get(decodedKey);
      if (object) {
        const headers = new Headers();
        // R2's Headers/ReadableStream types come from the Workers runtime, not
        // lib.dom's — both describe the same real objects, so a cast is safe here.
        object.writeHttpMetadata(headers as unknown as Parameters<typeof object.writeHttpMetadata>[0]);
        headers.set("etag", object.httpEtag);
        
        // Content-Type según la extensión, solo mapas de bits.
        // SVG queda FUERA a propósito: se serviría desde nuestro dominio y es
        // un documento con scripting, así que un .svg subido equivaldría a
        // XSS almacenado en el origen del sitio.
        let contentType = "image/png";
        const lowerKey = decodedKey.toLowerCase();
        if (lowerKey.endsWith(".jpg") || lowerKey.endsWith(".jpeg")) {
          contentType = "image/jpeg";
        } else if (lowerKey.endsWith(".webp")) {
          contentType = "image/webp";
        } else if (lowerKey.endsWith(".gif")) {
          contentType = "image/gif";
        } else if (lowerKey.endsWith(".avif")) {
          contentType = "image/avif";
        }

        headers.set("Content-Type", contentType);
        // Impide que el navegador ignore el Content-Type y deduzca otro por el
        // contenido, que es como se cuelan los ficheros disfrazados.
        headers.set("X-Content-Type-Options", "nosniff");
        headers.set("Content-Security-Policy", "default-src 'none'; sandbox");
        // Cache images in the browser for 1 week to optimize performance and reduce R2 operations
        headers.set("Cache-Control", "public, max-age=604800, immutable");

        return new Response(object.body as unknown as BodyInit, {
          headers,
        });
      }
    }
  } catch (e) {
    console.error("Error reading image from R2:", e);
  }

  // Fallback: If not found in R2, redirect to /programas/[key] (local development or fallback public assets)
  return NextResponse.redirect(new URL("/programas/" + key, request.url));
}
