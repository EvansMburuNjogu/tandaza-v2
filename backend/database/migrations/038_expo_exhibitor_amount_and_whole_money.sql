ALTER TABLE expo_exhibitors
ADD COLUMN IF NOT EXISTS amount_minor BIGINT NOT NULL DEFAULT 0;

UPDATE expos
SET exhibitor_activation_fee_minor = (ROUND(exhibitor_activation_fee_minor / 100.0) * 100)::BIGINT,
    ads_addon_fee_minor = (ROUND(COALESCE(ads_addon_fee_minor, 0) / 100.0) * 100)::BIGINT,
    updated_at = NOW()
WHERE exhibitor_activation_fee_minor % 100 <> 0
   OR COALESCE(ads_addon_fee_minor, 0) % 100 <> 0;

UPDATE payments p
SET amount_minor = e.exhibitor_activation_fee_minor + CASE
      WHEN p.amount_minor >= e.exhibitor_activation_fee_minor + COALESCE(e.ads_addon_fee_minor, 0) - 50
      THEN COALESCE(e.ads_addon_fee_minor, 0)
      ELSE 0
    END
FROM expos e
WHERE p.expo_id = e.id
  AND p.status = 'pending'
  AND p.purpose = 'exhibitor_activation'
  AND p.amount_minor % 100 <> 0;
