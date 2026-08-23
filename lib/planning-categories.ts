/**
 * Planning-sheet layouts. Source of truth: docs/specs/planning-sheet.md
 * Names must match lib/db.ts category templates exactly.
 */

export const CHILD_FORWARD_PLANNING = [
  'Education',
  'Medical & Special Needs',
  'Clothing & Toys',
  'Entertainment/Events',
  'Parties & Social',
  'Holiday',
]

export const ADULT_FORWARD_PLANNING = [
  'Education',
  'Medical',
  'Vehicles/Transport',
  'Personal Debt Repayment',
  'Personal',
  'Gifting',
  'Adult Holidays/ Solo Travel',
]

export const HOUSEHOLD_FORWARD_PLANNING = [
  'Housing',
  'Utilities',
  'Scheduled Maintenance',
  'Insurance',
  'Groceries & Household Supplies',
  'Entertainment & Recreation',
  'Eating Out',
  'Pets',
  'Family Holidays',
]

export const CHILD_NEEDS_WANTS = [
  'Extracurricular',
  'Child Communication and Subscriptions',
]

export const ADULT_NEEDS_WANTS = [
  'Fitness',
  'Adult Communications & Subscriptions',
]

export const HOUSEHOLD_NEEDS_WANTS = [
  'Communications & Subscriptions',
]

export function forwardPlanningNames(entityType: 'child' | 'adult' | 'household'): string[] {
  switch (entityType) {
    case 'child':
      return CHILD_FORWARD_PLANNING
    case 'adult':
      return ADULT_FORWARD_PLANNING
    case 'household':
      return HOUSEHOLD_FORWARD_PLANNING
  }
}

export function needsWantsNames(entityType: 'child' | 'adult' | 'household'): string[] {
  switch (entityType) {
    case 'child':
      return CHILD_NEEDS_WANTS
    case 'adult':
      return ADULT_NEEDS_WANTS
    case 'household':
      return HOUSEHOLD_NEEDS_WANTS
  }
}

export function isNeedsWantsCategory(
  categoryName: string,
  entityType: 'child' | 'adult' | 'household'
): boolean {
  return needsWantsNames(entityType).includes(categoryName)
}
