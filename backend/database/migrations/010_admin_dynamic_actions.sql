ALTER TABLE sponsor_plans DROP CONSTRAINT IF EXISTS sponsor_plans_status_check;
ALTER TABLE sponsor_plans ADD CONSTRAINT sponsor_plans_status_check CHECK (status IN ('active', 'inactive', 'archived'));

INSERT INTO app_settings (key, value)
VALUES
('paystack', '{"publicKey":"","secretKey":"","callbackUrl":""}'::jsonb),
('whatsapp', '{"provider":"","accountSid":"","authToken":"","fromNumber":"","webhookUrl":""}'::jsonb)
ON CONFLICT (key) DO NOTHING;
