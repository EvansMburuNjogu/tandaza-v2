CREATE TABLE IF NOT EXISTS organizer_profiles (
  organizer_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  phone TEXT NOT NULL DEFAULT '',
  address TEXT NOT NULL DEFAULT '',
  email_notifications BOOLEAN NOT NULL DEFAULT TRUE,
  sms_notifications BOOLEAN NOT NULL DEFAULT FALSE,
  push_notifications BOOLEAN NOT NULL DEFAULT TRUE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS organizer_team_members (
  id TEXT PRIMARY KEY,
  organizer_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('staff', 'assistant', 'manager')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  permissions TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (organizer_id, email)
);

CREATE TABLE IF NOT EXISTS organizer_sponsors (
  id TEXT PRIMARY KEY,
  organizer_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  company TEXT NOT NULL,
  contact_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL DEFAULT '',
  plan_name TEXT NOT NULL,
  plan_tier TEXT NOT NULL CHECK (plan_tier IN ('bronze', 'silver', 'gold', 'platinum')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('active', 'pending', 'expired', 'cancelled')),
  commissioned_by TEXT NOT NULL DEFAULT '',
  commission_earned_minor BIGINT NOT NULL DEFAULT 0,
  total_paid_minor BIGINT NOT NULL DEFAULT 0,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_organizer_team_members_owner_status ON organizer_team_members(organizer_id, status);
CREATE INDEX IF NOT EXISTS idx_organizer_sponsors_owner_status ON organizer_sponsors(organizer_id, status);

-- Demo organizer profile, team, and sponsor records removed.
-- Organizer data is created when real organizer accounts are created and updated.
