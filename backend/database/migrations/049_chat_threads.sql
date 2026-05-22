CREATE TABLE IF NOT EXISTS chat_threads (
  id TEXT PRIMARY KEY,
  expo_id TEXT NOT NULL REFERENCES expos(id) ON DELETE CASCADE,
  exhibitor_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  visitor_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (expo_id, exhibitor_id, visitor_id)
);

CREATE TABLE IF NOT EXISTS chat_messages (
  id TEXT PRIMARY KEY,
  thread_id TEXT NOT NULL REFERENCES chat_threads(id) ON DELETE CASCADE,
  expo_id TEXT NOT NULL REFERENCES expos(id) ON DELETE CASCADE,
  exhibitor_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  visitor_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  sender_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  sender_role TEXT NOT NULL,
  sender_name TEXT NOT NULL DEFAULT '',
  message TEXT NOT NULL,
  read_by_visitor BOOLEAN NOT NULL DEFAULT FALSE,
  read_by_exhibitor BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_chat_threads_exhibitor ON chat_threads(expo_id, exhibitor_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_threads_visitor ON chat_threads(visitor_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_messages_thread ON chat_messages(thread_id, created_at ASC);
