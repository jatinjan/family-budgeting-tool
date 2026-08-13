-- =====================================================
-- My Balanced Family Finances — Supabase Schema
-- =====================================================
-- Run this SQL in Supabase SQL Editor (Dashboard → SQL Editor → New query)
-- This script is idempotent — safe to run multiple times
-- =====================================================

-- =====================================================
-- EXTENSIONS
-- =====================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- CUSTOM TYPES
-- =====================================================

-- Onboarding status enum
DO $$ BEGIN
  CREATE TYPE onboarding_status AS ENUM (
    'signed_up',
    'profile_complete',
    'budget_started',
    'plan_complete'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Entity type enum (for categories)
DO $$ BEGIN
  CREATE TYPE entity_type AS ENUM (
    'child',
    'adult',
    'household'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Frequency enum (for expense items)
DO $$ BEGIN
  CREATE TYPE frequency_type AS ENUM (
    'weekly',
    'fortnightly',
    'monthly',
    'quarterly',
    'term',
    'annual'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Need/want enum
DO $$ BEGIN
  CREATE TYPE need_want_type AS ENUM (
    'need',
    'want'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Promo code status
DO $$ BEGIN
  CREATE TYPE promo_status AS ENUM (
    'active',
    'expired'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- =====================================================
-- TABLES
-- =====================================================

-- -----------------------------------------------------
-- profiles
-- Extends auth.users with app-specific data
-- Created automatically via trigger on signup
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  family_name TEXT,
  is_admin BOOLEAN NOT NULL DEFAULT FALSE,
  promo_code_used TEXT,
  onboarding_status TEXT NOT NULL DEFAULT 'signed_up' 
    CHECK (onboarding_status IN ('signed_up', 'profile_complete', 'budget_started', 'plan_complete')),
  signed_up_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_active_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE profiles IS 'User profiles extending Supabase auth.users';
COMMENT ON COLUMN profiles.onboarding_status IS 'Tracks user progress through onboarding';
COMMENT ON COLUMN profiles.promo_code_used IS 'Attribution tracking for signups';

-- -----------------------------------------------------
-- households
-- Each user has exactly one household
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS households (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  housing_type TEXT,
  members INTEGER NOT NULL DEFAULT 1 CHECK (members >= 1),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT households_user_id_unique UNIQUE (user_id)
);

COMMENT ON TABLE households IS 'User household information (one per user)';
COMMENT ON COLUMN households.housing_type IS 'rent, own, other';

-- -----------------------------------------------------
-- adults
-- Family adults (other than the primary user)
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS adults (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  age INTEGER CHECK (age IS NULL OR (age >= 18 AND age <= 120)),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE adults IS 'Adult family members for budget allocation';

-- -----------------------------------------------------
-- children
-- Family children
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS children (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  age INTEGER CHECK (age IS NULL OR (age >= 0 AND age <= 25)),
  school_level TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE children IS 'Child family members for budget allocation';
COMMENT ON COLUMN children.school_level IS 'preschool, primary, secondary, university, other';

-- -----------------------------------------------------
-- categories
-- Budget categories for each entity (child/adult/household)
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('child', 'adult', 'household')),
  entity_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  is_percentage_based BOOLEAN NOT NULL DEFAULT FALSE,
  percentage_value NUMERIC(5,2) NOT NULL DEFAULT 15.00 CHECK (percentage_value >= 0 AND percentage_value <= 100),
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE categories IS 'Budget categories grouped by entity';
COMMENT ON COLUMN categories.entity_type IS 'Type of entity: child, adult, or household';
COMMENT ON COLUMN categories.entity_id IS 'FK to children.id, adults.id, or households.id';
COMMENT ON COLUMN categories.is_percentage_based IS 'If true, total is calculated as % of other categories (e.g., Miscellaneous)';

-- -----------------------------------------------------
-- expense_items
-- Individual expense items within categories
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS expense_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  cost NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (cost >= 0),
  frequency TEXT NOT NULL DEFAULT 'monthly' 
    CHECK (frequency IN ('weekly', 'fortnightly', 'monthly', 'quarterly', 'term', 'annual')),
  quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity >= 1),
  total NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (total >= 0),
  need_want TEXT CHECK (need_want IS NULL OR need_want IN ('need', 'want')),
  adjusted_total NUMERIC(12,2) CHECK (adjusted_total IS NULL OR adjusted_total >= 0),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE expense_items IS 'Individual budget line items';
COMMENT ON COLUMN expense_items.total IS 'Calculated: cost × quantity × frequency_multiplier';
COMMENT ON COLUMN expense_items.need_want IS 'Planning mode classification';
COMMENT ON COLUMN expense_items.adjusted_total IS 'User-adjusted amount for planning mode';

-- -----------------------------------------------------
-- promo_codes
-- Promo codes for attribution tracking
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS promo_codes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code TEXT NOT NULL,
  description TEXT,
  redemptions INTEGER NOT NULL DEFAULT 0 CHECK (redemptions >= 0),
  max_redemptions INTEGER CHECK (max_redemptions IS NULL OR max_redemptions >= 0),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'expired')),
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT promo_codes_code_unique UNIQUE (code)
);

COMMENT ON TABLE promo_codes IS 'Promo codes for signup attribution';

-- -----------------------------------------------------
-- activity_log
-- Admin activity tracking
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS activity_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  family_name TEXT,
  event_type TEXT NOT NULL,
  message TEXT NOT NULL,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE activity_log IS 'Activity log for admin dashboard';
COMMENT ON COLUMN activity_log.event_type IS 'signup, login, budget_update, promo_redemption, etc.';

-- =====================================================
-- INDEXES
-- =====================================================

-- profiles
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_is_admin ON profiles(is_admin) WHERE is_admin = TRUE;
CREATE INDEX IF NOT EXISTS idx_profiles_promo_code ON profiles(promo_code_used) WHERE promo_code_used IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_profiles_signed_up_at ON profiles(signed_up_at DESC);

-- households
CREATE INDEX IF NOT EXISTS idx_households_user_id ON households(user_id);

-- adults
CREATE INDEX IF NOT EXISTS idx_adults_user_id ON adults(user_id);

-- children
CREATE INDEX IF NOT EXISTS idx_children_user_id ON children(user_id);

-- categories
CREATE INDEX IF NOT EXISTS idx_categories_user_id ON categories(user_id);
CREATE INDEX IF NOT EXISTS idx_categories_entity ON categories(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_categories_user_entity ON categories(user_id, entity_type, entity_id);

-- expense_items
CREATE INDEX IF NOT EXISTS idx_expense_items_user_id ON expense_items(user_id);
CREATE INDEX IF NOT EXISTS idx_expense_items_category_id ON expense_items(category_id);
CREATE INDEX IF NOT EXISTS idx_expense_items_need_want ON expense_items(need_want) WHERE need_want IS NOT NULL;

-- promo_codes
CREATE INDEX IF NOT EXISTS idx_promo_codes_code ON promo_codes(code);
CREATE INDEX IF NOT EXISTS idx_promo_codes_status ON promo_codes(status);

-- activity_log
CREATE INDEX IF NOT EXISTS idx_activity_log_user_id ON activity_log(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_created_at ON activity_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_log_event_type ON activity_log(event_type);

-- =====================================================
-- TRIGGERS: updated_at auto-update
-- =====================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to all tables with updated_at
DO $$ 
DECLARE
  t TEXT;
BEGIN
  FOR t IN SELECT unnest(ARRAY['profiles', 'households', 'adults', 'children', 'categories', 'expense_items', 'promo_codes'])
  LOOP
    EXECUTE format('
      DROP TRIGGER IF EXISTS trigger_update_%I_updated_at ON %I;
      CREATE TRIGGER trigger_update_%I_updated_at
        BEFORE UPDATE ON %I
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();
    ', t, t, t, t);
  END LOOP;
END $$;

-- =====================================================
-- TRIGGERS: Profile creation on signup
-- =====================================================

-- Function to create profile when user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, family_name, promo_code_used)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'family_name', ''),
    NEW.raw_user_meta_data->>'promo_code_used'
  );
  
  -- Log signup activity
  INSERT INTO public.activity_log (user_id, family_name, event_type, message)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'family_name', NEW.email),
    'signup',
    COALESCE(NEW.raw_user_meta_data->>'family_name', 'New user') || ' signed up'
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop and recreate trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW 
  EXECUTE FUNCTION public.handle_new_user();

-- =====================================================
-- FUNCTIONS: Promo code redemption
-- =====================================================

-- Function to redeem a promo code (call from client)
CREATE OR REPLACE FUNCTION public.redeem_promo_code(code_input TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  promo RECORD;
BEGIN
  -- Find active, non-expired, non-maxed promo code (case insensitive)
  SELECT * INTO promo 
  FROM promo_codes 
  WHERE UPPER(code) = UPPER(code_input)
    AND status = 'active'
    AND (expires_at IS NULL OR expires_at > NOW())
    AND (max_redemptions IS NULL OR redemptions < max_redemptions);
  
  IF promo.id IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Increment redemptions
  UPDATE promo_codes 
  SET redemptions = redemptions + 1
  WHERE id = promo.id;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to validate promo code (doesn't redeem)
CREATE OR REPLACE FUNCTION public.validate_promo_code(code_input TEXT)
RETURNS TABLE (
  valid BOOLEAN,
  code TEXT,
  description TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    TRUE AS valid,
    p.code,
    p.description
  FROM promo_codes p
  WHERE UPPER(p.code) = UPPER(code_input)
    AND p.status = 'active'
    AND (p.expires_at IS NULL OR p.expires_at > NOW())
    AND (p.max_redemptions IS NULL OR p.redemptions < p.max_redemptions);
  
  -- If no rows returned, return invalid
  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, NULL::TEXT, NULL::TEXT;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- FUNCTIONS: Activity logging
-- =====================================================

-- Function to log activity (call from client)
CREATE OR REPLACE FUNCTION public.log_activity(
  p_event_type TEXT,
  p_message TEXT,
  p_metadata JSONB DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_user_id UUID;
  v_family_name TEXT;
  v_activity_id UUID;
BEGIN
  -- Get current user
  v_user_id := auth.uid();
  
  -- Get family name
  SELECT family_name INTO v_family_name
  FROM profiles
  WHERE id = v_user_id;
  
  -- Insert activity
  INSERT INTO activity_log (user_id, family_name, event_type, message, metadata)
  VALUES (v_user_id, v_family_name, p_event_type, p_message, p_metadata)
  RETURNING id INTO v_activity_id;
  
  RETURN v_activity_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- ROW LEVEL SECURITY
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE households ENABLE ROW LEVEL SECURITY;
ALTER TABLE adults ENABLE ROW LEVEL SECURITY;
ALTER TABLE children ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE expense_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE promo_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;

-- -----------------------------------------------------
-- profiles RLS
-- -----------------------------------------------------
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
CREATE POLICY "Admins can view all profiles"
  ON profiles FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = TRUE)
  );

-- -----------------------------------------------------
-- households RLS
-- -----------------------------------------------------
DROP POLICY IF EXISTS "Users can manage own household" ON households;
CREATE POLICY "Users can manage own household"
  ON households FOR ALL
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can view all households" ON households;
CREATE POLICY "Admins can view all households"
  ON households FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = TRUE)
  );

-- -----------------------------------------------------
-- adults RLS
-- -----------------------------------------------------
DROP POLICY IF EXISTS "Users can manage own adults" ON adults;
CREATE POLICY "Users can manage own adults"
  ON adults FOR ALL
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can view all adults" ON adults;
CREATE POLICY "Admins can view all adults"
  ON adults FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = TRUE)
  );

