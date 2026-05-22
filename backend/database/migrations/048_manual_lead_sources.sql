ALTER TABLE leads DROP CONSTRAINT IF EXISTS leads_source_check;
ALTER TABLE leads
  ADD CONSTRAINT leads_source_check
  CHECK (source IN ('remote', 'remote_visit', 'booth_qr', 'onsite', 'notification', 'inquiry', 'pre_order', 'manual'));
