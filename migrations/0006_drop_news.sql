-- ============================================================
-- 0006_drop_news.sql — se retira la sección de noticias
--
-- El cliente decidió no tener noticias en la plataforma. Se elimina la tabla
-- de artículos; las imágenes asociadas (news-*.jpg en el bucket
-- bonchona-images) se borran aparte, porque R2 no se toca desde SQL.
--
-- Las URLs del WordPress viejo que quedaron indexadas responden 410 Gone
-- desde src/middleware.ts, que conserva el mapa de slugs solo para
-- reconocerlas.
-- ============================================================

DROP INDEX IF EXISTS idx_articles_source_ext;
DROP INDEX IF EXISTS idx_articles_updated;
DROP INDEX IF EXISTS idx_articles_featured;
DROP INDEX IF EXISTS idx_articles_cat_pub;
DROP INDEX IF EXISTS idx_articles_pub;
DROP TABLE IF EXISTS articles;

-- Ajustes que solo servían a la cola de publicación de noticias.
DELETE FROM settings WHERE key = 'news_queue';
