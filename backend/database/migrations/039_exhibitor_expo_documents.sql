CREATE TABLE IF NOT EXISTS exhibitor_expo_documents (
  id TEXT PRIMARY KEY,
  expo_id TEXT NOT NULL REFERENCES expos(id) ON DELETE CASCADE,
  exhibitor_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  mime_type TEXT NOT NULL DEFAULT 'application/pdf',
  size_bytes INTEGER NOT NULL DEFAULT 0,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_exhibitor_expo_documents_workspace
  ON exhibitor_expo_documents(expo_id, exhibitor_id, uploaded_at DESC);
