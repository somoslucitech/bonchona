CREATE TABLE IF NOT EXISTS users (
  id            TEXT PRIMARY KEY,
  email         TEXT NOT NULL UNIQUE,
  name          TEXT,
  avatar_url    TEXT,
  role          TEXT NOT NULL CHECK (role IN ('owner','editor')),
  status        TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','revoked')),
  invited_by    TEXT REFERENCES users(id),
  created_at    INTEGER NOT NULL,
  last_login_at INTEGER
);

CREATE TABLE IF NOT EXISTS invites (
  id          TEXT PRIMARY KEY,
  email       TEXT NOT NULL,
  role        TEXT NOT NULL CHECK (role IN ('owner','editor')),
  created_by  TEXT NOT NULL REFERENCES users(id),
  created_at  INTEGER NOT NULL,
  expires_at  INTEGER NOT NULL,
  used_at     INTEGER,
  revoked_at  INTEGER
);
CREATE INDEX IF NOT EXISTS idx_invites_email ON invites(email);

CREATE TABLE IF NOT EXISTS sessions (
  id            TEXT PRIMARY KEY,
  user_id       TEXT NOT NULL REFERENCES users(id),
  created_at    INTEGER NOT NULL,
  expires_at    INTEGER NOT NULL,
  last_seen_at  INTEGER NOT NULL,
  user_agent    TEXT
);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);

CREATE TABLE IF NOT EXISTS programs (
  id          TEXT PRIMARY KEY,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  time        TEXT NOT NULL,
  title       TEXT NOT NULL,
  locutor     TEXT NOT NULL,
  banner      TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  rich_text   TEXT NOT NULL DEFAULT '',
  price       INTEGER
);

CREATE TABLE IF NOT EXISTS settings (
  key         TEXT PRIMARY KEY,
  value       TEXT NOT NULL,
  updated_at  INTEGER NOT NULL
);
