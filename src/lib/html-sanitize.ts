import type {
  HTMLRewriter as HTMLRewriterType,
  Element as CfElement,
  Comment as CfComment,
} from "@cloudflare/workers-types";

// Sanitización de HTML con allowlist, ejecutada UNA sola vez al escribir
// (ingest de n8n, migración de WP, edición en el admin) y nunca al leer.
// En producción usa HTMLRewriter, el parser streaming nativo de Workers:
// cero dependencias y cero costo de bundle.

const ALLOWED_TAGS = new Set([
  "p", "br", "hr",
  "h2", "h3", "h4",
  "strong", "b", "em", "i", "u", "s", "mark", "small", "sub", "sup",
  "ul", "ol", "li",
  "blockquote", "cite", "q",
  "a", "img", "figure", "figcaption",
  "iframe", // embeds de YouTube/Spotify — dominio restringido más abajo
  "table", "thead", "tbody", "tr", "th", "td",
  "code", "pre",
  "span", "div",
]);

// Atributos permitidos por etiqueta. Todo lo demás se elimina, lo que descarta
// de raíz cualquier on* (onclick, onerror, ...) y style.
const ALLOWED_ATTRS: Record<string, Set<string>> = {
  a: new Set(["href", "title", "target", "rel"]),
  img: new Set(["src", "alt", "title", "width", "height", "loading"]),
  iframe: new Set(["src", "title", "width", "height", "allow", "allowfullscreen", "frameborder"]),
  th: new Set(["colspan", "rowspan"]),
  td: new Set(["colspan", "rowspan"]),
};

// Solo se permiten embeds de plataformas conocidas.
const ALLOWED_IFRAME_HOSTS = [
  "www.youtube.com", "youtube.com", "www.youtube-nocookie.com", "youtube-nocookie.com",
  "open.spotify.com",
  "w.soundcloud.com",
  "player.vimeo.com",
];

/**
 * Etiquetas que hay que borrar CON su contenido, nunca con
 * removeAndKeepContent().
 *
 * El interior de estos elementos es "texto crudo" para el parser: lo que hay
 * dentro no es marcado. Si se les quita solo la etiqueta envolvente, ese texto
 * se re-serializa tal cual y pasa a ser marcado VIVO, así que
 * `<textarea><img onerror=...></textarea>` se convertiría en un <img> real.
 */
const DROP_WITH_CONTENT = new Set([
  "script", "style", "textarea", "title", "noscript", "xmp", "plaintext",
  "svg", "math", "object", "embed", "applet", "canvas",
  "form", "input", "button", "select", "option", "optgroup", "label",
  "link", "meta", "base", "frame", "frameset", "template", "noembed", "noframes",
]);

function safeFromCodePoint(cp: number): string {
  return Number.isFinite(cp) && cp >= 0 && cp <= 0x10ffff ? String.fromCodePoint(cp) : "";
}

/**
 * Normaliza una URL como lo hace el navegador ANTES de resolver el esquema:
 * decodifica entidades y elimina caracteres de control y espacios.
 *
 * Sin esto, `&#106;avascript:` o `java<TAB>script:` no parecen tener esquema,
 * se toman por relativas y pasan el filtro, pero el navegador sí las resuelve
 * como javascript: y las ejecuta.
 */
