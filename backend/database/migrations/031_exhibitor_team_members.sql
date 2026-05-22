CREATE TABLE IF NOT EXISTS exhibitor_team_members (
  id TEXT PRIMARY KEY,
  exhibitor_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('staff', 'assistant', 'manager')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  permissions TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (exhibitor_id, email)
);

CREATE INDEX IF NOT EXISTS idx_exhibitor_team_members_owner_status ON exhibitor_team_members(exhibitor_id, status);
