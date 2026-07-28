#!/usr/bin/env node
/**
 * Migración one-shot del WordPress de bonchonaradio.com al sitio nuevo.
 *
 * Carga a través del endpoint de ingest EN VIVO (no por SQL generado), para que
 * el mismo código de sanitización, slug y validación corra tanto para la
 * migración como para n8n. El índice único parcial (source, external_id) hace
 * que re-correr el script sea idempotente.
 *
 * Uso:
 *   node scripts/migrate-wp.mjs --target=http://localhost:8787 --token=XXX [--dry-run] [--limit=10]
 *   node scripts/migrate-wp.mjs --target=https://bonchona.somoslucitech.workers.dev --token=XXX
 *
 * Al terminar escribe src/lib/legacy-redirects.ts con los mapas congelados de
 * redirects 301 (slugs de artículo, id->slug y categorías).
 */

import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, "..");

const WP = "https://bonchonaradio.com";

// --- argumentos -------------------------------------------------------------
const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [k, v] = a.replace(/^--/, "").split("=");
    return [k, v ?? true];
  })
);
const TARGET = (args.target || "").replace(/\/+$/, "");
const TOKEN = args.token || process.env.NEWS_INGEST_TOKEN || "";
const DRY_RUN = Boolean(args["dry-run"]);
const LIMIT = args.limit ? Number(args.limit) : Infinity;

if (!DRY_RUN && (!TARGET || !TOKEN)) {
  console.error("Faltan --target y --token (o define NEWS_INGEST_TOKEN). Usa --dry-run para probar sin escribir.");
  process.exit(1);
}

// --- mapeo de categorías WP -> las 5 que conservamos -------------------------
// Las vacías del theme (Business, Health, Tech, Sports, World...) caen a musica.
const WP_CATEGORY_MAP = {
  29: "musica",
  35: "cosa-valenciana",
  30: "artistas-emergentes",
  31: "pop",
  36: "economia",
};
const FEATURED_CATEGORY_ID = 34; // "Destacadas" pasa a ser flag booleano
const DEFAULT_CATEGORY = "musica";

// Slugs que una noticia jamás puede ocupar (rutas reales del sitio nuevo).
const RESERVED = new Set([
  "", "admin", "api", "estudio", "famoso", "nosotros", "noticias", "programas",
  "logos-bonchona", "sitemap.xml", "robots.txt", "llms.txt", "favicon.ico",
  "categoria", "pagina", "feed.xml", "_next", "og",
]);

// --- helpers ----------------------------------------------------------------

