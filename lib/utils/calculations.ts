/**
 * Budget calculation utilities for My Balanced Family Finances
 * Handles frequency multipliers, annual totals, and budget summaries
 */

export type Frequency =
  | 'weekly'
  | 'fortnightly'
  | 'monthly'
  | 'quarterly'
  | 'term'
  | 'annual'
  | 'bi-monthly';

export const FREQUENCY_MULTIPLIERS: Record<Frequency, number> = {
  weekly: 52,
  fortnightly: 26,
  monthly: 12,
  quarterly: 4,
  term: 4,
  annual: 1,
  'bi-monthly': 6,
};

export const FREQUENCY_LABELS: Record<Frequency, string> = {
  weekly: 'Weekly',
  fortnightly: 'Fortnightly',
  monthly: 'Monthly',
  quarterly: 'Quarterly',
  term: 'Per Term',
  annual: 'Annual',
  'bi-monthly': 'Bi-Monthly',
};

/**
 * Calculate the annual total for an expense item
 * @param cost - Unit cost in dollars
 * @param frequency - How often the expense occurs
 * @param quantity - Number of units per occurrence (default: 1)
 * @returns Annual total in dollars, rounded to 2 decimal places
 */
export function calculateAnnualTotal(
  cost: number,
  frequency: Frequency,
  quantity: number = 1
): number {
  if (cost < 0 || quantity < 1) {
    return 0;
  }
  
  const multiplier = FREQUENCY_MULTIPLIERS[frequency];
  const annual = cost * quantity * multiplier;
  
  return Math.round(annual * 100) / 100;
}

/**
 * Calculate total for a percentage-based category (e.g., Miscellaneous)
 * @param baseTotal - Sum of all non-percentage categories
 * @param percentage - Percentage to apply (e.g., 15 for 15%)
 * @returns Percentage category total, rounded to 2 decimal places
 */
export function calculatePercentageCategory(
  baseTotal: number,
  percentage: number
): number {
  if (baseTotal < 0 || percentage < 0 || percentage > 100) {
    return 0;
  }
  
  const result = baseTotal * (percentage / 100);
  return Math.round(result * 100) / 100;
}

export interface CategoryTotal {
  categoryId: string;
  categoryName: string;
  total: number;
  itemCount: number;
  isPercentageBased: boolean;
}

export interface EntityTotal {
  entityId: string;
  entityType: 'child' | 'adult' | 'household';
  entityName: string;
  total: number;
  categories: CategoryTotal[];
}

export interface ExpenseItemInput {
  id?: string;
  category_id: string;
  total: number;
}

export interface CategoryInput {
  id: string;
  name: string;
  entity_type: 'child' | 'adult' | 'household';
  entity_id: string;
  is_percentage_based: boolean;
  percentage_value: number;
}

export interface EntityInput {
  id: string;
  name: string;
}

/**
 * Calculate total for a standard category (sum of all items)
 * @param items - Expense items in the category
 * @returns Category annual total
 */
export function calculateCategoryTotal(items: ExpenseItemInput[]): number {
  const total = items.reduce((sum, item) => sum + (item.total || 0), 0);
  return Math.round(total * 100) / 100;
}

/**
 * Calculate miscellaneous category based on percentage of other categories
 * @param categories - All categories for the entity
 * @param items - All expense items for the entity
 * @param miscCategory - The miscellaneous/percentage-based category
 * @returns Miscellaneous category total
 */
export function calculateMiscCategoryTotal(
  categories: CategoryInput[],
  items: ExpenseItemInput[],
  miscCategory: CategoryInput
): number {
  const nonMiscCategories = categories.filter(c => !c.is_percentage_based);
  
  const baseTotal = nonMiscCategories.reduce((sum, category) => {
    const categoryItems = items.filter(i => i.category_id === category.id);
    return sum + calculateCategoryTotal(categoryItems);
  }, 0);
  
  return calculatePercentageCategory(baseTotal, miscCategory.percentage_value);
}

/**
 * Calculate total for a single entity (child, adult, or household)
 * @param entity - The entity (child, adult, or household)
 * @param entityType - Type of entity
 * @param categories - All categories for this entity
 * @param items - All expense items for this entity
 * @returns EntityTotal with category breakdown
 */
export function calculateEntityTotal(
  entity: EntityInput,
  entityType: 'child' | 'adult' | 'household',
  categories: CategoryInput[],
  items: ExpenseItemInput[]
): EntityTotal {
  const entityCategories = categories.filter(
    c => c.entity_type === entityType && c.entity_id === entity.id
  );
  
  const categoryTotals: CategoryTotal[] = entityCategories.map(category => {
    const categoryItems = items.filter(i => i.category_id === category.id);
    let total: number;
    
    if (category.is_percentage_based) {
      total = calculateMiscCategoryTotal(entityCategories, items, category);
    } else {
      total = calculateCategoryTotal(categoryItems);
    }
    
    return {
      categoryId: category.id,
      categoryName: category.name,
      total,
      itemCount: categoryItems.length,
      isPercentageBased: category.is_percentage_based,
    };
  });
  
  const entityTotal = categoryTotals.reduce((sum, c) => sum + c.total, 0);
  
  return {
    entityId: entity.id,
    entityType,
    entityName: entity.name,
    total: Math.round(entityTotal * 100) / 100,
    categories: categoryTotals,
  };
}

export interface BudgetSummary {
  grandTotal: number;
  fortnightly: number;
  monthly: number;
  weekly: number;
  
  children: {
    total: number;
    entities: EntityTotal[];
  };
  
  adults: {
    total: number;
    entities: EntityTotal[];
  };
  
  household: {
    total: number;
    entity: EntityTotal | null;
  };
  
