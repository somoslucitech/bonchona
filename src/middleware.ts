import { NextResponse, type NextRequest } from "next/server";
import {
  LEGACY_ARTICLE_SLUGS,
  LEGACY_WP_ID_TO_SLUG,
  LEGACY_CATEGORY_MAP,
} from "@/lib/legacy-redirects";

/**
 * Rastro del WordPress viejo.
 *
 * El sitio ya no tiene sección de noticias, así que las ~324 URLs de artículo
 * y sus archivos de categoría dejaron de existir. Responden **410 Gone** y no
 * 404: el 410 le dice al buscador que el contenido se retiró de forma
 * definitiva y lo saca del índice sin volver a intentarlo, mientras que un 404
 * se reintenta durante semanas. Tampoco se redirige todo al inicio, porque
 * Google trata esa redirección masiva como "soft 404" y al visitante que
 * buscaba una nota concreta lo deja perdido.
 *
 * Los mapas se conservan solo para saber QUÉ rutas fueron nuestras: se
 * resuelven en memoria con un lookup O(1), sin tocar la base, para que el
 * tráfico de escáneres no cueste una consulta.
 */

const WP_GONE_PREFIXES = ["/wp-admin", "/wp-content", "/wp-includes", "/wp-json"];
const WP_GONE_EXACT = new Set([
  "/wp-login.php", "/xmlrpc.php", "/wp-cron.php", "/wp-config.php", "/wp-signup.php",
]);

/** Rutas reales del sitio: nunca se tocan. */
const APP_ROUTES = new Set([
  "admin", "api", "estudio", "famoso", "nosotros",
  "_next", "sitemap.xml", "robots.txt", "llms.txt", "favicon.ico",
]);

const gone = () => new NextResponse(null, { status: 410 });

/**
 * Construye la URL destino desde cero en vez de con nextUrl.clone(): el clon
 * recuerda si la URL original traía barra final y se la vuelve a añadir al
 * asignar `pathname`, lo que provocaba un bucle de redirecciones.
 */
function redirectTo(request: NextRequest, pathname: string, status: 301 | 308): NextResponse {
  return NextResponse.redirect(new URL(pathname, request.url), status);
}

export function middleware(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl;

  // Normalizamos la barra final antes de nada: WP servía todo con "/" al final.
  const clean = pathname.length > 1 && pathname.endsWith("/") ? pathname.slice(0, -1) : pathname;
  const hadTrailingSlash = clean !== pathname;
  const segments = clean.split("/").filter(Boolean);

  // Rutas propias: solo replicamos la normalización de barra final que
  // desactivamos en next.config.ts (skipTrailingSlashRedirect).
  if (segments.length > 0 && APP_ROUTES.has(segments[0].toLowerCase())) {
    return hadTrailingSlash ? redirectTo(request, clean, 308) : NextResponse.next();
  }

  // Rastros de instalación de WordPress.
  if (WP_GONE_EXACT.has(pathname) || WP_GONE_PREFIXES.some((p) => pathname.startsWith(p))) {
    return gone();
  }

  // Permalinks tipo /?p=123
  const pid = searchParams.get("p") ?? searchParams.get("page_id");
  if (pid && LEGACY_WP_ID_TO_SLUG.has(pid)) return gone();

  // Feeds, paginación e índices del blog viejo.
  if (segments[segments.length - 1] === "feed") return gone();
  if (segments[0] === "page" && /^\d+$/.test(segments[1] ?? "")) return gone();
  if (["category", "tag", "author"].includes(segments[0] ?? "") && segments[1]) return gone();

  // A partir de aquí solo importan las rutas de UN segmento, que es como WP
  // servía tanto los artículos como los archivos de categoría.
  if (segments.length !== 1) return finish(request, clean, hadTrailingSlash);

  const slug = segments[0].toLowerCase();

  // El slug puede llegar codificado o no según el cliente; las claves del mapa
  // son las de WP (percent-encoded cuando el título traía emoji).
  let decoded = slug;
  try { decoded = decodeURIComponent(slug); } catch { /* ya venía plano */ }
  let encoded = slug;
  try { encoded = encodeURIComponent(decoded).toLowerCase(); } catch { /* sin cambios */ }

  const known = (map: ReadonlyMap<string, string>) =>
    map.has(slug) || map.has(decoded) || map.has(encoded);

  if (known(LEGACY_ARTICLE_SLUGS) || known(LEGACY_CATEGORY_MAP)) return gone();

  return finish(request, clean, hadTrailingSlash);
}

/**
 * Salida por defecto: como desactivamos el 308 de Next, lo replicamos aquí
 * para no dejar dos URLs sirviendo lo mismo (/algo y /algo/).
 */
function finish(request: NextRequest, clean: string, hadTrailingSlash: boolean): NextResponse {
  return hadTrailingSlash ? redirectTo(request, clean, 308) : NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Corre en todo salvo api y assets internos de Next, y salvo rutas con
     * extensión (imágenes, .txt, .xml, favicon) EXCEPTO los .php de WordPress,
     * que sí capturamos para devolver 410.
     */
    "/((?!_next/|api/|[^?]*\\.(?!php)[a-zA-Z0-9]+$).*)",
  ],
};
