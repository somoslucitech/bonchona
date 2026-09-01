-- ============================================================
-- 0007_chat.sql — Chat en vivo de la barra de música
--
-- Aplicar:
--   npx wrangler d1 execute bonchona-db --local  --file=migrations/0007_chat.sql
--   npx wrangler d1 execute bonchona-db --remote --file=migrations/0007_chat.sql
--
-- OJO: los MENSAJES del chat NO viven aquí y no deben vivir aquí nunca.
-- Son efímeros (últimos ~100) y residen en el Durable Object `ChatRoom`
-- (workers/chat/index.js). Escribir una fila por mensaje reventaría el techo
-- de 100.000 filas/día del plan gratuito de Cloudflare. En D1 solo guardamos
-- lo que tiene que sobrevivir para siempre: quién puede moderar y qué hizo.
-- ============================================================

-- ------------------------------------------------------------
-- Moderadores que NO tienen cuenta de Google del panel.
--
-- Los usuarios `owner` y `editor` de la tabla `users` ya son moderadores
-- automáticamente y no aparecen aquí. Esta tabla es para los locutores:
-- entran al chat con su nick y un código, sin acceso al admin.
--
-- El código se guarda hasheado (SHA-256 con AUTH_SECRET como sal), igual
-- que se hace con las IP en la tabla `demos`: si alguien lee la base, no
-- puede suplantar a un locutor.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS chat_moderators (
  nick_lower    TEXT PRIMARY KEY,       -- nick normalizado, evita duplicados por mayúsculas
  nick          TEXT NOT NULL,          -- nick tal cual se muestra en el chat
  code_hash     TEXT NOT NULL,
  created_at    INTEGER NOT NULL,
  created_by    TEXT,                   -- users.id del owner que lo dio de alta
  last_seen_at  INTEGER,
  revoked_at    INTEGER,                -- NULL = activo. No se borra, para no perder la auditoría.
  FOREIGN KEY (created_by) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_chat_mods_active
  ON chat_moderators(revoked_at, nick_lower);

-- ------------------------------------------------------------
-- Registro de auditoría de moderación.
--
-- Protege en las dos direcciones: si un moderador abusa queda registrado, y
-- si un oyente reclama hay evidencia de qué pasó y quién lo decidió.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS chat_audit (
  id          TEXT PRIMARY KEY,
  ts          INTEGER NOT NULL,
  actor       TEXT NOT NULL,            -- nick del moderador, o email del admin
  actor_kind  TEXT NOT NULL CHECK (actor_kind IN ('admin', 'mod')),
  action      TEXT NOT NULL CHECK (action IN (
                'delete', 'ban', 'unban', 'shadowban',
                'freeze', 'unfreeze', 'clear', 'pin', 'unpin'
              )),
  target      TEXT,                     -- nick afectado, si aplica
  detail      TEXT                      -- texto borrado truncado, duración del ban, etc.
);

CREATE INDEX IF NOT EXISTS idx_chat_audit_ts ON chat_audit(ts DESC);

-- ------------------------------------------------------------
-- Configuración del chat en la tabla `settings` genérica.
--
-- Vive aquí, y no en el código, para poder encender/apagar el chat y ajustar
-- el modo lento desde el admin sin hacer un deploy. `getChatConfig()` en
-- src/lib/chat.ts valida y normaliza este JSON al leerlo, así que un valor
-- corrupto degrada a los valores por defecto en vez de romper el chat.
-- ------------------------------------------------------------
INSERT OR IGNORE INTO settings (key, value, updated_at) VALUES (
  'chat_config',
  '{"enabled":false,"scheduleEnabled":false,"slots":[],"slowMs":30000,"autoSlow":true,"maxChars":200,"capacity":1000,"blockLinks":true,"blockedWords":[],"reservedNicks":["admin","mod","moderador","bonchona","bonchona radio","staff","sistema","locutor"]}',
  unixepoch() * 1000
);

INSERT OR IGNORE INTO settings (key, value, updated_at) VALUES (
  'chat_pin', '""', unixepoch() * 1000
);
