/**
 * Cloud field coercion for family-app UI strings vs Supabase CHECKs.
 * Source of truth: docs/specs/cross-device-sync-fix.md
 * UI values: app/children/page.tsx, app/household/page.tsx
 */

export const CLOUD_SCHOOL_LEVELS = [
  'preschool',
  'primary',
  'secondary',
  'university',
  'other',
] as const

export const CLOUD_HOUSING_TYPES = ['rent', 'own', 'other'] as const

export const CLOUD_FREQUENCIES = [
  'weekly',
  'fortnightly',
  'monthly',
  'quarterly',
  'term',
  'annual',
  'bi-monthly',
] as const

const UI_SCHOOL_LEVEL: Record<string, string> = {
  preschool: 'Preschool',
  primary: 'Primary School',
  secondary: 'Secondary School',
  university: 'University',
  other: 'Other',
}

const UI_HOUSING_TYPE: Record<string, string> = {
  own: 'House - Owned',
  rent: 'House - Rented',
  other: 'Other',
}

function asString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

export function mapSchoolLevelToCloud(value: unknown): string | null {
  const raw = asString(value)
  if (!raw) return null
  const lower = raw.toLowerCase()
  if ((CLOUD_SCHOOL_LEVELS as readonly string[]).includes(lower)) return lower
  if (lower.includes('pre-school') || lower.includes('preschool') || lower === 'kindy' || lower.includes('kindergarten')) {
    return 'preschool'
  }
  if (lower.includes('primary') || lower.includes('prep')) return 'primary'
  if (lower.includes('secondary') || lower.includes('high school') || lower === 'high school') return 'secondary'
  if (lower.includes('university') || lower.includes('tertiary') || lower.includes('tafe')) return 'university'
  return 'other'
}

export function mapSchoolLevelFromCloud(value: unknown): string {
  const raw = asString(value)
  if (!raw) return ''
  return UI_SCHOOL_LEVEL[raw.toLowerCase()] || raw
}

export function mapHousingTypeToCloud(value: unknown): string | null {
  const raw = asString(value)
  if (!raw) return null
  const lower = raw.toLowerCase()
  if ((CLOUD_HOUSING_TYPES as readonly string[]).includes(lower)) return lower
  if (lower.includes('rent')) return 'rent'
  if (lower.includes('own')) return 'own'
  return 'other'
}

export function mapHousingTypeFromCloud(value: unknown): string {
  const raw = asString(value)
  if (!raw) return ''
  if (raw.includes(' - ') || raw === 'Other') return raw
  return UI_HOUSING_TYPE[raw.toLowerCase()] || raw
}

export function mapFrequencyToCloud(frequency: unknown): string {
  if (typeof frequency === 'string' && (CLOUD_FREQUENCIES as readonly string[]).includes(frequency)) {
    return frequency
  }
  return 'annual'
}

function errorCode(error: unknown): string {
  if (error && typeof error === 'object' && 'code' in error) {
    return String((error as { code?: string }).code || '')
  }
  return ''
}

function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message
  if (error && typeof error === 'object' && 'message' in error) {
    return String((error as { message?: string }).message || '')
  }
  return String(error)
}

export function isCheckConstraintError(error: unknown): boolean {
  const code = errorCode(error)
  const message = errorMessage(error).toLowerCase()
  return code === '23514' || message.includes('check constraint') || message.includes('violates check')
}

export function isUniqueViolation(error: unknown): boolean {
  const code = errorCode(error)
  const message = errorMessage(error).toLowerCase()
  return code === '23505' || message.includes('duplicate key') || message.includes('unique constraint')
}

/** Coerce a mapped cloud payload so it can pass production CHECKs. */
export function withCloudSafeFields(
  table: string,
  cloudRecord: Record<string, unknown>
): Record<string, unknown> {
  const next = { ...cloudRecord }
  if (table === 'children') {
    next.school_level = mapSchoolLevelToCloud(next.school_level)
  }
  if (table === 'households') {
    next.housing_type = mapHousingTypeToCloud(next.housing_type)
  }
  if (table === 'items' || table === 'adultItems' || table === 'householdItems') {
    next.frequency = mapFrequencyToCloud(next.frequency)
  }
  return next
}
