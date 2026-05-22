CREATE TABLE IF NOT EXISTS exhibitor_company_documents (
  id TEXT PRIMARY KEY,
  exhibitor_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  mime_type TEXT NOT NULL DEFAULT 'application/pdf',
  size_bytes INTEGER NOT NULL DEFAULT 0,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_exhibitor_company_documents_exhibitor
  ON exhibitor_company_documents(exhibitor_id, uploaded_at DESC);
