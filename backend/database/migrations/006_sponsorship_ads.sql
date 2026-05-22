CREATE TABLE IF NOT EXISTS sponsor_plans (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  tier TEXT NOT NULL CHECK (tier IN ('bronze', 'silver', 'gold', 'platinum')),
  price_minor BIGINT NOT NULL,
  currency_code CHAR(3) NOT NULL REFERENCES currencies(code),
  billing_cycle TEXT NOT NULL CHECK (billing_cycle IN ('monthly', 'annual')),
  features JSONB NOT NULL DEFAULT '{}'::jsonb,
  organizer_commission_percent INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sponsor_campaigns (
  id TEXT PRIMARY KEY,
  sponsor_id TEXT NOT NULL REFERENCES users(id),
  name TEXT NOT NULL,
  objective TEXT NOT NULL DEFAULT '',
  budget_minor BIGINT NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'paused', 'completed')),
  starts_at DATE NOT NULL,
  ends_at DATE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sponsor_ads (
  id TEXT PRIMARY KEY,
  campaign_id TEXT REFERENCES sponsor_campaigns(id) ON DELETE SET NULL,
  sponsor_id TEXT NOT NULL REFERENCES users(id),
  name TEXT NOT NULL,
  placement TEXT NOT NULL CHECK (placement IN ('banner', 'sidebar', 'popup', 'video')),
  dimensions TEXT NOT NULL,
  media_url TEXT NOT NULL DEFAULT '',
  media_type TEXT NOT NULL CHECK (media_type IN ('image', 'video')),
  budget_minor BIGINT NOT NULL DEFAULT 0,
  daily_spend_minor BIGINT NOT NULL DEFAULT 0,
  impressions BIGINT NOT NULL DEFAULT 0,
  clicks BIGINT NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'pending_payment', 'active', 'paused', 'rejected')),
  payment_status TEXT NOT NULL DEFAULT 'unpaid' CHECK (payment_status IN ('unpaid', 'paid', 'refunded')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sponsor_campaigns_sponsor_status ON sponsor_campaigns(sponsor_id, status);
CREATE INDEX IF NOT EXISTS idx_sponsor_ads_sponsor_status ON sponsor_ads(sponsor_id, status);

-- Demo sponsor plans, campaigns, ads, and payments removed.
-- Admins create sponsor plans and sponsors create campaigns through app workflows.
