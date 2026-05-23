CREATE TABLE IF NOT EXISTS visitor_favorites (
  id TEXT PRIMARY KEY,
  visitor_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('expo', 'exhibitor')),
  item_id TEXT NOT NULL,
  name TEXT NOT NULL DEFAULT '',
  image_url TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (visitor_id, type, item_id)
);

CREATE INDEX IF NOT EXISTS idx_visitor_favorites_visitor_created
  ON visitor_favorites(visitor_id, created_at DESC);
