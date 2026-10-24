// El id de un programa es también su URL pública (/programas/<id>), así que
// se genera una sola vez al crearlo y no cambia si luego se edita el título:
// renombrar un programa no debe romper los enlaces que ya circulan.

export function slugifyProgramTitle(title: string): string {
  return title
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // "¿Qué pasó?" -> "Que paso", no "qu-pas"
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

/** Id libre para un programa nuevo: el slug del título, con sufijo si ya existe. */
export function newProgramId(title: string, existingIds: string[]): string {
  const base = slugifyProgramTitle(title) || "programa";
  const taken = new Set(existingIds);
  if (!taken.has(base)) return base;
  let n = 2;
  while (taken.has(`${base}-${n}`)) n++;
  return `${base}-${n}`;
}

export function programPath(id: string): string {
  return `/programas/${encodeURIComponent(id)}`;
}

// Los cuatro banners de fábrica tienen una copia de 800 px para las tarjetas
// (miden ~400 px de ancho): la de 1600 px tardaba en llegar por 4G y era el
// LCP de /programas. Las imágenes subidas desde el admin se usan tal cual.
const STOCK_BANNER = /^\/programas\/(que_paso_ayer|mucha_pipol|te_lo_dije|favoritas)\.webp$/;

export function bannerThumb(banner: string): string {
  return banner.replace(STOCK_BANNER, "/programas/$1-800.webp");
}
