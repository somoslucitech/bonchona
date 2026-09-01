import type { NextConfig } from "next";
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

// Da a `next dev` los bindings reales de wrangler (D1, R2, KV) a traves de
// miniflare. Sin esto, getCloudflareContext() devuelve null en desarrollo y
// todo lo que toca D1 -- el panel de admin, la sesion, los moderadores del
// chat -- cae a los fallbacks de local_db.json y no se puede probar de verdad.
// No afecta al build ni a produccion: solo corre en `next dev`.
initOpenNextCloudflareForDev();

const nextConfig: NextConfig = {
  images: {
    unoptimized: true,
  },
  // Next normaliza la barra final con un 308 ANTES del middleware, lo que
  // convertiría cada URL vieja de WordPress (todas terminaban en "/") en una
  // cadena 308 -> 301. Con esto el middleware la resuelve en un solo 301 y
  // asume él la normalización para el resto de rutas.
  skipTrailingSlashRedirect: true,
};

export default nextConfig;
