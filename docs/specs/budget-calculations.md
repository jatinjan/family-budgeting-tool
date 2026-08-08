# Budget Calculations Specification

**Status:** Ready for implementation  
**Priority:** P0  
**Dependencies:** Database schema

---

## Overview

This spec defines all budget calculation logic for the application, including frequency conversions, category totals, and planning mode adjustments.

---

## 1. Frequency Multipliers

### 1.1 Annualization Factors

| Frequency | Multiplier | Description |
|-----------|------------|-------------|
| `weekly` | 52 | Every week |
| `fortnightly` | 26 | Every two weeks |
| `monthly` | 12 | Every month |
| `quarterly` | 4 | Every 3 months |
| `term` | 4 | School term (4 terms/year) |
| `annual` | 1 | Once per year |

### 1.2 Implementation

```typescript
// lib/utils/calculations.ts

type Frequency = 'weekly' | 'fortnightly' | 'monthly' | 'quarterly' | 'term' | 'annual';

const FREQUENCY_MULTIPLIERS: Record<Frequency, number> = {
  weekly: 52,
  fortnightly: 26,
  monthly: 12,
  quarterly: 4,
  term: 4,
  annual: 1,
};

/**
 * Calculate the annual total for an expense item
 * @param cost - Unit cost in dollars
 * @param frequency - How often the expense occurs
 * @param quantity - Number of units per occurrence
 * @returns Annual total in dollars
 */
export function calculateAnnualTotal(
  cost: number,
  frequency: Frequency,
  quantity: number = 1
): number {
  const multiplier = FREQUENCY_MULTIPLIERS[frequency];
  const annual = cost * quantity * multiplier;
  
  // Round to 2 decimal places
  return Math.round(annual * 100) / 100;
}
```

### 1.3 Examples

| Cost | Frequency | Quantity | Annual Total |
|------|-----------|----------|--------------|
| $50 | weekly | 1 | $2,600 |
| $200 | monthly | 1 | $2,400 |
| $150 | term | 2 | $1,200 |
| $1,500 | annual | 1 | $1,500 |
| $25 | fortnightly | 2 | $1,300 |

---

## 2. Category Totals

### 2.1 Standard Category Total

```typescript
/**
 * Calculate total for a standard category
 * @param items - Expense items in the category
 * @returns Category annual total
 */
export function calculateCategoryTotal(items: ExpenseItem[]): number {
  return items.reduce((sum, item) => sum + (item.total || 0), 0);
}
```

### 2.2 Percentage-Based Category (Miscellaneous)

Some categories calculate as a percentage of other categories (e.g., "Miscellaneous" = 15% of other categories).

```typescript
/**
 * Calculate total for a percentage-based category
 * @param baseTotal - Sum of all non-percentage categories
 * @param percentage - Percentage to apply (e.g., 15 for 15%)
 * @returns Percentage category total
 */
export function calculatePercentageCategory(
  baseTotal: number,
  percentage: number
): number {
  const result = baseTotal * (percentage / 100);
  return Math.round(result * 100) / 100;
}

/**
 * Calculate miscellaneous category for an entity
 * @param categories - All categories for the entity
 * @param items - All expense items for the entity
 * @returns Miscellaneous category total
 */
export function calculateMiscCategory(
  categories: Category[],
  items: ExpenseItem[]
): number {
  // Find the miscellaneous category
  const miscCategory = categories.find(c => c.is_percentage_based);
  
  if (!miscCategory) return 0;
  
  // Sum all non-percentage categories
  const nonMiscCategories = categories.filter(c => !c.is_percentage_based);
  const baseTotal = nonMiscCategories.reduce((sum, category) => {
    const categoryItems = items.filter(i => i.category_id === category.id);
    return sum + calculateCategoryTotal(categoryItems);
  }, 0);
  
  return calculatePercentageCategory(baseTotal, miscCategory.percentage_value);
}
```

---

## 3. Entity Totals

### 3.1 Entity Annual Total

```typescript
interface EntityTotal {
  entityId: string;
  entityType: 'child' | 'adult' | 'household';
  entityName: string;
  total: number;
  categories: CategoryTotal[];
}

interface CategoryTotal {
  categoryId: string;
  categoryName: string;
  total: number;
  itemCount: number;
}

/**
 * Calculate total for a single entity (child, adult, or household)
 */
export function calculateEntityTotal(
  entity: { id: string; name: string },
  entityType: 'child' | 'adult' | 'household',
  categories: Category[],
  items: ExpenseItem[]
): EntityTotal {
  const entityCategories = categories.filter(
    c => c.entity_type === entityType && c.entity_id === entity.id
  );
  
  const categoryTotals: CategoryTotal[] = entityCategories.map(category => {
    const categoryItems = items.filter(i => i.category_id === category.id);
    let total: number;
    
    if (category.is_percentage_based) {
      // Calculate as percentage of other categories
      total = calculateMiscCategory(entityCategories, items);
    } else {
      total = calculateCategoryTotal(categoryItems);
    }
    
    return {
      categoryId: category.id,
      categoryName: category.name,
      total,
      itemCount: categoryItems.length,
    };
  });
  
  const entityTotal = categoryTotals.reduce((sum, c) => sum + c.total, 0);
  
  return {
    entityId: entity.id,
    entityType,
    entityName: entity.name,
    total: entityTotal,
    categories: categoryTotals,
  };
}
```

---

## 4. Family Budget Summary

### 4.1 Summary Interface

