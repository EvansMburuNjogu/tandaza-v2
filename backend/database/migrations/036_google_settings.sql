INSERT INTO app_settings (key, value)
VALUES ('google', '{"clientId":""}'::jsonb)
ON CONFLICT (key) DO NOTHING;
