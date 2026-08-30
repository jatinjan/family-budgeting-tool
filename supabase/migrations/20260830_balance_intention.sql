-- Balance intention fields on profiles (docs/specs/balance-intention-sync.md)
-- Run in Supabase SQL Editor on the target project before relying on admin visibility.

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS balance_goal TEXT,
  ADD COLUMN IF NOT EXISTS yearly_savings_goal TEXT,
  ADD COLUMN IF NOT EXISTS monthly_buffer TEXT;

COMMENT ON COLUMN profiles.balance_goal IS 'Balance home primary goal text';
COMMENT ON COLUMN profiles.yearly_savings_goal IS 'Optional yearly savings intention (string)';
COMMENT ON COLUMN profiles.monthly_buffer IS 'Optional monthly buffer intention (string)';
