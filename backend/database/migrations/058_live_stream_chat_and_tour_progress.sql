CREATE TABLE IF NOT EXISTS live_stream_chat_sessions (
  id TEXT PRIMARY KEY,
  expo_id TEXT NOT NULL REFERENCES expos(id) ON DELETE CASCADE,
  exhibitor_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_live_stream_chat_active_session
  ON live_stream_chat_sessions(expo_id, exhibitor_id)
  WHERE active = TRUE;

CREATE TABLE IF NOT EXISTS live_stream_chat_messages (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL REFERENCES live_stream_chat_sessions(id) ON DELETE CASCADE,
  expo_id TEXT NOT NULL REFERENCES expos(id) ON DELETE CASCADE,
  exhibitor_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  visitor_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  sender_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  sender_role TEXT NOT NULL,
  sender_name TEXT NOT NULL DEFAULT '',
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_live_stream_chat_messages_session
  ON live_stream_chat_messages(session_id, created_at ASC);

CREATE TABLE IF NOT EXISTS user_tour_progress (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL,
  page_key TEXT NOT NULL,
  seen BOOLEAN NOT NULL DEFAULT FALSE,
  completed_at TIMESTAMPTZ,
  skipped_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, role, page_key)
);
