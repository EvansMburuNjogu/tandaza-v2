ALTER TABLE exhibitor_live_streams
  ADD COLUMN IF NOT EXISTS live_chat_enabled BOOLEAN NOT NULL DEFAULT FALSE;
