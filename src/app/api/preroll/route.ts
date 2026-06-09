import { NextResponse } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";

export async function GET() {
  try {
    const context = getCloudflareContext();
    if (context?.env?.PREROLL_BUCKET) {
      const bucket = context.env.PREROLL_BUCKET;
      const object = await bucket.get("preroll.mp3");
      if (object) {
        const headers = new Headers();
        object.writeHttpMetadata(headers);
        headers.set("etag", object.httpEtag);
        headers.set("Content-Type", "audio/mpeg");
        // Avoid caching the dynamic preroll to ensure updates are immediate
        headers.set("Cache-Control", "no-cache, no-store, must-revalidate");
        
        return new Response(object.body, {
          headers,
        });
      }
    }
  } catch (e) {
    console.error("Error reading from R2:", e);
  }

  // Fallback to Pixabay default preroll
  return NextResponse.redirect("https://cdn.pixabay.com/audio/2022/10/14/audio_9939f77042.mp3");
}
