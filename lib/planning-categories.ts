export const CHILD_FORWARD_PLANNING = [
  'Education',
  'Medical & Special Needs',
  'Clothing & Toys',
  'Entertainment/Events',
  'Parties & Social',
]

export const ADULT_FORWARD_PLANNING = [
  'Education',
  'Medical',
  'Vehicles/Transport',
  'Debt Repayment',
  'Personal',
  'Gifting',
]

export const HOUSEHOLD_FORWARD_PLANNING = [
  'Mortgage/Rent',
  'Utilities',
  'Scheduled Maintenance',
  'Insurance',
  'Groceries',
  'Entertainment',
  'Eating Out',
  'Pets',
]

export const CHILD_NEEDS_WANTS = 'Extracurricular'
export const ADULT_NEEDS_WANTS = 'Fitness'
export const HOUSEHOLD_NEEDS_WANTS = 'Subscriptions'

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

export function needsWantsName(entityType: 'child' | 'adult' | 'household'): string {
  switch (entityType) {
    case 'child':
      return CHILD_NEEDS_WANTS
    case 'adult':
      return ADULT_NEEDS_WANTS
    case 'household':
      return HOUSEHOLD_NEEDS_WANTS
  }
}
