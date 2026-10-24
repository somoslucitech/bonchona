// Parte de la máscara de temporada sin hooks, para que layout.tsx (servidor)
// pueda importar el script de arranque. Los hooks viven en season.ts.

// Máscara de temporada del sitio. Se activa sola por fecha (SEASON_CALENDAR)
// y se puede forzar con ?temporada=halloween|navidad|ninguna para previsualizar.
export type Season = "ninguna" | "halloween" | "navidad";

// Fechas "MM-DD", ambas inclusive, en hora de Venezuela. Se repiten cada año.
export const SEASON_CALENDAR: { season: Season; from: string; to: string }[] = [
  { season: "halloween", from: "10-26", to: "10-31" },
  { season: "navidad", from: "12-01", to: "12-31" },
];

export const SEASON_TIMEZONE = "America/Caracas";
export const SEASON_STORAGE_KEY = "bonchona-temporada";

export function parseSeason(value: string | null | undefined): Season | null {
  return value === "halloween" || value === "navidad" || value === "ninguna" ? value : null;
}

// Script en línea para el <head>: pone data-season antes del primer pintado,
// así no se ve un parpadeo con los colores normales. Repite la lógica de
// resolveSeason() porque corre antes de que cargue React.
export const seasonBootScript = `(function(){try{
var q=new URLSearchParams(location.search).get("temporada"),s=null,k=${JSON.stringify(SEASON_STORAGE_KEY)};
var ok=function(v){return v==="halloween"||v==="navidad"||v==="ninguna"};
if(ok(q)){s=q;try{sessionStorage.setItem(k,q)}catch(e){}}
else{try{var st=sessionStorage.getItem(k);if(ok(st))s=st}catch(e){}}
if(!s){var d=new Intl.DateTimeFormat("en-CA",{timeZone:${JSON.stringify(SEASON_TIMEZONE)}}).format(new Date()).slice(5);
var c=${JSON.stringify(SEASON_CALENDAR)};s="ninguna";
for(var i=0;i<c.length;i++){if(d>=c[i].from&&d<=c[i].to){s=c[i].season;break}}}
if(s!=="ninguna")document.documentElement.dataset.season=s;
}catch(e){}})();`;

export function seasonForDate(date: Date): Season {
  const mmdd = new Intl.DateTimeFormat("en-CA", { timeZone: SEASON_TIMEZONE }).format(date).slice(5);
  return SEASON_CALENDAR.find((s) => mmdd >= s.from && mmdd <= s.to)?.season ?? "ninguna";
}
