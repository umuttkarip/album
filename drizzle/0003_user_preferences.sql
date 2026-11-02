CREATE TABLE user_preferences (
  user_id TEXT PRIMARY KEY NOT NULL CHECK (user_id IN ('umut','sude')),
  onboarding_seen_at INTEGER NOT NULL
);
