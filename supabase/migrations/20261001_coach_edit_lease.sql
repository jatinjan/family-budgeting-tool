-- Coach editing: one writer per family budget, enforced in PostgreSQL.
-- Spec: docs/specs/coach-editing.md
-- Idempotent. Run in Supabase SQL Editor (Preview first, then Production).
-- Rollback (does not delete family data):
--   supabase/diagnostics/20261001_coach_edit_lease_rollback.sql

-- =====================================================
-- 1. Admin helper (same definition as rls-policies.sql)
-- =====================================================
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT COALESCE(
    (SELECT is_admin FROM public.profiles WHERE id = auth.uid()),
    false
  );
$$;

REVOKE ALL ON FUNCTION public.is_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin() TO anon;

-- =====================================================
-- 2. Profile columns
-- =====================================================
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS created_by_coach_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

-- Existing and self-signup profiles are claimed at creation. The create-family
-- server route clears this for coach-created families.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS claimed_at TIMESTAMPTZ DEFAULT NOW();

-- Families may update their own profile (intention fields), but never the
-- privilege or ownership columns. Trusted RPCs set app.trusted_profile_write.
CREATE OR REPLACE FUNCTION public.protect_profile_columns()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL
     OR current_setting('app.trusted_profile_write', true) = 'on' THEN
    RETURN NEW;
  END IF;

  IF NEW.is_admin IS DISTINCT FROM OLD.is_admin
     OR NEW.created_by_coach_id IS DISTINCT FROM OLD.created_by_coach_id
     OR NEW.claimed_at IS DISTINCT FROM OLD.claimed_at
     OR NEW.id IS DISTINCT FROM OLD.id THEN
    RAISE EXCEPTION 'PROFILE_COLUMN_PROTECTED' USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_protect_columns ON public.profiles;
CREATE TRIGGER profiles_protect_columns
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.protect_profile_columns();

-- =====================================================
-- 3. Edit lease table
-- =====================================================
CREATE TABLE IF NOT EXISTS public.budget_edit_leases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  coach_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  mode TEXT NOT NULL CHECK (mode IN ('setup', 'assist')),
  status TEXT NOT NULL CHECK (status IN ('requested', 'active', 'ended', 'declined')),
  requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  request_expires_at TIMESTAMPTZ,
  granted_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  ended_by UUID,
  end_reason TEXT CHECK (
    end_reason IN ('coach_done', 'family_took_back', 'claimed', 'declined', 'cancelled', 'expired')
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS budget_edit_leases_one_open
  ON public.budget_edit_leases (user_id)
  WHERE status IN ('requested', 'active');

CREATE INDEX IF NOT EXISTS idx_budget_edit_leases_user
  ON public.budget_edit_leases (user_id, requested_at DESC);

ALTER TABLE public.budget_edit_leases ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Family can view own edit leases" ON public.budget_edit_leases;
CREATE POLICY "Family can view own edit leases"
  ON public.budget_edit_leases FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can view edit leases" ON public.budget_edit_leases;
CREATE POLICY "Admins can view edit leases"
  ON public.budget_edit_leases FOR SELECT
  USING (public.is_admin());

-- No INSERT/UPDATE/DELETE policies: every change goes through the RPCs below.

-- =====================================================
-- 4. Lease helpers
-- =====================================================
CREATE OR REPLACE FUNCTION public.coach_lease_active(p_user UUID)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.budget_edit_leases
    WHERE user_id = p_user
      AND status = 'active'
      AND (expires_at IS NULL OR expires_at > NOW())
  );
$$;

CREATE OR REPLACE FUNCTION public.holds_coach_lease(p_user UUID)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT auth.uid() IS NOT NULL
    AND auth.uid() <> p_user
    AND public.is_admin()
    AND EXISTS (
      SELECT 1 FROM public.budget_edit_leases
      WHERE user_id = p_user
        AND coach_id = auth.uid()
        AND status = 'active'
        AND (expires_at IS NULL OR expires_at > NOW())
    );
$$;

