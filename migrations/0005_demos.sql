-- ============================================================
-- 0005_demos.sql — Zona de Talento: demos enviados por músicos
-- ============================================================

CREATE TABLE IF NOT EXISTS demos (
  id            TEXT PRIMARY KEY,
  created_at    INTEGER NOT NULL,

  -- Artista
  first_name    TEXT NOT NULL,
  last_name     TEXT NOT NULL,
  artist_name   TEXT NOT NULL,

  -- Contacto
  email         TEXT NOT NULL,
  whatsapp      TEXT,

  -- El tema
  track_title   TEXT NOT NULL,
  genre         TEXT,

  -- Procedencia y redes
  city          TEXT,
  instagram     TEXT,
  spotify       TEXT,
  message       TEXT,

  -- Archivo en R2 (bucket bonchona-demos, privado: solo se descarga
  -- desde el admin con sesión válida)
  file_key      TEXT NOT NULL,
  file_name     TEXT NOT NULL,
  file_size     INTEGER NOT NULL,

  -- Declaración de que la canción es suya y autoriza transmitirla
  rights_confirmed INTEGER NOT NULL DEFAULT 0,

  -- Gestión desde el admin
  status        TEXT NOT NULL DEFAULT 'nuevo'
                  CHECK (status IN ('nuevo','escuchado','aprobado','descartado')),
  notes         TEXT,

  -- Hash no reversible de la IP, solo para limitar envíos abusivos.
  -- No se guarda la IP en claro.
  ip_hash       TEXT
);

CREATE INDEX IF NOT EXISTS idx_demos_created ON demos(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_demos_status  ON demos(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_demos_ip      ON demos(ip_hash, created_at DESC);
