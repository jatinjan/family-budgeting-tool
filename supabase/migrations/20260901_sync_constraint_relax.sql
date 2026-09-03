-- Relax CHECKs that reject family-app UI strings (docs/specs/sync-layer.md).
-- Children schoolLevel: "Preschool", "Primary School", "Secondary School", "High School", "University"
-- Household housingType: "House - Owned", "House - Rented", "Apartment - Owned", etc.
-- Also allow both bi-monthly and fortnightly on expense_items.
-- Idempotent. Reloads PostgREST schema cache (also re-asserts intention columns).

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS balance_goal TEXT,
  ADD COLUMN IF NOT EXISTS yearly_savings_goal TEXT,
  ADD COLUMN IF NOT EXISTS monthly_buffer TEXT;

DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT c.conname, c.conrelid::regclass AS tbl
    FROM pg_constraint c
    JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = ANY (c.conkey)
    WHERE c.contype = 'c'
      AND (
        (c.conrelid::regclass::text IN ('households', 'public.households') AND a.attname = 'housing_type')
        OR (c.conrelid::regclass::text IN ('children', 'public.children') AND a.attname = 'school_level')
        OR (c.conrelid::regclass::text IN ('expense_items', 'public.expense_items') AND a.attname = 'frequency')
      )
  LOOP
    EXECUTE format('ALTER TABLE %s DROP CONSTRAINT IF EXISTS %I', r.tbl, r.conname);
  END LOOP;
END $$;

ALTER TABLE expense_items DROP CONSTRAINT IF EXISTS expense_items_frequency_check;
ALTER TABLE expense_items
  ADD CONSTRAINT expense_items_frequency_check
  CHECK (frequency IN (
    'weekly', 'fortnightly', 'monthly', 'quarterly', 'term', 'annual', 'bi-monthly'
  ));

NOTIFY pgrst, 'reload schema';
