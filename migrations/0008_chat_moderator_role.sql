-- ============================================================
-- 0008_chat_moderator_role.sql
--
-- Sustituye los codigos de moderador del chat por un tercer rol dentro del
-- sistema de invitaciones + Google que el sitio ya tenia.
--
-- Por que: el codigo era un secreto portador. Se comparte por WhatsApp, no
-- caduca, no se rota, y quien lo tenga es moderador hasta que alguien lo note.
-- Un rol reusa invitaciones, sesiones firmadas, revocacion inmediata y el
-- listado de sesiones activas, todo ya probado, y no anade ninguna via de
-- autenticacion nueva que auditar.
--
-- Aplicar:
--   npx wrangler d1 execute bonchona-db --local  --file=migrations/0008_chat_moderator_role.sql
--   npx wrangler d1 execute bonchona-db --remote --file=migrations/0008_chat_moderator_role.sql
--
-- NOTA: las sesiones activas se conservan. Nadie tiene que volver a entrar.
-- ============================================================

-- ------------------------------------------------------------
-- Fuera los codigos de moderador.
--
-- Se elimina la tabla entera en vez de dejarla apagada: una segunda via de
-- autenticacion que nadie usa es una puerta trasera esperando a que alguien
-- la reabra sin acordarse de por que se cerro. De paso quita una clave foranea
-- hacia users antes de reconstruirla.
-- ------------------------------------------------------------
DROP INDEX IF EXISTS idx_chat_mods_active;
DROP TABLE IF EXISTS chat_moderators;

-- ------------------------------------------------------------
-- Anadir 'moderator' al CHECK de users e invites.
--
-- SQLite no permite modificar un CHECK, hay que reconstruir la tabla. Y aqui
-- no sirve el truco habitual de `PRAGMA foreign_keys = OFF`: D1 no lo respeta,
-- y `defer_foreign_keys` tampoco, porque su guard revalida las restricciones al
-- cerrar y aborta con "the application left the database in a state where
-- constraints were violated".
--
-- Asi que en vez de desactivar las comprobaciones, se evita que lleguen a
-- fallar: se copian los datos a tablas sin restricciones, se sueltan las hijas
-- ANTES que la madre, y se reconstruye todo de arriba abajo. En ningun momento
-- existe una fila apuntando a una tabla que ya no esta.
-- ------------------------------------------------------------

CREATE TABLE _bk_users    AS SELECT * FROM users;
CREATE TABLE _bk_sessions AS SELECT * FROM sessions;
CREATE TABLE _bk_invites  AS SELECT * FROM invites;

DROP TABLE sessions;
DROP TABLE invites;

-- users se referencia a si misma por invited_by. Soltar la tabla con esas
-- referencias vivas es lo que dispara el error, asi que se limpian primero:
-- el valor original ya esta a salvo en _bk_users y se restaura despues.
UPDATE users SET invited_by = NULL;
DROP TABLE users;

CREATE TABLE users (
  id            TEXT PRIMARY KEY,
  email         TEXT NOT NULL UNIQUE,
  name          TEXT,
  avatar_url    TEXT,
  role          TEXT NOT NULL CHECK (role IN ('owner','editor','moderator')),
  status        TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','revoked')),
  -- Sin FOREIGN KEY a proposito: es un dato informativo de "quien invito a
  -- quien" que solo se muestra. Con la clave foranea, cualquier reconstruccion
  -- futura de esta tabla vuelve a chocar con el mismo problema circular.
  invited_by    TEXT,
  created_at    INTEGER NOT NULL,
  last_login_at INTEGER
);

INSERT INTO users (id, email, name, avatar_url, role, status, invited_by, created_at, last_login_at)
  SELECT id, email, name, avatar_url, role, status, invited_by, created_at, last_login_at
  FROM _bk_users;

CREATE TABLE sessions (
  id            TEXT PRIMARY KEY,
  user_id       TEXT NOT NULL REFERENCES users(id),
  created_at    INTEGER NOT NULL,
  expires_at    INTEGER NOT NULL,
  last_seen_at  INTEGER NOT NULL,
  user_agent    TEXT
);

INSERT INTO sessions (id, user_id, created_at, expires_at, last_seen_at, user_agent)
  SELECT id, user_id, created_at, expires_at, last_seen_at, user_agent FROM _bk_sessions;

CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);

CREATE TABLE invites (
  id          TEXT PRIMARY KEY,
  email       TEXT NOT NULL,
  role        TEXT NOT NULL CHECK (role IN ('owner','editor','moderator')),
  created_by  TEXT NOT NULL REFERENCES users(id),
  created_at  INTEGER NOT NULL,
  expires_at  INTEGER NOT NULL,
  used_at     INTEGER,
  revoked_at  INTEGER
);

INSERT INTO invites (id, email, role, created_by, created_at, expires_at, used_at, revoked_at)
  SELECT id, email, role, created_by, created_at, expires_at, used_at, revoked_at FROM _bk_invites;

CREATE INDEX IF NOT EXISTS idx_invites_email ON invites(email);

DROP TABLE _bk_users;
DROP TABLE _bk_sessions;
DROP TABLE _bk_invites;