REVOKE ALL ON FUNCTION public.coach_lease_active(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.holds_coach_lease(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.coach_lease_active(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.holds_coach_lease(UUID) TO authenticated;

-- Closes expired requests/leases so the one-open index never blocks a new lease.
CREATE OR REPLACE FUNCTION public.close_stale_edit_leases(p_user UUID)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.budget_edit_leases
  SET status = 'ended', ended_at = NOW(), end_reason = 'expired'
  WHERE user_id = p_user
    AND (
      (status = 'requested' AND request_expires_at <= NOW())
      OR (status = 'active' AND expires_at IS NOT NULL AND expires_at <= NOW())
    );
$$;

REVOKE ALL ON FUNCTION public.close_stale_edit_leases(UUID) FROM PUBLIC;

-- =====================================================
-- 5. Budget table guard + audit
-- =====================================================
CREATE OR REPLACE FUNCTION public.enforce_budget_edit_lease()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_family UUID;
BEGIN
  IF v_uid IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  IF TG_OP = 'DELETE' THEN
    v_family := OLD.user_id;
  ELSE
    v_family := NEW.user_id;
  END IF;

  IF TG_OP = 'UPDATE' AND NEW.user_id IS DISTINCT FROM OLD.user_id THEN
    RAISE EXCEPTION 'BUDGET_OWNER_CHANGE' USING ERRCODE = 'P0001';
  END IF;

  IF v_uid = v_family THEN
    IF public.coach_lease_active(v_family) THEN
      RAISE EXCEPTION 'BUDGET_LOCKED'
        USING ERRCODE = 'P0001', HINT = 'A coach is editing this budget.';
    END IF;
    RETURN COALESCE(NEW, OLD);
  END IF;

  IF public.holds_coach_lease(v_family) THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  RAISE EXCEPTION 'COACH_LEASE_REQUIRED' USING ERRCODE = 'P0001';
END;
$$;

CREATE OR REPLACE FUNCTION public.set_budget_updated_by()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_by := auth.uid();
  RETURN NEW;
END;
$$;

DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOREACH tbl IN ARRAY ARRAY['households', 'adults', 'children', 'categories', 'expense_items']
  LOOP
    EXECUTE format('ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS updated_by UUID', tbl);

    EXECUTE format('DROP TRIGGER IF EXISTS %I ON public.%I', tbl || '_edit_lease_guard', tbl);
    EXECUTE format(
      'CREATE TRIGGER %I BEFORE INSERT OR UPDATE OR DELETE ON public.%I
       FOR EACH ROW EXECUTE FUNCTION public.enforce_budget_edit_lease()',
      tbl || '_edit_lease_guard', tbl
    );

    EXECUTE format('DROP TRIGGER IF EXISTS %I ON public.%I', tbl || '_set_updated_by', tbl);
    EXECUTE format(
      'CREATE TRIGGER %I BEFORE INSERT OR UPDATE ON public.%I
       FOR EACH ROW EXECUTE FUNCTION public.set_budget_updated_by()',
      tbl || '_set_updated_by', tbl
    );

    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'Coach lease can insert', tbl);
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR INSERT WITH CHECK (public.holds_coach_lease(user_id))',
      'Coach lease can insert', tbl
    );

    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'Coach lease can update', tbl);
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR UPDATE
       USING (public.holds_coach_lease(user_id)) WITH CHECK (public.holds_coach_lease(user_id))',
      'Coach lease can update', tbl
    );

    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'Coach lease can delete', tbl);
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR DELETE USING (public.holds_coach_lease(user_id))',
      'Coach lease can delete', tbl
    );
  END LOOP;
END $$;

-- =====================================================
-- 6. Activity log helper
-- =====================================================
CREATE OR REPLACE FUNCTION public.log_coach_event(
  p_family UUID,
  p_event TEXT,
  p_message TEXT,
  p_metadata JSONB DEFAULT NULL
)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  INSERT INTO public.activity_log (user_id, family_name, event_type, message, metadata)
  SELECT p.id, COALESCE(NULLIF(p.family_name, ''), p.email), p_event, p_message,
         COALESCE(p_metadata, '{}'::jsonb) || jsonb_build_object('actor_id', auth.uid())
  FROM public.profiles p
  WHERE p.id = p_family;
$$;

REVOKE ALL ON FUNCTION public.log_coach_event(UUID, TEXT, TEXT, JSONB) FROM PUBLIC;