```typescript
interface BudgetSummary {
  grandTotal: number;
  fortnightly: number;  // grandTotal / 26
  monthly: number;      // grandTotal / 12
  weekly: number;       // grandTotal / 52
  
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
  
  completionRate: number;  // 0-100%
  categoriesCompleted: number;
  categoriesTotal: number;
}
```

### 4.2 Implementation

```typescript
/**
 * Calculate complete family budget summary
 */
export function calculateBudgetSummary(
  household: Household | null,
  children: Child[],
  adults: Adult[],
  categories: Category[],
  items: ExpenseItem[]
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
  const grandTotal = childrenTotal + adultsTotal + householdTotal;
  
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
      total: childrenTotal,
      entities: childrenTotals,
    },
    
    adults: {
      total: adultsTotal,
      entities: adultsTotals,
    },
    
    household: {
      total: householdTotal,
      entity: householdEntity,
    },
    
    completionRate,
    categoriesCompleted: categoriesWithItems,
    categoriesTotal: totalCategories,
  };
}
```

---

## 5. Planning Mode Calculations

### 5.1 Need/Want Classification

```typescript
interface PlanningItem extends ExpenseItem {
  needWant: 'need' | 'want' | null;
  adjustedTotal: number | null;
  savings: number;  // original - adjusted
}

/**
 * Calculate savings from planning adjustments
 */
export function calculatePlanningTotal(items: PlanningItem[]): {
  originalTotal: number;
  adjustedTotal: number;
  totalSavings: number;
  needsTotal: number;
  wantsTotal: number;
} {
  let originalTotal = 0;
  let adjustedTotal = 0;
  let needsTotal = 0;
  let wantsTotal = 0;
  
  for (const item of items) {
    const original = item.total;
    const adjusted = item.adjustedTotal ?? item.total;
    
    originalTotal += original;
    adjustedTotal += adjusted;
    
    if (item.needWant === 'need') {
      needsTotal += adjusted;
    } else if (item.needWant === 'want') {
      wantsTotal += adjusted;
    }
  }
  
  return {
    originalTotal,
    adjustedTotal,
    totalSavings: originalTotal - adjustedTotal,
    needsTotal,
    wantsTotal,
  };
}
```

### 5.2 What-If Scenarios

```typescript
/**
 * Calculate the impact of reducing all 'wants' by a percentage
 */
export function calculateWantsReduction(
  items: PlanningItem[],
  reductionPercent: number
): {
  newTotal: number;
  savings: number;
} {
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
```

---

## 6. Currency Formatting

### 6.1 Format Functions

```typescript
// lib/utils/formatters.ts

const AUD_FORMATTER = new Intl.NumberFormat('en-AU', {
  style: 'currency',
  currency: 'AUD',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

const AUD_FORMATTER_CENTS = new Intl.NumberFormat('en-AU', {
  style: 'currency',
  currency: 'AUD',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/**
 * Format amount as AUD currency (no cents for large amounts)
 */
export function formatCurrency(amount: number): string {
  if (Math.abs(amount) >= 100) {
    return AUD_FORMATTER.format(amount);
  }
  return AUD_FORMATTER_CENTS.format(amount);
}

/**
 * Format amount with explicit cents
 */
export function formatCurrencyExact(amount: number): string {
  return AUD_FORMATTER_CENTS.format(amount);
}

/**
 * Format large amounts (e.g., $24.5k)
 */
export function formatCompactCurrency(amount: number): string {
  if (amount >= 1000) {
    return `$${(amount / 1000).toFixed(1)}k`;
  }
  return formatCurrency(amount);
}
```

---

## 7. Validation

### 7.1 Input Validation

```typescript
// lib/utils/validators.ts

export function validateCost(value: string | number): {
  valid: boolean;
  value: number;
  error?: string;
} {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  
  if (isNaN(num)) {
    return { valid: false, value: 0, error: 'Invalid number' };
  }
  
  if (num < 0) {
    return { valid: false, value: 0, error: 'Cost cannot be negative' };
  }
  
  if (num > 1000000) {
    return { valid: false, value: 0, error: 'Cost too large' };
  }
  
  return { valid: true, value: Math.round(num * 100) / 100 };
}

export function validateQuantity(value: string | number): {
  valid: boolean;
  value: number;
  error?: string;
} {
  const num = typeof value === 'string' ? parseInt(value, 10) : value;
  
  if (isNaN(num) || !Number.isInteger(num)) {
    return { valid: false, value: 1, error: 'Must be a whole number' };
  }
  
  if (num < 1) {
    return { valid: false, value: 1, error: 'Quantity must be at least 1' };
  }
  
  if (num > 100) {
    return { valid: false, value: 1, error: 'Quantity too large' };
  }
  
  return { valid: true, value: num };
}
```

---

## 8. Files to Create

| File | Description |
|------|-------------|
| `lib/utils/calculations.ts` | All calculation functions |
| `lib/utils/formatters.ts` | Currency and date formatting |
| `lib/utils/validators.ts` | Input validation |
| `lib/utils/index.ts` | Re-exports |

---

## 9. Acceptance Criteria

- [ ] Weekly expense calculated as cost × 52
- [ ] Monthly expense calculated as cost × 12
- [ ] Term expense calculated as cost × 4
- [ ] Quantity multiplier applied correctly
- [ ] Percentage categories calculate from other categories
- [ ] Grand total equals sum of all entity totals
- [ ] Fortnightly = annual ÷ 26
- [ ] Currency formatted in AUD with proper locale
- [ ] Planning savings calculated correctly
- [ ] Need/want totals accurate
