UPDATE app_settings
SET value = value - 'status'
WHERE key = 'email';