-- =====================================================
-- 7. Lease RPCs
-- =====================================================
CREATE OR REPLACE FUNCTION public.coach_start_setup(p_family UUID)
RETURNS public.budget_edit_leases
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile public.profiles;
  v_open public.budget_edit_leases;
  v_lease public.budget_edit_leases;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'NOT_ADMIN' USING ERRCODE = '42501';
  END IF;
  IF p_family = auth.uid() THEN
    RAISE EXCEPTION 'CANNOT_EDIT_SELF' USING ERRCODE = 'P0001';
  END IF;

  SELECT * INTO v_profile FROM public.profiles WHERE id = p_family FOR UPDATE;
  IF v_profile.id IS NULL THEN
    RAISE EXCEPTION 'FAMILY_NOT_FOUND' USING ERRCODE = 'P0001';
  END IF;
  IF v_profile.claimed_at IS NOT NULL THEN
    RAISE EXCEPTION 'FAMILY_ALREADY_CLAIMED' USING ERRCODE = 'P0001';
  END IF;

  PERFORM public.close_stale_edit_leases(p_family);

  SELECT * INTO v_open FROM public.budget_edit_leases
  WHERE user_id = p_family AND status IN ('requested', 'active');
  IF v_open.id IS NOT NULL THEN
    IF v_open.coach_id = auth.uid() AND v_open.mode = 'setup' THEN
      RETURN v_open;
    END IF;
    RAISE EXCEPTION 'LEASE_HELD' USING ERRCODE = 'P0001';
  END IF;

  INSERT INTO public.budget_edit_leases (user_id, coach_id, mode, status, granted_at)
  VALUES (p_family, auth.uid(), 'setup', 'active', NOW())
  RETURNING * INTO v_lease;

  PERFORM public.log_coach_event(p_family, 'coach_setup_started', 'Coach started setting up this budget');
  RETURN v_lease;
END;
$$;

CREATE OR REPLACE FUNCTION public.coach_request_assist(p_family UUID)
RETURNS public.budget_edit_leases
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile public.profiles;
  v_open public.budget_edit_leases;
  v_lease public.budget_edit_leases;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'NOT_ADMIN' USING ERRCODE = '42501';
  END IF;
  IF p_family = auth.uid() THEN
    RAISE EXCEPTION 'CANNOT_EDIT_SELF' USING ERRCODE = 'P0001';
  END IF;

  SELECT * INTO v_profile FROM public.profiles WHERE id = p_family FOR UPDATE;
  IF v_profile.id IS NULL THEN
    RAISE EXCEPTION 'FAMILY_NOT_FOUND' USING ERRCODE = 'P0001';
  END IF;
  IF v_profile.claimed_at IS NULL THEN
    RAISE EXCEPTION 'FAMILY_NOT_CLAIMED' USING ERRCODE = 'P0001';
  END IF;

  PERFORM public.close_stale_edit_leases(p_family);

  SELECT * INTO v_open FROM public.budget_edit_leases
  WHERE user_id = p_family AND status IN ('requested', 'active');
  IF v_open.id IS NOT NULL THEN
    IF v_open.coach_id = auth.uid() AND v_open.mode = 'assist' THEN
      RETURN v_open;
    END IF;
    RAISE EXCEPTION 'LEASE_HELD' USING ERRCODE = 'P0001';
  END IF;

  INSERT INTO public.budget_edit_leases (user_id, coach_id, mode, status, request_expires_at)
  VALUES (p_family, auth.uid(), 'assist', 'requested', NOW() + INTERVAL '15 minutes')
  RETURNING * INTO v_lease;

  PERFORM public.log_coach_event(p_family, 'coach_assist_requested', 'Coach asked to help fill in the budget');
  RETURN v_lease;
END;
$$;

CREATE OR REPLACE FUNCTION public.family_respond_assist(p_lease UUID, p_accept BOOLEAN)
RETURNS public.budget_edit_leases
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_lease public.budget_edit_leases;
BEGIN
  SELECT * INTO v_lease FROM public.budget_edit_leases
  WHERE id = p_lease
    AND user_id = auth.uid()
    AND status = 'requested'
    AND request_expires_at > NOW()
  FOR UPDATE;

  IF v_lease.id IS NULL THEN
    RAISE EXCEPTION 'REQUEST_NOT_FOUND' USING ERRCODE = 'P0001';
  END IF;

  IF p_accept THEN
    UPDATE public.budget_edit_leases
    SET status = 'active', granted_at = NOW(), expires_at = NOW() + INTERVAL '90 minutes'
    WHERE id = p_lease
    RETURNING * INTO v_lease;
    PERFORM public.log_coach_event(auth.uid(), 'coach_assist_accepted', 'Family let the coach fill in their budget');
  ELSE
    UPDATE public.budget_edit_leases
    SET status = 'declined', ended_at = NOW(), ended_by = auth.uid(), end_reason = 'declined'
    WHERE id = p_lease
    RETURNING * INTO v_lease;
    PERFORM public.log_coach_event(auth.uid(), 'coach_assist_declined', 'Family declined the coach request');
  END IF;

  RETURN v_lease;
