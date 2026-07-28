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

function isSafeUrl(value: string, allowRelative = true): boolean {
  const v = value.trim();
  if (!v) return false;
  // Bloquea javascript:, data:, vbscript: y variantes ofuscadas.
  if (/^[a-z0-9.+-]*\s*:/i.test(v)) {
    return /^https?:\/\//i.test(v) || /^mailto:/i.test(v);
  }
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

        if (!ALLOWED_TAGS.has(tag)) {
          // Quita la etiqueta pero conserva su contenido de texto.
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

/** Fallback para runtime Node: elimina scripts/estilos y toda etiqueta no permitida. */
function conservativeStrip(input: string): string {
  return input
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<(script|style|object|embed|form|input|link|meta)[\s\S]*?<\/\1>/gi, "")
    .replace(/<(script|style|object|embed|form|input|link|meta)\b[^>]*\/?>/gi, "")
    .replace(/\son\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "")
    .replace(/\s(href|src)\s*=\s*("\s*javascript:[^"]*"|'\s*javascript:[^']*')/gi, "");
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
