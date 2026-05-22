ALTER TABLE products
  ADD COLUMN IF NOT EXISTS discounted_price_minor BIGINT,
  ADD COLUMN IF NOT EXISTS media_type TEXT NOT NULL DEFAULT 'image' CHECK (media_type IN ('image', 'video')),
  ADD COLUMN IF NOT EXISTS media_url TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS specifications TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS featured BOOLEAN NOT NULL DEFAULT FALSE;

-- Demo product seed removed.
-- Exhibitor products are created through exhibitor workspace workflows.
