-- Rollback for supabase/migrations/20261001_coach_edit_lease.sql
-- Run in the Supabase SQL Editor if families cannot save after that migration.
--
-- This restores family writes immediately. It does not delete family budget
-- rows, auth users, activity_log, or the is_admin self-update protection.
-- Extra columns (claimed_at, created_by_coach_id, updated_by) stay; they are unused.
--
-- After this SQL: also revert the Vercel deploy if you want the admin "Add family"
-- UI gone. The family app treats a missing get_my_edit_state() as unlocked.

-- 1. Drop the write guard first. Families can save after this block even if you stop here.
DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOREACH tbl IN ARRAY ARRAY['households', 'adults', 'children', 'categories', 'expense_items']
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS %I ON public.%I', tbl || '_edit_lease_guard', tbl);
    EXECUTE format('DROP TRIGGER IF EXISTS %I ON public.%I', tbl || '_set_updated_by', tbl);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'Coach lease can insert', tbl);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'Coach lease can update', tbl);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'Coach lease can delete', tbl);
  END LOOP;
END $$;

-- 2. Lease RPCs and helpers (signatures must match the migration)
DROP FUNCTION IF EXISTS public.coach_start_setup(UUID);
DROP FUNCTION IF EXISTS public.coach_request_assist(UUID);
DROP FUNCTION IF EXISTS public.family_respond_assist(UUID, BOOLEAN);
DROP FUNCTION IF EXISTS public.end_edit_lease(UUID);
DROP FUNCTION IF EXISTS public.claim_family_budget();
DROP FUNCTION IF EXISTS public.get_my_edit_state();
DROP FUNCTION IF EXISTS public.coach_create_entity(UUID, TEXT, JSONB, JSONB);
DROP FUNCTION IF EXISTS public.coach_delete_entity(UUID, TEXT, UUID);
DROP FUNCTION IF EXISTS public.log_coach_event(UUID, TEXT, TEXT, JSONB);
DROP FUNCTION IF EXISTS public.close_stale_edit_leases(UUID);
DROP FUNCTION IF EXISTS public.holds_coach_lease(UUID);
DROP FUNCTION IF EXISTS public.coach_lease_active(UUID);
DROP FUNCTION IF EXISTS public.enforce_budget_edit_lease();
DROP FUNCTION IF EXISTS public.set_budget_updated_by();

-- 3. Lease table (policies and indexes go with it)
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime DROP TABLE public.budget_edit_leases;
EXCEPTION
  WHEN undefined_object THEN NULL;
  WHEN undefined_table THEN NULL;
END $$;

DROP TABLE IF EXISTS public.budget_edit_leases;

-- Do not drop public.is_admin() — it already existed.
-- Do not drop profiles_protect_columns — that is the is_admin hole fix, not the feature.

NOTIFY pgrst, 'reload schema';