function decodeEntities(s) {
  return String(s ?? "")
    .replace(/&#8217;|&rsquo;/g, "’")
    .replace(/&#8216;|&lsquo;/g, "‘")
    .replace(/&#8220;|&ldquo;/g, "“")
    .replace(/&#8221;|&rdquo;/g, "”")
    .replace(/&hellip;/g, "…")
    .replace(/&mdash;/g, "—")
    .replace(/&ndash;/g, "–")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;|&apos;|&#x27;/g, "'")
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)));
}

function stripTags(html) {
  return decodeEntities(String(html ?? "").replace(/<[^>]+>/g, " "))
    .replace(/\s+/g, " ")
    .trim();
}

async function fetchJson(url, tries = 3) {
  for (let i = 0; i < tries; i++) {
    try {
      const res = await fetch(url, { headers: { "User-Agent": "BonchonaMigration/1.0" } });
      if (res.ok) return await res.json();
      if (res.status === 400 || res.status === 404) return null; // fin de paginación
      console.warn(`  reintento ${i + 1} (${res.status}) ${url}`);
    } catch (e) {
      console.warn(`  reintento ${i + 1} (${e.message}) ${url}`);
    }
    await new Promise((r) => setTimeout(r, 1000 * (i + 1)));
  }
  throw new Error(`No se pudo obtener ${url}`);
}

// --- 1. descargar todos los posts -------------------------------------------

async function fetchAllPosts() {
  // OJO: `featured_media` es OBLIGATORIO en _fields. El plugin UAGB solo
  // calcula uagb_featured_image_src si ese campo está presente en la
  // respuesta; sin él devuelve un array vacío y perderíamos las 324 imágenes.
  const fields = [
    "id", "date_gmt", "modified_gmt", "slug", "link",
    "title", "content", "excerpt", "categories",
    "featured_media", "uagb_featured_image_src", "uagb_author_info",
  ].join(",");

  const all = [];
  for (let page = 1; page <= 50; page++) {
    const url = `${WP}/wp-json/wp/v2/posts?per_page=100&page=${page}&_fields=${fields}`;
    process.stdout.write(`\rDescargando página ${page}... (${all.length} posts)`);
    const batch = await fetchJson(url);
    if (!batch || !Array.isArray(batch) || batch.length === 0) break;
    all.push(...batch);
    if (batch.length < 100) break;
  }
  process.stdout.write("\n");
  return all;
}

// --- 2. normalizar ----------------------------------------------------------

function pickImage(post) {
  const src = post.uagb_featured_image_src;
  if (!src || typeof src !== "object") return { url: null, width: null, height: null };
  // Preferimos 'full'; si no, la variante más grande disponible.
  const candidates = ["full", "2048x2048", "1536x1536", "large", "morenews-large", "medium_large", "medium"];
  for (const key of candidates) {
    const v = src[key];
    if (Array.isArray(v) && typeof v[0] === "string" && v[0].startsWith("http")) {
      return { url: v[0], width: Number(v[1]) || null, height: Number(v[2]) || null };
    }
  }
  return { url: null, width: null, height: null };
}

function pickCategory(post) {
  const ids = Array.isArray(post.categories) ? post.categories : [];
  const featured = ids.includes(FEATURED_CATEGORY_ID);
  // Primera categoría mapeable que no sea "Destacadas".
  for (const id of ids) {
    if (WP_CATEGORY_MAP[id]) return { category: WP_CATEGORY_MAP[id], featured };
  }
  return { category: DEFAULT_CATEGORY, featured };
}

/**
 * Slug limpio para el sitio nuevo. Algunos slugs de WP vienen percent-encoded
 * (títulos con emoji): decodificamos primero para que al normalizar no quede
 * basura tipo "f0-9f-8d-95-...". Debe coincidir con slugify() de src/lib/news.ts.
 */
function cleanSlug(rawSlug) {
  let s = String(rawSlug || "").trim();
  try { s = decodeURIComponent(s); } catch { /* slug no codificado */ }
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "")
    .slice(0, 120);
}

function normalize(post) {
  // El slug VIEJO es la clave del 301 (lo que Google tiene indexado);
  // el nuevo es el que vivirá en /noticias/<slug>.
  const legacySlug = String(post.slug || "").trim().toLowerCase();
  const slug = cleanSlug(legacySlug);
  const title = decodeEntities(post.title?.rendered ?? "").trim();
  const bodyHtml = post.content?.rendered ?? "";
  const excerpt = stripTags(post.excerpt?.rendered ?? "").slice(0, 200);
  const { url: imageUrl, width, height } = pickImage(post);
  const { category, featured } = pickCategory(post);
  const author = post.uagb_author_info?.display_name;

  return {
    externalId: String(post.id),
    slug,
    legacySlug,
    title,
    bodyHtml,
    excerpt,
    imageUrl,
    imageWidth: width,
    imageHeight: height,
    imageAlt: title,
    category,
    featured,
    authorName: (typeof author === "string" && author.trim()) || "Redacción Bonchona",
    publishedAt: post.date_gmt ? Date.parse(`${post.date_gmt}Z`) : Date.now(),
    legacyPath: `/${legacySlug}/`,
    source: "wp-migration",
  };
}

// --- 3. enviar al ingest ----------------------------------------------------

