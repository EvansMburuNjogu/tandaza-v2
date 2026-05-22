CREATE TABLE IF NOT EXISTS notification_delivery_attempts (
  id TEXT PRIMARY KEY,
  notification_id TEXT NOT NULL REFERENCES notifications(id) ON DELETE CASCADE,
  channel TEXT NOT NULL,
  provider TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('sent', 'failed')),
  request_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  response_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  failure_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notification_attempts_notification ON notification_delivery_attempts(notification_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notification_attempts_status ON notification_delivery_attempts(status, created_at DESC);
