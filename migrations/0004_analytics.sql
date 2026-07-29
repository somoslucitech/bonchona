-- ============================================================
-- 0004_analytics.sql — métricas propias de audiencia
-- Sustituye al iframe de Looker Studio: datos en tiempo real,
-- sin depender de la sesión de Google.
-- ============================================================

-- Muestras del contador de oyentes del Icecast, tomadas cada 5 minutos por
-- el worker `bonchona-sampler` (cron). Cuenta a TODOS los que escuchan
-- (web, apps, cualquier reproductor), no solo el reproductor del sitio.
CREATE TABLE IF NOT EXISTS listener_samples (
  ts        INTEGER PRIMARY KEY,  -- epoch ms del muestreo
  listeners INTEGER NOT NULL,     -- concurrentes en ese instante
  peak      INTEGER,              -- listener_peak que reporta Icecast
  online    INTEGER NOT NULL DEFAULT 1  -- 0 si el stream no respondió
);
CREATE INDEX IF NOT EXISTS idx_listener_samples_ts ON listener_samples(ts DESC);

-- Vistas de página por día (hora de Venezuela). Se agrega en el momento para
-- no guardar una fila por request.
CREATE TABLE IF NOT EXISTS daily_pageviews (
  day   TEXT PRIMARY KEY,          -- 'YYYY-MM-DD' en VET
  views INTEGER NOT NULL DEFAULT 0
);

-- Visitantes únicos por día. `vid` es un hash NO reversible de
-- (ip + user-agent + día + secreto): no permite identificar a nadie ni
-- seguir a la misma persona entre días distintos, porque el día entra en
-- el hash. Se purga sola a los 90 días.
CREATE TABLE IF NOT EXISTS daily_visitors (
  day TEXT NOT NULL,
  vid TEXT NOT NULL,
  PRIMARY KEY (day, vid)
);