async function ingest(item) {
  const res = await fetch(`${TARGET}/api/news/ingest`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${TOKEN}` },
    body: JSON.stringify(item),
  });
  const text = await res.text();
  let json;
  try { json = JSON.parse(text); } catch { json = { ok: false, error: text.slice(0, 200) }; }
  if (!res.ok || !json.ok) throw new Error(json.error || `HTTP ${res.status}`);
  return json;
}

// --- 4. generar el mapa de redirects ----------------------------------------

function writeLegacyRedirects(items) {
  // slug viejo (lo indexado por Google) -> slug nuevo. Normalmente coinciden,
  // pero difieren cuando el slug de WP venía percent-encoded (emoji).
  const slugPairs = items
    .map((i) => [i.legacySlug, i.slug])
    .sort((a, b) => a[0].localeCompare(b[0]));
  const idToSlug = items.map((i) => [i.externalId, i.slug]).sort((a, b) => Number(a[0]) - Number(b[0]));

  // Archivos de categoría del WP, que también están indexados en la raíz.
  const categoryMap = [
    ["musica", "/noticias/categoria/musica"],
    ["cosa-valenciana", "/noticias/categoria/cosa-valenciana"],
    ["artistas-emergentes", "/noticias/categoria/artistas-emergentes"],
    ["pop", "/noticias/categoria/pop"],
    ["economia", "/noticias/categoria/economia"],
    ["destacadas", "/noticias"],
    // Categorías vacías del theme: al índice, no valen página propia.
    ["business", "/noticias"], ["health", "/noticias"], ["newsbeat", "/noticias"],
    ["science", "/noticias"], ["sports", "/noticias"], ["stories", "/noticias"],
    ["tech", "/noticias"], ["world", "/noticias"], ["uncategorized", "/noticias"],
    ["zona-nam", "/noticias"], ["eventos-bonchona", "/noticias"],
    // OJO: /programas era un archivo de categoría WP con 0 posts. La home ya
    // tiene la parrilla. Si algún día se crea una página /programas real, hay
    // que BORRAR esta entrada: el middleware ensombrece las rutas del filesystem.
    ["programas", "/"],
  ];

  const out = `// GENERADO POR scripts/migrate-wp.mjs — NO EDITAR A MANO.
// Mapas congelados de redirects 301 desde el WordPress viejo. El set es
// definitivo: las noticias nuevas nacen en /noticias/... y nunca tienen
// una URL legacy, así que esto no vuelve a crecer.
// Generado: ${new Date().toISOString()}

export const MIGRATION_GENERATED_AT = ${JSON.stringify(new Date().toISOString())};

/**
 * Slug viejo (raíz del dominio en WP) -> slug nuevo (bajo /noticias/).
 * Casi siempre son iguales; difieren cuando WP guardó el slug percent-encoded.
 */
export const LEGACY_ARTICLE_SLUGS: ReadonlyMap<string, string> = new Map(${JSON.stringify(slugPairs, null, 0)});

/** Permalinks tipo /?p=123 */
export const LEGACY_WP_ID_TO_SLUG: ReadonlyMap<string, string> = new Map(${JSON.stringify(idToSlug, null, 0)});

/** Archivos de categoría, también indexados en la raíz. */
export const LEGACY_CATEGORY_MAP: ReadonlyMap<string, string> = new Map(${JSON.stringify(categoryMap, null, 0)});
`;

  const target = resolve(REPO_ROOT, "src/lib/legacy-redirects.ts");
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, out, "utf8");
  const renamed = slugPairs.filter(([oldS, newS]) => oldS !== newS);
  console.log(`\nEscrito src/lib/legacy-redirects.ts (${slugPairs.length} slugs, ${idToSlug.length} ids)`);
  if (renamed.length) {
    console.log(`  ${renamed.length} slug(s) renombrados (venían percent-encoded):`);
    renamed.forEach(([o, n]) => console.log(`    ${o.slice(0, 50)}  ->  ${n.slice(0, 50)}`));
  }
}

// --- main -------------------------------------------------------------------

async function main() {
  console.log(`Migrando desde ${WP}${DRY_RUN ? "  [DRY RUN]" : `  ->  ${TARGET}`}\n`);

  const posts = await fetchAllPosts();
  console.log(`Descargados ${posts.length} posts publicados.\n`);

  const items = posts.map(normalize);

  // --- validaciones que abortan ---
  const problems = [];
  const seen = new Map();
  const seenLegacy = new Map();
  for (const it of items) {
    if (!it.slug) problems.push(`post ${it.externalId}: slug vacío tras normalizar ("${it.legacySlug}")`);
    if (RESERVED.has(it.slug)) problems.push(`post ${it.externalId}: slug reservado "${it.slug}"`);
    if (RESERVED.has(it.legacySlug)) problems.push(`post ${it.externalId}: slug legacy reservado "${it.legacySlug}"`);
    if (it.slug.includes("/")) problems.push(`post ${it.externalId}: slug con barra "${it.slug}"`);
    // Un slug nuevo duplicado rompería el UNIQUE de la tabla.
    if (seen.has(it.slug)) problems.push(`slug nuevo duplicado "${it.slug}" (posts ${seen.get(it.slug)} y ${it.externalId})`);
    seen.set(it.slug, it.externalId);
    // Un slug viejo duplicado rompería el mapa de redirects.
    if (seenLegacy.has(it.legacySlug)) problems.push(`slug legacy duplicado "${it.legacySlug}"`);
    seenLegacy.set(it.legacySlug, it.externalId);
    if (!it.title) problems.push(`post ${it.externalId}: sin título`);
  }
  if (problems.length) {
    console.error("ABORTADO. Problemas encontrados:\n" + problems.map((p) => "  - " + p).join("\n"));
    process.exit(1);
  }
  console.log("Validación OK: sin slugs reservados, duplicados ni vacíos.");

  const withImage = items.filter((i) => i.imageUrl).length;
  const dates = items.map((i) => i.publishedAt).sort((a, b) => a - b);
  console.log(`  con imagen: ${withImage}/${items.length}`);
  console.log(`  rango de fechas: ${new Date(dates[0]).toISOString().slice(0, 10)} -> ${new Date(dates[dates.length - 1]).toISOString().slice(0, 10)}`);
  const byCat = {};
  for (const i of items) byCat[i.category] = (byCat[i.category] ?? 0) + 1;
  console.log(`  por categoría:`, byCat);
  console.log(`  destacadas: ${items.filter((i) => i.featured).length}\n`);

  writeLegacyRedirects(items);

  if (DRY_RUN) {
    console.log("\nDRY RUN: no se escribió nada en la base. Ejemplo del primer item:");
    const s = { ...items[0] };
    s.bodyHtml = s.bodyHtml.slice(0, 160) + "...";
    console.log(s);
    return;
  }

  // --- carga secuencial (cada ingest descarga y sube una imagen a R2) ---
  let ok = 0, failed = 0;
  const failures = [];
  const toLoad = items.slice(0, LIMIT);
  for (const [idx, item] of toLoad.entries()) {
    try {
      const r = await ingest(item);
      ok++;
      process.stdout.write(`\r[${idx + 1}/${toLoad.length}] ok=${ok} fail=${failed}  ${r.slug.slice(0, 45)}`.padEnd(100));
    } catch (e) {
      failed++;
      failures.push({ id: item.externalId, slug: item.slug, error: e.message });
      process.stdout.write(`\r[${idx + 1}/${toLoad.length}] ok=${ok} fail=${failed}  FALLO ${item.slug.slice(0, 40)}`.padEnd(100));
    }
  }

  console.log(`\n\nListo. Migradas ${ok}, fallidas ${failed}.`);
  if (failures.length) {
    console.log("\nFallos:");
    failures.forEach((f) => console.log(`  ${f.id} ${f.slug}: ${f.error}`));
    process.exitCode = 1;
  }
}

main().catch((e) => {
  console.error("\nError fatal:", e);
  process.exit(1);
});
