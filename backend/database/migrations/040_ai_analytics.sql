INSERT INTO app_settings (key, value, updated_at)
VALUES ('openai', '{"enabled":false,"apiKey":"","model":"gpt-4.1-mini"}'::jsonb, NOW())
ON CONFLICT (key) DO NOTHING;

CREATE TABLE IF NOT EXISTS ai_analytics_summaries (
  id TEXT PRIMARY KEY,
  scope TEXT NOT NULL CHECK (scope IN ('admin_country','organizer','exhibitor_expo','sponsor')),
  scope_id TEXT NOT NULL DEFAULT '',
  country_code TEXT NOT NULL DEFAULT '',
  summary TEXT NOT NULL DEFAULT '',
  risks JSONB NOT NULL DEFAULT '[]'::jsonb,
  opportunities JSONB NOT NULL DEFAULT '[]'::jsonb,
  recommendations JSONB NOT NULL DEFAULT '[]'::jsonb,
  next_actions JSONB NOT NULL DEFAULT '[]'::jsonb,
  confidence_notes TEXT NOT NULL DEFAULT '',
  source_metrics JSONB NOT NULL DEFAULT '{}'::jsonb,
  generated_by TEXT NOT NULL DEFAULT '',
  generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  provider TEXT NOT NULL DEFAULT 'openai',
  model TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'ready' CHECK (status IN ('ready','fallback','failed')),
  error_message TEXT
);

CREATE INDEX IF NOT EXISTS idx_ai_analytics_scope_latest
  ON ai_analytics_summaries(scope, scope_id, country_code, generated_at DESC);
