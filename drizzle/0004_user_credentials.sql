CREATE TABLE user_credentials (
  user_id TEXT PRIMARY KEY NOT NULL CHECK (user_id = 'sude'),
  password_hash TEXT NOT NULL,
  password_encrypted TEXT NOT NULL,
  updated_at INTEGER NOT NULL
);
