import type { MetadataRoute } from "next";

// Hace instalable el sitio ("Agregar a la pantalla de inicio"): abre a pantalla
// completa, con ícono propio, directo al reproductor. start_url lleva
// utm_source=app para que el panel cuente cuánta gente entra desde el ícono.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Bonchona 107.1 FM",
    short_name: "Bonchona",
    description: "Radio Bonchona 107.1 FM en vivo desde Valencia, Venezuela. Sintonía Total.",
    lang: "es-VE",
    start_url: "/?utm_source=app",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#0A0B1E",
    theme_color: "#0A0B1E",
    categories: ["music", "entertainment"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
