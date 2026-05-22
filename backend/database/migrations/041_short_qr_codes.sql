DO $$
DECLARE
  row_item RECORD;
  alphabet TEXT := 'abcdefghijklmnopqrstuvwxyz0123456789';
  candidate TEXT;
  i INTEGER;
BEGIN
  FOR row_item IN
    SELECT id
    FROM qr_codes
    WHERE code !~ '^[a-z0-9]{6}$'
       OR code IS NULL
  LOOP
    LOOP
      candidate := '';
      FOR i IN 1..6 LOOP
        candidate := candidate || substr(alphabet, floor(random() * length(alphabet) + 1)::int, 1);
      END LOOP;

      EXIT WHEN NOT EXISTS (
        SELECT 1 FROM qr_codes WHERE lower(code) = lower(candidate)
      );
    END LOOP;

    UPDATE qr_codes SET code = candidate WHERE id = row_item.id;
  END LOOP;
END $$;
