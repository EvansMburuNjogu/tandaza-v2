ALTER TABLE payments
ADD COLUMN IF NOT EXISTS processing_fee_minor BIGINT NOT NULL DEFAULT 0;

UPDATE app_settings
SET value = value || '{"processingFeeBps":10}'::jsonb,
    updated_at = NOW()
WHERE key = 'paystack' AND NOT (value ? 'processingFeeBps');

INSERT INTO app_settings (key, value, updated_at)
VALUES ('paystack', '{"publicKey":"","secretKey":"","callbackUrl":"","processingFeeBps":10}'::jsonb, NOW())
ON CONFLICT (key) DO NOTHING;
