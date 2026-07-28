import { NextResponse, type NextRequest } from "next/server";
import {
  LEGACY_ARTICLE_SLUGS,
  LEGACY_WP_ID_TO_SLUG,
  LEGACY_CATEGORY_MAP,
} from "@/lib/legacy-redirects";

/**
 * Redirects desde el WordPress viejo, que servía los artículos en la raíz del
 * dominio (bonchonaradio.com/titulo-noticia/). Todo eso ya está indexado en
 * Google, así que cada URL antigua tiene que devolver un 301 hacia su
 * equivalente en /noticias/.
 *
 * Se resuelve en middleware con mapas compilados en el bundle (lookup O(1))
 * en vez de consultar D1: un 404 de escáner no debe costar una query, y los
 * sitios WordPress reciben mucho tráfico de bots buscando /wp-login.php.
 * Los mapas son FIJOS: las noticias nuevas nacen en /noticias/... y nunca
 * tienen una URL legacy, así que esto no vuelve a crecer.
 */

const WP_GONE_PREFIXES = ["/wp-admin", "/wp-content", "/wp-includes", "/wp-json"];
const WP_GONE_EXACT = new Set([
  "/wp-login.php", "/xmlrpc.php", "/wp-cron.php", "/wp-config.php", "/wp-signup.php",
]);

/** Rutas reales del sitio: nunca se tocan, aunque coincidieran con un slug. */
const APP_ROUTES = new Set([
  "noticias", "admin", "api", "estudio", "famoso", "nosotros",
  "_next", "sitemap.xml", "robots.txt", "llms.txt", "favicon.ico",
]);

/**
 * Construye la URL destino desde cero en vez de con nextUrl.clone(): el clon
 * recuerda si la URL original traía barra final y se la vuelve a añadir al
 * asignar `pathname`, lo que provocaba un bucle de redirecciones.
 */
function redirectTo(request: NextRequest, pathname: string, status: 301 | 308): NextResponse {
  return NextResponse.redirect(new URL(pathname, request.url), status);
}

function permanent(request: NextRequest, pathname: string): NextResponse {
  return redirectTo(request, pathname, 301);
}

export function middleware(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl;

  // Normalizamos quitando la barra final ANTES de todo: WP servía cada URL
  // con "/" al final, y así el redirect legacy se resuelve en un solo salto
  // en vez de encadenar el 308 de Next con nuestro 301.
  const clean = pathname.length > 1 && pathname.endsWith("/") ? pathname.slice(0, -1) : pathname;
  const hadTrailingSlash = clean !== pathname;
  const segments = clean.split("/").filter(Boolean);

  // Rutas propias del sitio: solo replicamos la normalización de barra final
  // que desactivamos en next.config.ts, y salimos.
  if (segments.length > 0 && APP_ROUTES.has(segments[0].toLowerCase())) {
    if (hadTrailingSlash) {
      return redirectTo(request, clean, 308);
    }
    return NextResponse.next();
  }

  // --- Rastros de WordPress: 410 Gone -------------------------------------
  // Mejor que 404: le dice al crawler que la URL desapareció para siempre y
  // la saque del índice sin reintentos.
  if (WP_GONE_EXACT.has(pathname) || WP_GONE_PREFIXES.some((p) => pathname.startsWith(p))) {
    return new NextResponse(null, { status: 410 });
  }

  // --- Permalinks tipo /?p=123 --------------------------------------------
  const pid = searchParams.get("p") ?? searchParams.get("page_id");
  if (pid && LEGACY_WP_ID_TO_SLUG.has(pid)) {
    return permanent(request, `/noticias/${LEGACY_WP_ID_TO_SLUG.get(pid)}`);
  }

  // --- Feeds ---------------------------------------------------------------
  if (segments[segments.length - 1] === "feed") {
    return permanent(request, "/noticias/feed.xml");
  }

  // --- /page/2 del índice viejo -------------------------------------------
  if (segments[0] === "page" && /^\d+$/.test(segments[1] ?? "")) {
    return permanent(request, segments[1] === "1" ? "/noticias" : `/noticias/pagina/${segments[1]}`);
  }

  // --- /category/x, /tag/x, /author/x -------------------------------------
  if (["category", "tag", "author"].includes(segments[0] ?? "") && segments[1]) {
    return permanent(request, LEGACY_CATEGORY_MAP.get(segments[1]) ?? "/noticias");
  }

  // A partir de aquí solo interesan rutas de UN segmento, que es como WP
  // servía tanto artículos como archivos de categoría.
  if (segments.length !== 1) return finish(request, clean, hadTrailingSlash);

  const slug = segments[0].toLowerCase();

  // El slug puede llegar codificado o decodificado según el cliente. Las
  // claves del mapa son las de WP (percent-encoded en minúsculas cuando el
  // título traía emoji), así que probamos las tres formas.
  let decoded = slug;
  try { decoded = decodeURIComponent(slug); } catch { /* ya venía plano */ }
  let encoded = slug;
  try { encoded = encodeURIComponent(decoded).toLowerCase(); } catch { /* sin cambios */ }

  const lookup = (map: ReadonlyMap<string, string>) =>
    map.get(slug) ?? map.get(decoded) ?? map.get(encoded);

  // --- Artículos -----------------------------------------------------------
  const target = lookup(LEGACY_ARTICLE_SLUGS);
  if (target) {
    return permanent(request, `/noticias/${target}`);
  }

  // --- Archivos de categoría en la raíz ------------------------------------
  // OJO con "programas": era una categoría de WP con 0 posts, y el middleware
  // ensombrece las rutas del filesystem. Si algún día se crea una página
  // /programas real, hay que quitar esa entrada de LEGACY_CATEGORY_MAP.
  const catTarget = lookup(LEGACY_CATEGORY_MAP);
  if (catTarget) {
    return permanent(request, catTarget);
  }

  return finish(request, clean, hadTrailingSlash);
}

/**
 * Salida por defecto: si desactivamos el 308 de Next (skipTrailingSlashRedirect)
 * y la ruta no era legacy, lo replicamos para no dejar dos URLs sirviendo lo
 * mismo (/algo y /algo/).
 */
function finish(request: NextRequest, clean: string, hadTrailingSlash: boolean): NextResponse {
  if (hadTrailingSlash) {
    return redirectTo(request, clean, 308);
  }
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Corre en todo salvo:
     *  - api y assets internos de Next (nunca son URLs legacy ni necesitan
     *    normalización de barra final)
     *  - cualquier ruta con extensión (imágenes, .txt, .xml, favicon), EXCEPTO
     *    los .php de WordPress, que sí capturamos para devolver 410.
     *
     * Las rutas propias del sitio (noticias, admin, estudio...) SÍ entran,
     * porque tras desactivar skipTrailingSlashRedirect el middleware es quien
     * debe normalizar su barra final (ver APP_ROUTES arriba).
     */
    "/((?!_next/|api/|[^?]*\\.(?!php)[a-zA-Z0-9]+$).*)",
  ],
};
