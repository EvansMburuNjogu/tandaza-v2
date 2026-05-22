ALTER TABLE sponsor_ads
  ADD COLUMN IF NOT EXISTS expo_id TEXT REFERENCES expos(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_sponsor_ads_expo ON sponsor_ads(expo_id);