-- -----------------------------------------------------
-- children RLS
-- -----------------------------------------------------
DROP POLICY IF EXISTS "Users can manage own children" ON children;
CREATE POLICY "Users can manage own children"
  ON children FOR ALL
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can view all children" ON children;
CREATE POLICY "Admins can view all children"
  ON children FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = TRUE)
  );

-- -----------------------------------------------------
-- categories RLS
-- -----------------------------------------------------
DROP POLICY IF EXISTS "Users can manage own categories" ON categories;
CREATE POLICY "Users can manage own categories"
  ON categories FOR ALL
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can view all categories" ON categories;
CREATE POLICY "Admins can view all categories"
  ON categories FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = TRUE)
  );

-- -----------------------------------------------------
-- expense_items RLS
-- -----------------------------------------------------
DROP POLICY IF EXISTS "Users can manage own expense items" ON expense_items;
CREATE POLICY "Users can manage own expense items"
  ON expense_items FOR ALL
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can view all expense items" ON expense_items;
CREATE POLICY "Admins can view all expense items"
  ON expense_items FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = TRUE)
  );

-- -----------------------------------------------------
-- promo_codes RLS
-- -----------------------------------------------------
DROP POLICY IF EXISTS "Anyone can view active promo codes" ON promo_codes;
CREATE POLICY "Anyone can view active promo codes"
  ON promo_codes FOR SELECT
  USING (status = 'active');

