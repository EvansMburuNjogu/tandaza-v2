INSERT INTO app_settings (key, value, updated_at)
VALUES (
  'meeting_categories',
  '{"categoryTypes":["Online demo","Sales consultation","Product walkthrough","Partnership discussion","Post-expo follow-up"]}'::jsonb,
  NOW()
)
ON CONFLICT (key) DO NOTHING;

ALTER TABLE meetings DROP CONSTRAINT IF EXISTS meetings_meeting_type_check;