END;
$$;

CREATE OR REPLACE FUNCTION public.end_edit_lease(p_lease UUID)
RETURNS public.budget_edit_leases
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_lease public.budget_edit_leases;
  v_reason TEXT;
BEGIN
  SELECT * INTO v_lease FROM public.budget_edit_leases
  WHERE id = p_lease AND status IN ('requested', 'active')
  FOR UPDATE;

  IF v_lease.id IS NULL THEN
    RAISE EXCEPTION 'LEASE_NOT_FOUND' USING ERRCODE = 'P0001';
  END IF;

  IF auth.uid() = v_lease.coach_id AND public.is_admin() THEN
    v_reason := CASE WHEN v_lease.status = 'requested' THEN 'cancelled' ELSE 'coach_done' END;
  ELSIF auth.uid() = v_lease.user_id THEN
    v_reason := CASE WHEN v_lease.status = 'requested' THEN 'declined' ELSE 'family_took_back' END;
  ELSE
    RAISE EXCEPTION 'NOT_LEASE_PARTY' USING ERRCODE = '42501';
  END IF;

  UPDATE public.budget_edit_leases
  SET status = CASE WHEN v_reason = 'declined' THEN 'declined' ELSE 'ended' END,
      ended_at = NOW(),
      ended_by = auth.uid(),
      end_reason = v_reason
  WHERE id = p_lease
  RETURNING * INTO v_lease;

  PERFORM public.log_coach_event(
    v_lease.user_id,
    'coach_lease_ended',
    'Coach editing ended (' || v_reason || ')',
    jsonb_build_object('mode', v_lease.mode, 'reason', v_reason)
  );
  RETURN v_lease;
END;
$$;

CREATE OR REPLACE FUNCTION public.claim_family_budget()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_claimed UUID;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN false;
  END IF;

  PERFORM set_config('app.trusted_profile_write', 'on', true);
  UPDATE public.profiles
  SET claimed_at = NOW()
  WHERE id = auth.uid() AND claimed_at IS NULL
  RETURNING id INTO v_claimed;
  PERFORM set_config('app.trusted_profile_write', 'off', true);

  IF v_claimed IS NULL THEN
    RETURN false;
  END IF;

  UPDATE public.budget_edit_leases
  SET status = 'ended', ended_at = NOW(), ended_by = auth.uid(), end_reason = 'claimed'
  WHERE user_id = auth.uid() AND mode = 'setup' AND status IN ('requested', 'active');

  PERFORM public.log_coach_event(auth.uid(), 'family_claimed', 'Family signed in and took over their budget');
  RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_my_edit_state()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
DECLARE
  v_lease public.budget_edit_leases;
  v_coach TEXT;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN jsonb_build_object('locked', false);
  END IF;

  SELECT * INTO v_lease FROM public.budget_edit_leases
  WHERE user_id = auth.uid()
    AND (
      (status = 'active' AND (expires_at IS NULL OR expires_at > NOW()))
      OR (status = 'requested' AND request_expires_at > NOW())
    )
  ORDER BY requested_at DESC
  LIMIT 1;

  IF v_lease.id IS NULL THEN
    RETURN jsonb_build_object('locked', false);
  END IF;

  SELECT COALESCE(NULLIF(family_name, ''), split_part(email, '@', 1)) INTO v_coach
  FROM public.profiles WHERE id = v_lease.coach_id;

  RETURN jsonb_build_object(
    'locked', v_lease.status = 'active',
    'lease_id', v_lease.id,
    'mode', v_lease.mode,
    'status', v_lease.status,
    'coach_name', COALESCE(v_coach, 'Your coach'),
    'expires_at', v_lease.expires_at,
    'request_expires_at', v_lease.request_expires_at
  );
END;
$$;

-- =====================================================
-- 8. Coach entity RPCs (SECURITY INVOKER: RLS + guard trigger apply)
-- =====================================================
-- p_categories: [{ name, description, is_percentage_based, percentage_value,
--                  sort_order, items: [{ name, cost, frequency, quantity, total, need_want }] }]
CREATE OR REPLACE FUNCTION public.coach_create_entity(
  p_family UUID,
  p_entity_type TEXT,
  p_fields JSONB,
  p_categories JSONB
)
RETURNS UUID
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_entity UUID;
  v_category UUID;
  v_cat JSONB;
  v_item JSONB;