  completionRate: number;
  categoriesCompleted: number;
  categoriesTotal: number;
}

export interface HouseholdInput extends EntityInput {
  members?: number;
  housing_type?: string | null;
}

/**
 * Calculate complete family budget summary
 * @param household - Household data (or null)
 * @param children - Array of children
 * @param adults - Array of adults
 * @param categories - All categories
 * @param items - All expense items
 * @returns Complete budget summary with breakdowns
 */
export function calculateBudgetSummary(
  household: HouseholdInput | null,
  children: EntityInput[],
  adults: EntityInput[],
  categories: CategoryInput[],
  items: ExpenseItemInput[]
): BudgetSummary {
  // Children totals
  const childrenTotals = children.map(child =>
    calculateEntityTotal(child, 'child', categories, items)
  );
  const childrenTotal = childrenTotals.reduce((sum, e) => sum + e.total, 0);
  
  // Adults totals
  const adultsTotals = adults.map(adult =>
    calculateEntityTotal(adult, 'adult', categories, items)
  );
  const adultsTotal = adultsTotals.reduce((sum, e) => sum + e.total, 0);
  
  // Household total
  let householdEntity: EntityTotal | null = null;
  let householdTotal = 0;
  
  if (household) {
    householdEntity = calculateEntityTotal(household, 'household', categories, items);
    householdTotal = householdEntity.total;
  }
  
  // Grand total
  const grandTotal = Math.round((childrenTotal + adultsTotal + householdTotal) * 100) / 100;
  
  // Completion tracking
  const totalCategories = categories.length;
  const categoriesWithItems = categories.filter(cat =>
    items.some(item => item.category_id === cat.id && item.total > 0)
  ).length;
  const completionRate = totalCategories > 0
    ? Math.round((categoriesWithItems / totalCategories) * 100)
    : 0;
  
  return {
    grandTotal,
    fortnightly: Math.round((grandTotal / 26) * 100) / 100,
    monthly: Math.round((grandTotal / 12) * 100) / 100,
    weekly: Math.round((grandTotal / 52) * 100) / 100,
    
    children: {
      total: Math.round(childrenTotal * 100) / 100,
      entities: childrenTotals,
    },
    
    adults: {
      total: Math.round(adultsTotal * 100) / 100,
      entities: adultsTotals,
    },
    
    household: {
      total: Math.round(householdTotal * 100) / 100,
      entity: householdEntity,
    },
    
    completionRate,
    categoriesCompleted: categoriesWithItems,
    categoriesTotal: totalCategories,
  };
}

export interface PlanningItem {
  id: string;
  total: number;
  needWant: 'need' | 'want' | null;
  adjustedTotal: number | null;
}

export interface PlanningTotals {
  originalTotal: number;
  adjustedTotal: number;
  totalSavings: number;
  needsTotal: number;
  wantsTotal: number;
  unclassifiedTotal: number;
}

/**
 * Calculate planning mode totals
 * @param items - Planning items with need/want and adjusted values
 * @returns Planning totals with savings
 */
export function calculatePlanningTotals(items: PlanningItem[]): PlanningTotals {
  let originalTotal = 0;
  let adjustedTotal = 0;
  let needsTotal = 0;
  let wantsTotal = 0;
  let unclassifiedTotal = 0;
  
  for (const item of items) {
    const original = item.total;
    const adjusted = item.adjustedTotal ?? item.total;
    
    originalTotal += original;
    adjustedTotal += adjusted;
    
    if (item.needWant === 'need') {
      needsTotal += adjusted;
    } else if (item.needWant === 'want') {
      wantsTotal += adjusted;
    } else {
      unclassifiedTotal += adjusted;
    }
  }
  
  return {
    originalTotal: Math.round(originalTotal * 100) / 100,
    adjustedTotal: Math.round(adjustedTotal * 100) / 100,
    totalSavings: Math.round((originalTotal - adjustedTotal) * 100) / 100,
    needsTotal: Math.round(needsTotal * 100) / 100,
    wantsTotal: Math.round(wantsTotal * 100) / 100,
    unclassifiedTotal: Math.round(unclassifiedTotal * 100) / 100,
  };
}

/**
 * Calculate the impact of reducing all 'wants' by a percentage
 * @param items - Planning items
 * @param reductionPercent - Percentage to reduce wants by (0-100)
 * @returns New total and savings
 */
export function calculateWantsReduction(
  items: PlanningItem[],
  reductionPercent: number
): { newTotal: number; savings: number } {
  if (reductionPercent < 0 || reductionPercent > 100) {
    return { newTotal: 0, savings: 0 };
  }
  
  let newTotal = 0;
  let originalWantsTotal = 0;
  
  for (const item of items) {
    const amount = item.adjustedTotal ?? item.total;
    
    if (item.needWant === 'want') {
      originalWantsTotal += amount;
      newTotal += amount * (1 - reductionPercent / 100);
    } else {
      newTotal += amount;
    }
  }
  
  return {
    newTotal: Math.round(newTotal * 100) / 100,
    savings: Math.round((originalWantsTotal * reductionPercent / 100) * 100) / 100,
  };
}

/**
 * Convert annual amount to a different frequency
 * @param annualAmount - Annual amount
 * @param targetFrequency - Target frequency
 * @returns Amount per period
 */
export function convertFromAnnual(
  annualAmount: number,
  targetFrequency: Frequency
): number {
  const multiplier = FREQUENCY_MULTIPLIERS[targetFrequency];
  const result = annualAmount / multiplier;
  return Math.round(result * 100) / 100;
}

/**
 * Get the display label for a frequency
 * @param frequency - Frequency value
 * @returns Human-readable label
 */
export function getFrequencyLabel(frequency: Frequency): string {
  return FREQUENCY_LABELS[frequency] || frequency;
}
