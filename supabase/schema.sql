-- =====================================================
-- My Balanced Family Finances - Database Schema
-- Run this in your Supabase SQL Editor (Dashboard → SQL Editor)
-- =====================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- PROFILES TABLE
-- Extends Supabase auth.users with app-specific data
-- =====================================================
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  family_name TEXT,
  is_admin BOOLEAN DEFAULT FALSE,
  promo_code_used TEXT,
  onboarding_status TEXT DEFAULT 'signed_up' CHECK (
    onboarding_status IN ('signed_up', 'profile_complete', 'budget_started', 'plan_complete')
  ),
  signed_up_at TIMESTAMPTZ DEFAULT NOW(),
  last_active_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- HOUSEHOLDS TABLE
-- Each family has one household
-- =====================================================
CREATE TABLE IF NOT EXISTS households (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  housing_type TEXT,
  members INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id) -- One household per user
);

-- =====================================================
-- ADULTS TABLE
-- Family adults (not the auth user themselves)
-- =====================================================
CREATE TABLE IF NOT EXISTS adults (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  age INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- CHILDREN TABLE
-- Family children
-- =====================================================
CREATE TABLE IF NOT EXISTS children (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  age INTEGER,
  school_level TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- CATEGORIES TABLE
-- Budget categories for each entity (child/adult/household)
-- =====================================================
CREATE TABLE IF NOT EXISTS categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('child', 'adult', 'household')),
  entity_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  is_percentage_based BOOLEAN DEFAULT FALSE,
  percentage_value NUMERIC DEFAULT 0,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- EXPENSE_ITEMS TABLE
-- Individual expense items within categories
-- =====================================================
CREATE TABLE IF NOT EXISTS expense_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  cost NUMERIC DEFAULT 0,
  frequency TEXT DEFAULT 'monthly' CHECK (
    frequency IN ('weekly', 'monthly', 'quarterly', 'term', 'annual', 'bi-monthly')
  ),
  quantity INTEGER DEFAULT 1,
  total NUMERIC DEFAULT 0,
  need_want TEXT CHECK (need_want IN ('need', 'want')),
  adjusted_total NUMERIC,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- PROMO_CODES TABLE
-- Promo codes for attribution tracking
-- =====================================================
CREATE TABLE IF NOT EXISTS promo_codes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code TEXT UNIQUE NOT NULL,
  description TEXT,
  redemptions INTEGER DEFAULT 0,
  max_redemptions INTEGER,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'expired')),
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- ACTIVITY_LOG TABLE
-- Admin activity log for tracking user actions
-- =====================================================
CREATE TABLE IF NOT EXISTS activity_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  family_name TEXT,
  event_type TEXT NOT NULL,
  message TEXT NOT NULL,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
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

-- PROFILES POLICIES
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles"
  ON profiles FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = TRUE
  ));

-- HOUSEHOLDS POLICIES
CREATE POLICY "Users can manage own household"
  ON households FOR ALL
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all households"
  ON households FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = TRUE
  ));

-- ADULTS POLICIES
CREATE POLICY "Users can manage own adults"
  ON adults FOR ALL
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all adults"
  ON adults FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = TRUE
  ));

-- CHILDREN POLICIES
CREATE POLICY "Users can manage own children"
  ON children FOR ALL
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all children"
  ON children FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = TRUE
  ));

-- CATEGORIES POLICIES
CREATE POLICY "Users can manage own categories"
  ON categories FOR ALL
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all categories"
  ON categories FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = TRUE
  ));

-- EXPENSE_ITEMS POLICIES
CREATE POLICY "Users can manage own expense items"
  ON expense_items FOR ALL
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all expense items"
  ON expense_items FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = TRUE
  ));

-- PROMO_CODES POLICIES (public read, admin write)
CREATE POLICY "Anyone can read active promo codes"
  ON promo_codes FOR SELECT
  USING (status = 'active');

CREATE POLICY "Admins can manage promo codes"
  ON promo_codes FOR ALL
  USING (EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = TRUE
  ));

-- ACTIVITY_LOG POLICIES (admin only)
CREATE POLICY "Admins can read activity log"
  ON activity_log FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = TRUE
  ));

CREATE POLICY "System can insert activity log"
  ON activity_log FOR INSERT
  WITH CHECK (TRUE);

-- =====================================================
-- FUNCTIONS & TRIGGERS
-- =====================================================

-- Function to create profile on user signup
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

-- Trigger for new user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to update last_active_at
CREATE OR REPLACE FUNCTION public.update_last_active()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.profiles
  SET last_active_at = NOW()
  WHERE id = auth.uid();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to increment promo code redemptions
CREATE OR REPLACE FUNCTION public.redeem_promo_code(code_input TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  promo RECORD;
BEGIN
  SELECT * INTO promo FROM promo_codes 
  WHERE code = UPPER(code_input) AND status = 'active'
  AND (expires_at IS NULL OR expires_at > NOW())
  AND (max_redemptions IS NULL OR redemptions < max_redemptions);
  
  IF promo.id IS NULL THEN
    RETURN FALSE;
  END IF;
  
  UPDATE promo_codes 
  SET redemptions = redemptions + 1
  WHERE id = promo.id;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- INITIAL DATA: Default Promo Codes
-- =====================================================
INSERT INTO promo_codes (code, description, max_redemptions, status) VALUES
  ('FOUNDING', 'Founding member access', 20, 'active'),
  ('LAUNCH2026', 'Launch day code', 50, 'active'),
  ('WORKSHOP', 'Workshop attendee code', 100, 'active')
ON CONFLICT (code) DO NOTHING;

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_households_user_id ON households(user_id);
CREATE INDEX IF NOT EXISTS idx_adults_user_id ON adults(user_id);
CREATE INDEX IF NOT EXISTS idx_children_user_id ON children(user_id);
CREATE INDEX IF NOT EXISTS idx_categories_user_id ON categories(user_id);
CREATE INDEX IF NOT EXISTS idx_categories_entity ON categories(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_expense_items_user_id ON expense_items(user_id);
CREATE INDEX IF NOT EXISTS idx_expense_items_category_id ON expense_items(category_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_user_id ON activity_log(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_created_at ON activity_log(created_at DESC);
