UPDATE app_settings
SET value = value - 'webhookSecret',
    updated_at = NOW()
WHERE key = 'paystack';
