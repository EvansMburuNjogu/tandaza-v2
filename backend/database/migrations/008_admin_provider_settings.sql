CREATE TABLE IF NOT EXISTS app_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO app_settings (key, value)
VALUES
('email', '{"senderName":"Tandaza","senderEmail":"notifications@tandaza.africa","smtpHost":"","smtpPort":587,"username":"","password":"","encryption":"starttls"}'::jsonb),
('sms', '{"provider":"tiaraconnect","senderId":"CONNECT","apiKey":""}'::jsonb)
ON CONFLICT (key) DO NOTHING;
