UPDATE app_settings
SET value = value - 'status'
WHERE key IN ('sms', 'paystack', 'whatsapp');