DROP POLICY IF EXISTS "Admins can manage promo codes" ON promo_codes;
CREATE POLICY "Admins can manage promo codes"
  ON promo_codes FOR ALL
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = TRUE)
  );

-- -----------------------------------------------------
-- activity_log RLS
-- -----------------------------------------------------
DROP POLICY IF EXISTS "Users can view own activity" ON activity_log;
CREATE POLICY "Users can view own activity"
  ON activity_log FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "System can insert activity" ON activity_log;
CREATE POLICY "System can insert activity"
  ON activity_log FOR INSERT
  WITH CHECK (TRUE);

DROP POLICY IF EXISTS "Admins can view all activity" ON activity_log;
CREATE POLICY "Admins can view all activity"
  ON activity_log FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = TRUE)
  );

-- =====================================================
-- SEED DATA: Default promo codes
-- =====================================================
INSERT INTO promo_codes (code, description, max_redemptions, status) VALUES
  ('FOUNDING', 'Founding member access', 100, 'active'),
  ('LAUNCH2026', 'Launch day promotional code', 50, 'active'),
  ('WORKSHOP', 'Workshop attendee code', 200, 'active'),
  ('COACH', 'Financial coach referral', NULL, 'active')
ON CONFLICT (code) DO NOTHING;

-- =====================================================
-- REALTIME: live consultation + multi-device sync
-- =====================================================
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

-- =====================================================
-- VERIFICATION: Check tables were created
-- =====================================================
DO $$
DECLARE
  table_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO table_count
  FROM information_schema.tables
  WHERE table_schema = 'public'
    AND table_name IN ('profiles', 'households', 'adults', 'children', 'categories', 'expense_items', 'promo_codes', 'activity_log');
  
  IF table_count = 8 THEN
    RAISE NOTICE '✓ All 8 tables created successfully';
  ELSE
    RAISE WARNING '⚠ Only % of 8 tables found', table_count;
  END IF;
END $$;