function normalizeUrlForCheck(value: string): string {
  const decoded = value
    .replace(/&#x([0-9a-f]+);?/gi, (_, h) => safeFromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);?/g, (_, d) => safeFromCodePoint(Number(d)))
    .replace(/&colon;?/gi, ":")
    .replace(/&tab;?/gi, "\t")
    .replace(/&newline;?/gi, "\n")
    .replace(/&amp;?/gi, "&");

  // Fuera controles y espacios (<= U+0020 y U+007F): el navegador los ignora
  // al resolver el esquema. Se filtra por code point para no meter
  // caracteres de control literales en el código fuente.
  let out = "";
  for (const ch of decoded) {
    const cp = ch.codePointAt(0) ?? 0;
    if (cp > 0x20 && cp !== 0x7f) out += ch;
  }
  return out;
}

const SAFE_PROTOCOLS = new Set(["http", "https", "mailto"]);

/**
 * Allowlist de esquemas sobre el valor ya normalizado. Se valida la forma
 * normalizada (la que verá el navegador) pero se conserva el valor original,
 * porque normalizar solo QUITA ruido: si lo limpio resulta inofensivo, lo
 * original también lo es.
 */
function isSafeUrl(value: string, allowRelative = true): boolean {
  const v = normalizeUrlForCheck(value).trim();
  if (!v) return false;

  const scheme = /^([a-z0-9.+-]+):/i.exec(v);
  if (scheme) return SAFE_PROTOCOLS.has(scheme[1].toLowerCase());

  // Sin esquema: es una ruta relativa o protocol-relative (//host/...).
  return allowRelative;
}

function isAllowedIframeSrc(value: string): boolean {
  try {
    const url = new URL(value, "https://bonchonaradio.com");
    return url.protocol === "https:" && ALLOWED_IFRAME_HOSTS.includes(url.hostname);
  } catch {
    return false;
  }
}

/**
 * Sanitiza un fragmento HTML. Devuelve HTML listo para renderizar con
 * dangerouslySetInnerHTML.
 */
export async function sanitizeHtml(input: string): Promise<string> {
  if (!input) return "";

  const Rewriter = (globalThis as unknown as {
    HTMLRewriter?: new () => HTMLRewriterType;
  }).HTMLRewriter;
  if (!Rewriter) {
    // Fuera del runtime de Workers (next dev en Node) caemos a un strip
    // conservador. Suficiente para desarrollo; en producción siempre corre
    // la rama de arriba.
    console.warn(
      "[html-sanitize] HTMLRewriter no disponible (runtime Node). Usando strip conservador; " +
      "el resultado será más pobre que en producción."
    );
    return conservativeStrip(input);
  }

  const rewriter = new Rewriter()
    .on("*", {
      element(el: CfElement) {
        const tag = el.tagName.toLowerCase();

        if (DROP_WITH_CONTENT.has(tag)) {
          // Se van enteras. Ver el comentario de DROP_WITH_CONTENT: usar
          // removeAndKeepContent() aquí convertiría su texto crudo en marcado
          // ejecutable.
          el.remove();
          return;
        }

        if (!ALLOWED_TAGS.has(tag)) {
          // Etiqueta de contenido normal que no está permitida: quitamos la
          // etiqueta y dejamos lo de dentro, que el parser ya trató como
          // marcado y por tanto ya pasó por este mismo filtro.
          el.removeAndKeepContent();
          return;
        }

        const allowed = ALLOWED_ATTRS[tag] ?? new Set<string>();
        for (const [name] of [...el.attributes]) {
          const attr = name.toLowerCase();
          if (!allowed.has(attr)) {
            el.removeAttribute(name);
            continue;
          }

          const value = el.getAttribute(name) ?? "";
          if ((attr === "href" || attr === "src") && !isSafeUrl(value)) {
            el.removeAttribute(name);
          }
        }

        if (tag === "iframe") {
          const src = el.getAttribute("src") ?? "";
          if (!isAllowedIframeSrc(src)) {
            el.remove(); // embed de origen desconocido: fuera con contenido incluido
            return;
          }
        }

        if (tag === "a") {
          const href = el.getAttribute("href") ?? "";
          if (/^https?:\/\//i.test(href)) {
            el.setAttribute("target", "_blank");
            el.setAttribute("rel", "noopener noreferrer nofollow");
          }
        }

        if (tag === "img") {
          el.setAttribute("loading", "lazy");
        }
      },
      comments(c: CfComment) {
        c.remove(); // fuera los comentarios de bloque de WordPress
      },
    });

  // El Response de lib.dom y el del runtime de Workers describen el mismo
  // objeto real; los tipos difieren nada más (webSocket/cf).
  const res = rewriter.transform(
    new Response(input) as unknown as Parameters<typeof rewriter.transform>[0]
  );
  return await res.text();
}

/**
 * Fallback para runtime Node (solo `next dev`). En producción siempre corre
 * HTMLRewriter. Borra con su contenido las mismas etiquetas que
 * DROP_WITH_CONTENT y desactiva href/src que no sean http(s)/mailto.
 */
function conservativeStrip(input: string): string {
  const drop = [...DROP_WITH_CONTENT].join("|");
  return input
    .replace(/<!--[\s\S]*?-->/g, "")
    // Con contenido incluido, y también la variante sin cerrar.
    .replace(new RegExp(`<(${drop})\\b[\\s\\S]*?<\\/\\1\\s*>`, "gi"), "")
    .replace(new RegExp(`<\\/?(${drop})\\b[^>]*>`, "gi"), "")
    .replace(/\son\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "")
    // Reutiliza la misma validación de esquema que la rama de Workers.
    .replace(/\s(href|src)\s*=\s*"([^"]*)"/gi, (m, a, v) => (isSafeUrl(v) ? m : ""))
    .replace(/\s(href|src)\s*=\s*'([^']*)'/gi, (m, a, v) => (isSafeUrl(v) ? m : ""));
}

/**
 * Proyección a texto plano del HTML ya sanitizado. Alimenta el extracto,
 * la búsqueda del admin, word_count y reading_minutes, para no tener que
 * parsear HTML en cada lectura.
 */
export function htmlToText(html: string): string {
  return html
    .replace(/<(script|style)[\s\S]*?<\/\1>/gi, "")
    .replace(/<\/(p|div|h[1-6]|li|blockquote|tr)>/gi, "\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#0?39;|&apos;|&#x27;/gi, "'")
    .replace(/&#8217;|&rsquo;/gi, "’")
    .replace(/&#8220;|&ldquo;/gi, "“")
    .replace(/&#8221;|&rdquo;/gi, "”")
    .replace(/&hellip;/gi, "…")
    .replace(/&mdash;/gi, "—")
    .replace(/&ndash;/gi, "–")
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function countWords(text: string): number {
  const t = text.trim();
  return t ? t.split(/\s+/).length : 0;
}

/** ~200 palabras por minuto, mínimo 1. */
export function readingMinutes(wordCount: number): number {
  return Math.max(1, Math.round(wordCount / 200));
}

/** Extracto en texto plano para cards y meta description. */
export function buildExcerpt(text: string, maxLen = 200): string {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= maxLen) return clean;
  const cut = clean.slice(0, maxLen);
  const lastSpace = cut.lastIndexOf(" ");
  return (lastSpace > maxLen * 0.6 ? cut.slice(0, lastSpace) : cut).trimEnd() + "…";
}
