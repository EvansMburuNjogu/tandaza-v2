CREATE TABLE IF NOT EXISTS exhibitor_feedback (
  id TEXT PRIMARY KEY,
  expo_id TEXT NOT NULL REFERENCES expos(id) ON DELETE CASCADE,
  exhibitor_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  visitor_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  visitor_name TEXT NOT NULL,
  visitor_email TEXT,
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment TEXT NOT NULL,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_exhibitor_feedback_workspace
  ON exhibitor_feedback(expo_id, exhibitor_id, submitted_at DESC);

CREATE INDEX IF NOT EXISTS idx_exhibitor_feedback_visitor
  ON exhibitor_feedback(visitor_id, submitted_at DESC);

CREATE TABLE IF NOT EXISTS exhibitor_campaign_drafts (
  id TEXT PRIMARY KEY,
  expo_id TEXT NOT NULL REFERENCES expos(id) ON DELETE CASCADE,
  exhibitor_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  channel TEXT NOT NULL CHECK (channel IN ('email', 'sms', 'whatsapp')),
  name TEXT NOT NULL,
  audience TEXT NOT NULL CHECK (audience IN ('all_leads', 'hot_leads', 'warm_leads', 'cold_leads', 'visitors', 'pre_orders')),
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_exhibitor_campaign_drafts_workspace
  ON exhibitor_campaign_drafts(expo_id, exhibitor_id, created_at DESC);
