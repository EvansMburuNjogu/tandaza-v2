CREATE TABLE IF NOT EXISTS organizer_feedback (
  id TEXT PRIMARY KEY,
  expo_id TEXT NOT NULL REFERENCES expos(id) ON DELETE CASCADE,
  organizer_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  exhibitor_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  exhibitor_name TEXT NOT NULL,
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  category TEXT NOT NULL DEFAULT 'overall',
  comment TEXT NOT NULL,
  improvements TEXT NOT NULL DEFAULT '',
  dislikes TEXT NOT NULL DEFAULT '',
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_organizer_feedback_organizer
  ON organizer_feedback(organizer_id, submitted_at DESC);

CREATE INDEX IF NOT EXISTS idx_organizer_feedback_workspace
  ON organizer_feedback(expo_id, exhibitor_id, submitted_at DESC);
