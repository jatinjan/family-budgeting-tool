-- Soft launch: Founding20, cap 50 families.
-- Run in the Supabase SQL editor (production). Safe to re-run.

INSERT INTO promo_codes (code, description, max_redemptions, status)
VALUES (
  'FOUNDING20',
  'Soft launch founding family access',
  50,
  'active'
)
ON CONFLICT (code) DO UPDATE
SET
  description = EXCLUDED.description,
  max_redemptions = EXCLUDED.max_redemptions,
  status = 'active';
