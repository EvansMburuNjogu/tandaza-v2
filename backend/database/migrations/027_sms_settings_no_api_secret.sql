UPDATE app_settings
SET value = value - 'apiSecret',
    updated_at = NOW()
WHERE key = 'sms';
