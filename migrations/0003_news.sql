-- ============================================================
-- 0003_news.sql — noticias + tag cache de OpenNext
-- Aplicar:
--   npx wrangler d1 execute bonchona-db --local  --file=migrations/0003_news.sql
--   npx wrangler d1 execute bonchona-db --remote --file=migrations/0003_news.sql
-- ============================================================

CREATE TABLE IF NOT EXISTS articles (
  id              TEXT    PRIMARY KEY,
  slug            TEXT    NOT NULL UNIQUE,
  title           TEXT    NOT NULL,
  excerpt         TEXT    NOT NULL DEFAULT '',
  body_html       TEXT    NOT NULL DEFAULT '',
  body_text       TEXT    NOT NULL DEFAULT '',
  image           TEXT,
  image_alt       TEXT,
  image_width     INTEGER,
  image_height    INTEGER,
  category        TEXT    NOT NULL DEFAULT 'musica',
  tags            TEXT    NOT NULL DEFAULT '[]',
  featured        INTEGER NOT NULL DEFAULT 0,
  status          TEXT    NOT NULL DEFAULT 'draft'
                    CHECK (status IN ('draft','published','discarded')),
  -- epoch ms UTC. Si es futuro, la noticia está EN COLA: no visible ni indexable.
  published_at    INTEGER,
  created_at      INTEGER NOT NULL,
  updated_at      INTEGER NOT NULL,
  author_name     TEXT    NOT NULL DEFAULT 'Redacción Bonchona',
  author_user_id  TEXT    REFERENCES users(id),
  seo_title       TEXT,
  seo_description TEXT,
  canonical_url   TEXT,
  noindex         INTEGER NOT NULL DEFAULT 0,
  reading_minutes INTEGER,
  word_count      INTEGER,
  source          TEXT    NOT NULL DEFAULT 'admin',
  external_id     TEXT,
  legacy_path     TEXT
);

CREATE INDEX IF NOT EXISTS idx_articles_pub      ON articles(status, published_at DESC);
CREATE INDEX IF NOT EXISTS idx_articles_cat_pub  ON articles(status, category, published_at DESC);
CREATE INDEX IF NOT EXISTS idx_articles_featured ON articles(status, featured, published_at DESC);
CREATE INDEX IF NOT EXISTS idx_articles_updated  ON articles(updated_at DESC);

-- Hace idempotentes los reintentos de n8n y las re-corridas de la migración.
CREATE UNIQUE INDEX IF NOT EXISTS idx_articles_source_ext
  ON articles(source, external_id) WHERE external_id IS NOT NULL;

-- ============================================================
-- Tag cache de OpenNext (D1NextModeTagCache).
-- Esquema verificado contra @opennextjs/cloudflare@1.19.11:
--   dist/api/overrides/tag-cache/d1-next-tag-cache.js
--   writeTags: INSERT INTO revalidations (tag, revalidatedAt, stale, expire)
--   lectura:   SELECT tag, revalidatedAt, stale, expire FROM revalidations WHERE tag IN (...)
-- ============================================================
CREATE TABLE IF NOT EXISTS revalidations (
  tag           TEXT    NOT NULL,
  revalidatedAt INTEGER NOT NULL,
  stale         INTEGER,
  expire        INTEGER
);
CREATE INDEX IF NOT EXISTS idx_revalidations_tag ON revalidations(tag);
