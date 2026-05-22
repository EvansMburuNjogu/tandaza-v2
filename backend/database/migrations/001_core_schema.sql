CREATE EXTENSION IF NOT EXISTS citext;

CREATE TABLE countries (
  code CHAR(2) PRIMARY KEY,
  name TEXT NOT NULL,
  default_currency_code CHAR(3) NOT NULL,
  default_timezone TEXT NOT NULL,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE currencies (
  code CHAR(3) PRIMARY KEY,
  symbol TEXT NOT NULL,
  decimal_places INTEGER NOT NULL DEFAULT 2,
  active BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE users (
  id TEXT PRIMARY KEY,
  email CITEXT UNIQUE NOT NULL,
  password_hash TEXT,
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('visitor', 'exhibitor', 'organizer', 'sponsorship', 'administrator')),
  avatar_url TEXT,
  company_name TEXT,
  country_code CHAR(2) REFERENCES countries(code),
  email_verified BOOLEAN NOT NULL DEFAULT FALSE,
  phone_verified BOOLEAN NOT NULL DEFAULT FALSE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'pending', 'suspended', 'inactive')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE categories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  icon TEXT,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE expos (
  id TEXT PRIMARY KEY,
  organizer_id TEXT NOT NULL REFERENCES users(id),
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  country_code CHAR(2) NOT NULL REFERENCES countries(code),
  city TEXT NOT NULL,
  venue TEXT NOT NULL,
  currency_code CHAR(3) NOT NULL REFERENCES currencies(code),
  timezone TEXT NOT NULL,
  exhibitor_activation_fee_minor BIGINT NOT NULL DEFAULT 0,
  organizer_commission_bps INTEGER NOT NULL DEFAULT 0 CHECK (organizer_commission_bps BETWEEN 0 AND 10000),
  payment_provider TEXT NOT NULL DEFAULT 'paystack',
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'submitted_for_review', 'needs_changes', 'approved', 'published', 'live', 'completed', 'settlement_pending', 'settled', 'archived')),
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE expo_categories (
  expo_id TEXT NOT NULL REFERENCES expos(id) ON DELETE CASCADE,
  category_id TEXT NOT NULL REFERENCES categories(id),
  PRIMARY KEY (expo_id, category_id)
);

CREATE TABLE expo_exhibitors (
  id TEXT PRIMARY KEY,
  expo_id TEXT NOT NULL REFERENCES expos(id) ON DELETE CASCADE,
  exhibitor_id TEXT NOT NULL REFERENCES users(id),
  booth_number TEXT,
  activation_status TEXT NOT NULL DEFAULT 'inactive' CHECK (activation_status IN ('inactive', 'pending_payment', 'active', 'suspended')),
  activated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (expo_id, exhibitor_id)
);

