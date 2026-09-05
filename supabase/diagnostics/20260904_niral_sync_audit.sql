-- Read-only production evidence pack for cross-device sync.
-- Run in Supabase SQL Editor. This script does not modify data.

-- 1. Account and Balance intention
SELECT
  p.id,
  p.email,
  p.family_name,
  p.balance_goal,
  p.yearly_savings_goal,
  p.monthly_buffer,
  p.last_active_at
FROM public.profiles p
WHERE lower(p.email) = lower('niral_15@hotmail.com');

-- 2. Cloud row inventory
WITH target AS (
  SELECT id
  FROM public.profiles
  WHERE lower(email) = lower('niral_15@hotmail.com')
)
SELECT 'adults' AS table_name, count(*) AS row_count
FROM public.adults
WHERE user_id = (SELECT id FROM target)
UNION ALL
SELECT 'children', count(*)
FROM public.children
WHERE user_id = (SELECT id FROM target)
UNION ALL
SELECT 'households', count(*)
FROM public.households
WHERE user_id = (SELECT id FROM target)
UNION ALL
SELECT 'categories', count(*)
FROM public.categories
WHERE user_id = (SELECT id FROM target)
UNION ALL
SELECT 'expense_items', count(*)
FROM public.expense_items
WHERE user_id = (SELECT id FROM target);

-- 3. Entity details
WITH target AS (
  SELECT id
  FROM public.profiles
  WHERE lower(email) = lower('niral_15@hotmail.com')
)
SELECT 'adult' AS entity_type, id, name, age, NULL::text AS detail
FROM public.adults
WHERE user_id = (SELECT id FROM target)
UNION ALL
SELECT 'child', id, name, age, school_level
FROM public.children
WHERE user_id = (SELECT id FROM target)
UNION ALL
SELECT 'household', id, name, members AS age, housing_type
FROM public.households
WHERE user_id = (SELECT id FROM target)
ORDER BY entity_type, name;

-- 4. Category and item totals by entity
WITH target AS (
  SELECT id
  FROM public.profiles
  WHERE lower(email) = lower('niral_15@hotmail.com')
)
SELECT
  c.entity_type,
  c.entity_id,
  count(DISTINCT c.id) AS category_count,
  count(ei.id) AS item_count,
  COALESCE(sum(ei.total), 0) AS annual_total
FROM public.categories c
LEFT JOIN public.expense_items ei
  ON ei.category_id = c.id
 AND ei.user_id = c.user_id
WHERE c.user_id = (SELECT id FROM target)
GROUP BY c.entity_type, c.entity_id
ORDER BY c.entity_type, c.entity_id;

-- 5. Orphan or cross-user category parents
WITH target AS (
  SELECT id
  FROM public.profiles
  WHERE lower(email) = lower('niral_15@hotmail.com')
)
SELECT c.id, c.entity_type, c.entity_id, c.name
FROM public.categories c
WHERE c.user_id = (SELECT id FROM target)
  AND (
    (c.entity_type = 'child' AND NOT EXISTS (
      SELECT 1 FROM public.children x
      WHERE x.id = c.entity_id AND x.user_id = c.user_id
    ))
    OR
    (c.entity_type = 'adult' AND NOT EXISTS (
      SELECT 1 FROM public.adults x
      WHERE x.id = c.entity_id AND x.user_id = c.user_id
    ))
    OR
    (c.entity_type = 'household' AND NOT EXISTS (
      SELECT 1 FROM public.households x
      WHERE x.id = c.entity_id AND x.user_id = c.user_id
    ))
  );

-- 6. Orphan or cross-user expense items
WITH target AS (
  SELECT id
  FROM public.profiles
  WHERE lower(email) = lower('niral_15@hotmail.com')
)
SELECT ei.id, ei.name, ei.category_id, ei.frequency
FROM public.expense_items ei
LEFT JOIN public.categories c
  ON c.id = ei.category_id
 AND c.user_id = ei.user_id
WHERE ei.user_id = (SELECT id FROM target)
  AND c.id IS NULL;

-- 7. Active sync-sensitive CHECK constraints
SELECT
  c.conrelid::regclass AS table_name,
  c.conname,
  pg_get_constraintdef(c.oid) AS definition
FROM pg_constraint c
WHERE c.contype = 'c'
  AND c.conrelid IN (
    'public.children'::regclass,
    'public.households'::regclass,
    'public.expense_items'::regclass
  )
ORDER BY table_name, c.conname;

-- 8. Realtime publication membership
SELECT schemaname, tablename
FROM pg_publication_tables
WHERE pubname = 'supabase_realtime'
  AND tablename IN (
    'profiles',
    'households',
    'adults',
    'children',
    'categories',
    'expense_items'
  )
ORDER BY tablename;

-- 9. RLS policy shape
SELECT tablename, policyname, cmd, qual, with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN (
    'profiles',
    'households',
    'adults',
    'children',
    'categories',
    'expense_items'
  )
ORDER BY tablename, policyname;
