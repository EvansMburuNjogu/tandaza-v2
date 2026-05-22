ALTER TABLE expo_exhibitors
  ADD COLUMN IF NOT EXISTS booth_label TEXT NOT NULL DEFAULT 'Digital Workspace';

ALTER TABLE expo_exhibitors DROP CONSTRAINT IF EXISTS expo_exhibitors_activation_status_check;
ALTER TABLE expo_exhibitors
  ADD CONSTRAINT expo_exhibitors_activation_status_check
  CHECK (activation_status IN ('inactive', 'invited', 'pending_activation', 'pending_payment', 'active', 'suspended', 'disabled'));

UPDATE expo_exhibitors SET activation_status='pending_activation' WHERE activation_status='pending_payment';

ALTER TABLE leads DROP CONSTRAINT IF EXISTS leads_status_check;
ALTER TABLE leads
  ADD CONSTRAINT leads_status_check
  CHECK (status IN ('new', 'contacted', 'meeting_booked', 'proposal_sent', 'won', 'lost', 'qualified', 'quote_sent'));

ALTER TABLE leads
  ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}'::jsonb;

CREATE TABLE IF NOT EXISTS exhibitor_profiles (
  exhibitor_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  description TEXT NOT NULL DEFAULT '',
  website TEXT NOT NULL DEFAULT '',
  phone TEXT NOT NULL DEFAULT '',
  address TEXT NOT NULL DEFAULT '',
  logo_url TEXT NOT NULL DEFAULT '',
  social_links JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Demo exhibitor profile seed removed.
-- Exhibitor profile data is created through real account setup.
