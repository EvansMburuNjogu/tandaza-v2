ALTER TABLE users
  ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN NOT NULL DEFAULT FALSE;

DO $$
DECLARE
  constraint_name TEXT;
BEGIN
  SELECT conname INTO constraint_name
  FROM pg_constraint
  WHERE conrelid = 'users'::regclass
    AND contype = 'c'
    AND (conname = 'users_role_check' OR pg_get_constraintdef(oid) ILIKE '%role%')
  LIMIT 1;

  IF constraint_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE users DROP CONSTRAINT %I', constraint_name);
  END IF;
END $$;

ALTER TABLE users
  ADD CONSTRAINT users_role_check
  CHECK (role IN ('visitor', 'exhibitor', 'organizer', 'sponsorship', 'administrator', 'super_administrator'));

UPDATE users
SET role = 'super_administrator'
WHERE email = 'admin@tandaza.demo' AND role = 'administrator';