BEGIN
  IF p_entity_type = 'child' THEN
    INSERT INTO public.children (user_id, name, age, school_level)
    VALUES (
      p_family,
      p_fields->>'name',
      NULLIF(p_fields->>'age', '')::INTEGER,
      p_fields->>'school_level'
    )
    RETURNING id INTO v_entity;
  ELSIF p_entity_type = 'adult' THEN
    INSERT INTO public.adults (user_id, name, age)
    VALUES (p_family, p_fields->>'name', NULLIF(p_fields->>'age', '')::INTEGER)
    RETURNING id INTO v_entity;
  ELSIF p_entity_type = 'household' THEN
    INSERT INTO public.households (user_id, name, housing_type, members)
    VALUES (
      p_family,
      p_fields->>'name',
      p_fields->>'housing_type',
      COALESCE(NULLIF(p_fields->>'members', '')::INTEGER, 1)
    )
    RETURNING id INTO v_entity;
  ELSE
    RAISE EXCEPTION 'INVALID_ENTITY_TYPE' USING ERRCODE = 'P0001';
  END IF;

  FOR v_cat IN SELECT * FROM jsonb_array_elements(COALESCE(p_categories, '[]'::jsonb))
  LOOP
    INSERT INTO public.categories (
      user_id, entity_type, entity_id, name, description,
      is_percentage_based, percentage_value, sort_order
    )
    VALUES (
      p_family,
      p_entity_type,
      v_entity,
      v_cat->>'name',
      v_cat->>'description',
      COALESCE((v_cat->>'is_percentage_based')::BOOLEAN, false),
      COALESCE((v_cat->>'percentage_value')::NUMERIC, 15),
      COALESCE((v_cat->>'sort_order')::INTEGER, 0)
    )
    RETURNING id INTO v_category;

    FOR v_item IN SELECT * FROM jsonb_array_elements(COALESCE(v_cat->'items', '[]'::jsonb))
    LOOP
      INSERT INTO public.expense_items (
        user_id, category_id, name, cost, frequency, quantity, total, need_want
      )
      VALUES (
        p_family,
        v_category,
        v_item->>'name',
        COALESCE((v_item->>'cost')::NUMERIC, 0),
        COALESCE(v_item->>'frequency', 'annual'),
        COALESCE((v_item->>'quantity')::INTEGER, 1),
        COALESCE((v_item->>'total')::NUMERIC, 0),
        NULLIF(v_item->>'need_want', '')
      );
    END LOOP;
  END LOOP;

  RETURN v_entity;
END;
$$;

CREATE OR REPLACE FUNCTION public.coach_delete_entity(
  p_family UUID,
  p_entity_type TEXT,
  p_entity UUID
)
RETURNS void
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.categories
  WHERE user_id = p_family AND entity_type = p_entity_type AND entity_id = p_entity;

  IF p_entity_type = 'child' THEN
    DELETE FROM public.children WHERE id = p_entity AND user_id = p_family;
  ELSIF p_entity_type = 'adult' THEN
    DELETE FROM public.adults WHERE id = p_entity AND user_id = p_family;
  ELSIF p_entity_type = 'household' THEN
    DELETE FROM public.households WHERE id = p_entity AND user_id = p_family;
  ELSE
    RAISE EXCEPTION 'INVALID_ENTITY_TYPE' USING ERRCODE = 'P0001';
  END IF;
END;
$$;

-- =====================================================
-- 9. Grants
-- =====================================================
REVOKE ALL ON FUNCTION public.coach_start_setup(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.coach_request_assist(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.family_respond_assist(UUID, BOOLEAN) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.end_edit_lease(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.claim_family_budget() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_my_edit_state() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.coach_create_entity(UUID, TEXT, JSONB, JSONB) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.coach_delete_entity(UUID, TEXT, UUID) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.coach_start_setup(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.coach_request_assist(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.family_respond_assist(UUID, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION public.end_edit_lease(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.claim_family_budget() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_edit_state() TO authenticated;
GRANT EXECUTE ON FUNCTION public.coach_create_entity(UUID, TEXT, JSONB, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION public.coach_delete_entity(UUID, TEXT, UUID) TO authenticated;

-- =====================================================
-- 10. Realtime
-- =====================================================
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.budget_edit_leases;
EXCEPTION
  WHEN duplicate_object THEN NULL;
  WHEN undefined_object THEN NULL;
END $$;

NOTIFY pgrst, 'reload schema';
