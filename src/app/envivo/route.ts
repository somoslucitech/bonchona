import { NextResponse } from "next/server";

// Dirección corta para decir al aire: "escúchanos en bonchonaradio.com/envivo".
// Lleva al inicio marcando la visita como llegada desde la FM, para poder
// medir cuánto trae la mención de los locutores. Es una redirección temporal
// (307) a propósito: /envivo no es una página que deba indexarse.
export function GET(request: Request) {
  const target = new URL("/", request.url);
  target.searchParams.set("utm_source", "fm");
  target.searchParams.set("utm_medium", "aire");
  return NextResponse.redirect(target, 307);
}
