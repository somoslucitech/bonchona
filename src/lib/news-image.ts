import { getCloudflareEnv } from "./cf-env";

const MAX_IMAGE_BYTES = 8 * 1024 * 1024; // 8 MB

const EXT_BY_MIME: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/avif": "avif",
};

export interface StoredImage {
  /** Ruta pública servida por /api/images/[key] */
  url: string;
  width: number | null;
  height: number | null;
}

/**
 * Descarga una imagen remota y la guarda en R2 con clave PLANA
 * (`news-<slug>.<ext>`): /api/images/[key] es un segmento dinámico simple y no
 * puede servir claves que contengan "/".
 */
export async function storeRemoteImage(
  imageUrl: string,
  slug: string,
  dims?: { width?: number | null; height?: number | null }
): Promise<StoredImage | null> {
  const env = getCloudflareEnv();
  if (!env?.IMAGES_BUCKET) {
    console.warn("IMAGES_BUCKET no disponible; se conserva la URL remota.");
    return { url: imageUrl, width: dims?.width ?? null, height: dims?.height ?? null };
  }

  try {
    const res = await fetch(imageUrl, { headers: { "User-Agent": "BonchonaBot/1.0" } });
    if (!res.ok) {
      console.error("No se pudo descargar la imagen:", imageUrl, res.status);
      return null;
    }

    const contentType = (res.headers.get("content-type") ?? "").split(";")[0].trim().toLowerCase();
    const ext = EXT_BY_MIME[contentType];
    if (!ext) {
      console.error("Tipo de imagen no soportado:", contentType, imageUrl);
      return null;
    }

    const buffer = await res.arrayBuffer();
    if (buffer.byteLength === 0 || buffer.byteLength > MAX_IMAGE_BYTES) {
      console.error("Imagen vacía o demasiado grande:", buffer.byteLength, imageUrl);
      return null;
    }

    const key = `news-${slug}.${ext}`;
    await env.IMAGES_BUCKET.put(key, buffer, {
      httpMetadata: { contentType },
    });

    return {
      url: `/api/images/${key}`,
      width: dims?.width ?? null,
      height: dims?.height ?? null,
    };
  } catch (e) {
    console.error("Error guardando imagen en R2:", imageUrl, e);
    return null;
  }
}
