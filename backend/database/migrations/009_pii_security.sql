ALTER TABLE users ADD COLUMN IF NOT EXISTS email_hash TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_cipher TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS name_cipher TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS company_name_cipher TEXT;

CREATE INDEX IF NOT EXISTS idx_users_email_hash ON users(email_hash);
