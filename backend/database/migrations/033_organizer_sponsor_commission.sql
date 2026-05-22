ALTER TABLE organizer_sponsors
  ADD COLUMN IF NOT EXISTS commission_rate_percent INTEGER NOT NULL DEFAULT 0;