CREATE TABLE products (
  id TEXT PRIMARY KEY,
  expo_exhibitor_id TEXT NOT NULL REFERENCES expo_exhibitors(id) ON DELETE CASCADE,
  category_id TEXT REFERENCES categories(id),
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  price_minor BIGINT,
  currency_code CHAR(3) REFERENCES currencies(code),
  cta_type TEXT NOT NULL DEFAULT 'inquiry' CHECK (cta_type IN ('inquiry', 'request_quote', 'pre_order', 'book_demo')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'draft', 'archived')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE qr_codes (
  id TEXT PRIMARY KEY,
  expo_id TEXT NOT NULL REFERENCES expos(id) ON DELETE CASCADE,
  expo_exhibitor_id TEXT REFERENCES expo_exhibitors(id) ON DELETE CASCADE,
  code TEXT UNIQUE NOT NULL,
  target_path TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('exhibitor_booth', 'product', 'visitor_checkin')),
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE visitor_timeline_events (
  id TEXT PRIMARY KEY,
  visitor_id TEXT REFERENCES users(id),
  expo_id TEXT NOT NULL REFERENCES expos(id) ON DELETE CASCADE,
  expo_exhibitor_id TEXT REFERENCES expo_exhibitors(id),
  product_id TEXT REFERENCES products(id),
  source TEXT NOT NULL CHECK (source IN ('remote', 'booth_qr', 'onsite', 'notification')),
  event_type TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE leads (
  id TEXT PRIMARY KEY,
  expo_id TEXT NOT NULL REFERENCES expos(id) ON DELETE CASCADE,
  expo_exhibitor_id TEXT NOT NULL REFERENCES expo_exhibitors(id) ON DELETE CASCADE,
  visitor_id TEXT REFERENCES users(id),
  source TEXT NOT NULL CHECK (source IN ('remote', 'booth_qr', 'onsite', 'inquiry', 'pre_order')),
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  country_code CHAR(2) REFERENCES countries(code),
  temperature TEXT NOT NULL DEFAULT 'warm' CHECK (temperature IN ('hot', 'warm', 'cold')),
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'qualified', 'quote_sent', 'won', 'lost')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE meetings (
  id TEXT PRIMARY KEY,
  lead_id TEXT NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  expo_id TEXT NOT NULL REFERENCES expos(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  meeting_type TEXT NOT NULL CHECK (meeting_type IN ('booth_meeting', 'online_demo', 'sales_call', 'post_expo_followup')),
  scheduled_at TIMESTAMPTZ NOT NULL,
  location_or_link TEXT,
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'completed', 'cancelled', 'no_show')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE payments (
  id TEXT PRIMARY KEY,
  expo_id TEXT NOT NULL REFERENCES expos(id),
  payer_id TEXT NOT NULL REFERENCES users(id),
  payer_role TEXT NOT NULL,
  purpose TEXT NOT NULL CHECK (purpose IN ('exhibitor_activation', 'sponsor_placement', 'exhibitor_boost')),
  country_code CHAR(2) NOT NULL REFERENCES countries(code),
  currency_code CHAR(3) NOT NULL REFERENCES currencies(code),
  amount_minor BIGINT NOT NULL,
  provider TEXT NOT NULL,
  provider_reference TEXT,
  idempotency_key TEXT UNIQUE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'failed', 'refunded', 'cancelled')),
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE commissions (
  id TEXT PRIMARY KEY,
  payment_id TEXT NOT NULL UNIQUE REFERENCES payments(id),
  expo_id TEXT NOT NULL REFERENCES expos(id),
  organizer_id TEXT NOT NULL REFERENCES users(id),
  gross_minor BIGINT NOT NULL,
  commission_minor BIGINT NOT NULL,
  platform_minor BIGINT NOT NULL,
  rate_bps INTEGER NOT NULL,
  currency_code CHAR(3) NOT NULL REFERENCES currencies(code),
  status TEXT NOT NULL DEFAULT 'accruing' CHECK (status IN ('accruing', 'pending_review', 'approved', 'processing', 'disbursed', 'held', 'failed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE notifications (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES users(id),
  expo_id TEXT REFERENCES expos(id),
  role TEXT NOT NULL,
  channel TEXT NOT NULL CHECK (channel IN ('email', 'sms', 'push', 'whatsapp', 'in_app')),
  template_key TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'sent', 'delivered', 'failed', 'cancelled')),
  scheduled_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  sent_at TIMESTAMPTZ,
  failure_reason TEXT
);

CREATE TABLE audit_logs (
  id TEXT PRIMARY KEY,
  actor_id TEXT REFERENCES users(id),
  actor TEXT,
  actor_role TEXT,
  expo_id TEXT REFERENCES expos(id),
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  ip_address INET,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE app_logs (
  id TEXT PRIMARY KEY,
  level TEXT NOT NULL CHECK (level IN ('debug', 'info', 'warn', 'error')),
  message TEXT NOT NULL,
  request_id TEXT,
  method TEXT,
  path TEXT,
  status INTEGER,
  latency_ms BIGINT,
  user_id TEXT REFERENCES users(id),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_expos_country_status ON expos(country_code, status);
CREATE INDEX idx_expos_organizer_status ON expos(organizer_id, status);
CREATE INDEX idx_expo_exhibitors_expo_status ON expo_exhibitors(expo_id, activation_status);
CREATE INDEX idx_timeline_visitor_expo_time ON visitor_timeline_events(visitor_id, expo_id, occurred_at DESC);
CREATE INDEX idx_leads_exhibitor_status ON leads(expo_exhibitor_id, status);
CREATE INDEX idx_payments_expo_status ON payments(expo_id, status);
CREATE INDEX idx_commissions_organizer_status ON commissions(organizer_id, status);
CREATE INDEX idx_notifications_user_status ON notifications(user_id, status, scheduled_at);
CREATE INDEX idx_audit_logs_actor_time ON audit_logs(actor_id, created_at DESC);
CREATE INDEX idx_audit_logs_entity_time ON audit_logs(entity_type, entity_id, created_at DESC);
CREATE INDEX idx_app_logs_level_time ON app_logs(level, created_at DESC);
CREATE INDEX idx_app_logs_request_id ON app_logs(request_id);

INSERT INTO currencies (code, symbol, decimal_places) VALUES
('KES', 'KES', 2),
('NGN', 'NGN', 2),
('GHS', 'GHS', 2),
('ZAR', 'R', 2),
('USD', '$', 2)
ON CONFLICT (code) DO NOTHING;

INSERT INTO countries (code, name, default_currency_code, default_timezone) VALUES
('KE', 'Kenya', 'KES', 'Africa/Nairobi'),
('NG', 'Nigeria', 'NGN', 'Africa/Lagos'),
('GH', 'Ghana', 'GHS', 'Africa/Accra'),
('ZA', 'South Africa', 'ZAR', 'Africa/Johannesburg')
ON CONFLICT (code) DO NOTHING;

INSERT INTO categories (id, name, slug, icon) VALUES
('cat_technology', 'Technology', 'technology', 'laptop'),
('cat_agriculture', 'Agriculture', 'agriculture', 'leaf'),
('cat_manufacturing', 'Manufacturing', 'manufacturing', 'factory'),
('cat_energy', 'Energy', 'energy', 'bolt'),
('cat_finance', 'Finance', 'finance', 'wallet'),
('cat_health', 'Health & Wellness', 'health-wellness', 'heart')
ON CONFLICT (id) DO NOTHING;

-- The default administrator is bootstrapped from environment variables at API startup.
-- Fresh databases intentionally avoid demo users, expos, payments, leads, and notifications.
