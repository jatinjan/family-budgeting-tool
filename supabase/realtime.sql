-- Enable live updates for family budget tables.
-- Run once in Supabase → SQL Editor if consultation does not show "Live".

DO $$
DECLARE
  tbl text;
BEGIN
  FOREACH tbl IN ARRAY ARRAY['profiles', 'households', 'adults', 'children', 'categories', 'expense_items']
  LOOP
    BEGIN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE %I', tbl);
    EXCEPTION
      WHEN duplicate_object THEN NULL;
      WHEN undefined_object THEN NULL;
    END;
  END LOOP;
END $$;
