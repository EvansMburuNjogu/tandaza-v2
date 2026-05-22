CREATE TABLE IF NOT EXISTS exhibitor_meeting_settings (
  exhibitor_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  value JSONB NOT NULL DEFAULT '{"categoryTypes":["Online demo","Sales consultation","Product walkthrough","Partnership discussion","Post-expo follow-up"]}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

