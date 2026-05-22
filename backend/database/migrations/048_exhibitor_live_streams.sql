CREATE TABLE IF NOT EXISTS exhibitor_live_streams (
  expo_id TEXT NOT NULL REFERENCES expos(id) ON DELETE CASCADE,
  exhibitor_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'Expo live stream',
  youtube_url TEXT NOT NULL DEFAULT '',
  embed_url TEXT NOT NULL DEFAULT '',
  enabled BOOLEAN NOT NULL DEFAULT FALSE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (expo_id, exhibitor_id)
);
