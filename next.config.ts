import type { NextConfig } from "next";

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
