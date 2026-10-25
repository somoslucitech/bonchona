-- ============================================================
-- 0009_traffic_sources.sql — de dónde llegan las visitas y quién escucha
-- Una fila por día y canal (google, fm, whatsapp, app, directo...). Se
-- agrega en el momento, igual que daily_pageviews: nada identifica a nadie.
-- /api/track la crea sola si no existe (CREATE TABLE IF NOT EXISTS), así que
-- esta migración es el registro de su forma, no un paso obligatorio.
-- ============================================================

CREATE TABLE IF NOT EXISTS daily_sources (
  day    TEXT NOT NULL,              -- 'YYYY-MM-DD' en VET
  source TEXT NOT NULL,              -- canal de la sesión
  visits INTEGER NOT NULL DEFAULT 0, -- sesiones que empezaron por ese canal
  plays  INTEGER NOT NULL DEFAULT 0, -- de esas sesiones, cuántas le dieron a play
  PRIMARY KEY (day, source)
);
