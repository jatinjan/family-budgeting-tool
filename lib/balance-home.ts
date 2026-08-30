/**
 * Balance home copy and settings keys.
 * Source of truth: docs/specs/balance-home.md
 */

export const BALANCE_SETTING_KEYS = {
  goal: 'balanceGoal',
  yearlySavingsGoal: 'yearlySavingsGoal',
  monthlyBuffer: 'monthlyBuffer',
} as const

/** Sentinel in UI only — never stored. Custom text is stored in balanceGoal. */
export const BALANCE_CUSTOM_GOAL = '__custom__'

export const BALANCE_GOALS = [
  'Reduce financial stress',
  'Build a safety buffer',
  'Save for a holiday',
  'Understand our real spending',
  'Reduce overspending',
  "Make better decisions about kids' activities",
  'Improve communication about money',
] as const

export type BalanceGoal = (typeof BALANCE_GOALS)[number]

export const BALANCE_HOW_IT_WORKS_STEPS = [
  'Add your known expenses for household, adults, and children.',
  'Add estimates of your irregular or average-based expenses to complete your picture.',
  'Review your total family spending in the Dashboard.',
  'Explore adjustments in the Planning Sheet.',
  'See your potential savings and the impact of your choices.',
] as const

/** Guest save intention destination. */
export const BALANCE_GUEST_AUTH_PATH = '/signup'

export function isPresetBalanceGoal(value: string): value is BalanceGoal {
  return (BALANCE_GOALS as readonly string[]).includes(value)
}

export function resolveBalanceGoal(
  selectedGoal: string | null,
  customGoal: string
): string | null {
  if (selectedGoal === BALANCE_CUSTOM_GOAL) {
    const trimmed = customGoal.trim()
    return trimmed || null
  }
  if (selectedGoal && isPresetBalanceGoal(selectedGoal)) return selectedGoal
  return null
}

/** Cloud profile fields ↔ Dexie settings (docs/specs/balance-intention-sync.md) */
export type BalanceIntentionCloud = {
  balance_goal: string | null
  yearly_savings_goal: string | null
  monthly_buffer: string | null
}

export type BalanceIntentionLocal = {
  goal: string
  yearlySavingsGoal: string
  monthlyBuffer: string
}

export function intentionFromProfile(profile: {
  balance_goal?: string | null
  yearly_savings_goal?: string | null
  monthly_buffer?: string | null
} | null | undefined): BalanceIntentionLocal | null {
  if (!profile) return null
  const goal = profile.balance_goal?.trim() || ''
  const yearly = profile.yearly_savings_goal ?? ''
  const monthly = profile.monthly_buffer ?? ''
  if (!goal && !yearly && !monthly) return null
  return { goal, yearlySavingsGoal: yearly, monthlyBuffer: monthly }
}

export function intentionToCloud(local: BalanceIntentionLocal): BalanceIntentionCloud {
  return {
    balance_goal: local.goal || null,
    yearly_savings_goal: local.yearlySavingsGoal || null,
    monthly_buffer: local.monthlyBuffer || null,
  }
}

export function hasIntentionContent(profile: {
  balance_goal?: string | null
  yearly_savings_goal?: string | null
  monthly_buffer?: string | null
} | null | undefined): boolean {
  if (!profile) return false
  return Boolean(
    profile.balance_goal?.trim() ||
      profile.yearly_savings_goal?.trim() ||
      profile.monthly_buffer?.trim()
  )
}
