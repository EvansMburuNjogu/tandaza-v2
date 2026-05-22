ALTER TABLE leads ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}'::jsonb;

-- Demo visitor timeline, QR, and lead seed records removed.
-- These records are created dynamically when visitors interact with expos.
