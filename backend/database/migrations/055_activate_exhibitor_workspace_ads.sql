UPDATE sponsor_ads sa
SET status = 'active',
    payment_status = 'paid'
FROM users u
WHERE u.id = sa.sponsor_id
  AND u.role = 'exhibitor'
  AND sa.expo_id IS NOT NULL
  AND sa.status IN ('draft', 'pending_payment')
  AND sa.payment_status = 'unpaid';
