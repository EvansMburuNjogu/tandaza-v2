ALTER TABLE sponsor_plans
  ADD COLUMN IF NOT EXISTS country_code CHAR(2) REFERENCES countries(code);

UPDATE sponsor_plans
SET country_code = 'KE'
WHERE country_code IS NULL;

ALTER TABLE sponsor_plans
  ALTER COLUMN country_code SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_users_country_role ON users(country_code, role);
CREATE INDEX IF NOT EXISTS idx_sponsor_plans_country_status ON sponsor_plans(country_code, status);
