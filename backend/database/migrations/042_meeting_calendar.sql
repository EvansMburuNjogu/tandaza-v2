ALTER TABLE meetings
  ADD COLUMN IF NOT EXISTS meeting_link TEXT,
  ADD COLUMN IF NOT EXISTS reminder_status TEXT NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS reminder_sent_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_meetings_expo_schedule ON meetings(expo_id, scheduled_at);
CREATE INDEX IF NOT EXISTS idx_meetings_lead ON meetings(lead_id);
