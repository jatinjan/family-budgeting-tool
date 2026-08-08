-- =====================================================
-- My Balanced Family Finances - RLS Policies
-- IDEMPOTENT: Safe to run multiple times
-- Run this in Supabase SQL Editor before demo
-- =====================================================

-- =====================================================
-- STEP 1: ENABLE RLS ON ALL TABLES
-- This is idempotent - running on already-enabled tables is safe
-- =====================================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE households ENABLE ROW LEVEL SECURITY;
ALTER TABLE adults ENABLE ROW LEVEL SECURITY;
ALTER TABLE children ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE expense_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE promo_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- STEP 2: DROP EXISTING POLICIES (for clean slate)
-- This ensures we can recreate them without conflicts
-- =====================================================

-- Profiles
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Service role can insert profiles" ON profiles;

-- Households
DROP POLICY IF EXISTS "Users can manage own household" ON households;
DROP POLICY IF EXISTS "Admins can view all households" ON households;

-- Adults
DROP POLICY IF EXISTS "Users can manage own adults" ON adults;
DROP POLICY IF EXISTS "Admins can view all adults" ON adults;

-- Children
DROP POLICY IF EXISTS "Users can manage own children" ON children;
DROP POLICY IF EXISTS "Admins can view all children" ON children;

-- Categories
DROP POLICY IF EXISTS "Users can manage own categories" ON categories;
DROP POLICY IF EXISTS "Admins can view all categories" ON categories;

-- Expense Items
DROP POLICY IF EXISTS "Users can manage own expense items" ON expense_items;
DROP POLICY IF EXISTS "Admins can view all expense items" ON expense_items;

-- Promo Codes
DROP POLICY IF EXISTS "Anyone can read active promo codes" ON promo_codes;
DROP POLICY IF EXISTS "Admins can manage promo codes" ON promo_codes;

-- Activity Log
DROP POLICY IF EXISTS "Admins can read activity log" ON activity_log;
DROP POLICY IF EXISTS "System can insert activity log" ON activity_log;
DROP POLICY IF EXISTS "Users can insert own activity" ON activity_log;

-- =====================================================
-- STEP 3: CREATE PROFILES POLICIES
-- Users: SELECT/UPDATE own profile only
-- Admins: SELECT all profiles (read-only)
-- =====================================================

CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Admins can view all profiles"
  ON profiles FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM profiles p 
    WHERE p.id = auth.uid() AND p.is_admin = TRUE
  ));

-- Allow the trigger to insert new profiles
CREATE POLICY "Service role can insert profiles"
  ON profiles FOR INSERT
  WITH CHECK (TRUE);

-- =====================================================
-- STEP 4: CREATE HOUSEHOLDS POLICIES
-- Users: ALL operations on own data
-- Admins: SELECT only (read-only)
-- =====================================================

CREATE POLICY "Users can manage own household"
  ON households FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all households"
  ON households FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM profiles p 
    WHERE p.id = auth.uid() AND p.is_admin = TRUE
  ));

-- =====================================================
-- STEP 5: CREATE ADULTS POLICIES
-- Users: ALL operations on own data
-- Admins: SELECT only (read-only)
-- =====================================================

CREATE POLICY "Users can manage own adults"
  ON adults FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all adults"
  ON adults FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM profiles p 
    WHERE p.id = auth.uid() AND p.is_admin = TRUE
  ));

-- =====================================================
-- STEP 6: CREATE CHILDREN POLICIES
-- Users: ALL operations on own data
-- Admins: SELECT only (read-only)
-- =====================================================

CREATE POLICY "Users can manage own children"
  ON children FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all children"
  ON children FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM profiles p 
    WHERE p.id = auth.uid() AND p.is_admin = TRUE
  ));

-- =====================================================
-- STEP 7: CREATE CATEGORIES POLICIES
-- Users: ALL operations on own data
-- Admins: SELECT only (read-only)
-- =====================================================

CREATE POLICY "Users can manage own categories"
  ON categories FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all categories"
  ON categories FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM profiles p 
    WHERE p.id = auth.uid() AND p.is_admin = TRUE
  ));

-- =====================================================
-- STEP 8: CREATE EXPENSE_ITEMS POLICIES
-- Users: ALL operations on own data
-- Admins: SELECT only (read-only)
-- =====================================================

CREATE POLICY "Users can manage own expense items"
  ON expense_items FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all expense items"
  ON expense_items FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM profiles p 
    WHERE p.id = auth.uid() AND p.is_admin = TRUE
  ));

-- =====================================================
-- STEP 9: CREATE PROMO_CODES POLICIES
-- Anyone: SELECT active codes (for validation)
-- Admins: Full management (CRUD)
-- =====================================================

CREATE POLICY "Anyone can read active promo codes"
  ON promo_codes FOR SELECT
  USING (status = 'active');

CREATE POLICY "Admins can manage promo codes"
  ON promo_codes FOR ALL
  USING (EXISTS (
    SELECT 1 FROM profiles p 
    WHERE p.id = auth.uid() AND p.is_admin = TRUE
  ));

-- =====================================================
-- STEP 10: CREATE ACTIVITY_LOG POLICIES
-- Users: INSERT own activity (for logging)
-- Admins: SELECT all (read-only)
-- =====================================================

CREATE POLICY "Users can insert own activity"
  ON activity_log FOR INSERT
  WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Admins can read activity log"
  ON activity_log FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM profiles p 
    WHERE p.id = auth.uid() AND p.is_admin = TRUE
  ));

-- Allow system/triggers to insert (for signup trigger)
CREATE POLICY "System can insert activity log"
  ON activity_log FOR INSERT
  WITH CHECK (TRUE);

-- =====================================================
-- VERIFICATION QUERY
-- Run this to verify RLS is enabled on all tables
-- =====================================================

-- SELECT 
--   schemaname, 
--   tablename, 
--   rowsecurity 
-- FROM pg_tables 
-- WHERE schemaname = 'public' 
--   AND tablename IN (
--     'profiles', 
--     'households', 
--     'adults', 
--     'children', 
--     'categories', 
--     'expense_items', 
--     'promo_codes', 
--     'activity_log'
--   );

-- Expected result: All should show rowsecurity = true

-- =====================================================
-- END OF RLS POLICIES
-- =====================================================
