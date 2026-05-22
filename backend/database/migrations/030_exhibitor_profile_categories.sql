ALTER TABLE exhibitor_profiles ADD COLUMN IF NOT EXISTS categories TEXT[] NOT NULL DEFAULT '{}';
