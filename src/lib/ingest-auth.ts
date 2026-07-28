import { getCloudflareEnv } from "./cf-env";

/**
 * Comparación en tiempo constante, para no filtrar el token por diferencias
 * de latencia. Compara sobre bytes, no sobre caracteres.
 */
function timingSafeEqual(a: string, b: string): boolean {
  const enc = new TextEncoder();
  const bufA = enc.encode(a);
  const bufB = enc.encode(b);
  // Longitudes distintas: seguimos recorriendo para no cortocircuitar.
  let diff = bufA.length ^ bufB.length;
  const len = Math.max(bufA.length, bufB.length);
  for (let i = 0; i < len; i++) {
    diff |= (bufA[i] ?? 0) ^ (bufB[i] ?? 0);
  }
  return diff === 0;
}

/**
 * Valida el header `Authorization: Bearer <NEWS_INGEST_TOKEN>` que envía n8n.
 * Si el token no está configurado en el entorno, se rechaza todo: preferimos
 * fallar cerrado antes que dejar el endpoint abierto por un despiste de config.
 */
export function verifyIngestToken(request: Request): { ok: true } | { ok: false; error: string } {
  const env = getCloudflareEnv();
  const expected = env?.NEWS_INGEST_TOKEN || process.env.NEWS_INGEST_TOKEN;

  if (!expected) {
    console.error("NEWS_INGEST_TOKEN no configurado; se rechaza el ingest.");
    return { ok: false, error: "Ingest no configurado en el servidor." };
  }

  const header = request.headers.get("authorization") ?? "";
  const match = /^Bearer\s+(.+)$/i.exec(header.trim());
  if (!match) return { ok: false, error: "Falta el header Authorization: Bearer." };

  return timingSafeEqual(match[1].trim(), expected)
    ? { ok: true }
    : { ok: false, error: "Token inválido." };
}
