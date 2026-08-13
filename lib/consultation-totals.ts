import { forwardPlanningNames, needsWantsName } from '@/lib/planning-categories'
import {
  calculateBudgetSummary,
  type BudgetSummary,
} from '@/lib/utils/calculations'
import type { Adult, Category, Child, ExpenseItem, Household } from '@/types/database'

export interface EntityPlanningTotals {
  currentSituationTotal: number
  forwardPlanningTotal: number
  potentialSavings: number
  wantTotal: number
  needsTotal: number
  miscPercentage: number
  miscCurrentSituation: number
  miscForwardPlanning: number
}

export function budgetSummaryFromFamily(input: {
  household: Household | null
  children: Child[]
  adults: Adult[]
  categories: Category[]
  expenseItems: ExpenseItem[]
}): BudgetSummary {
  return calculateBudgetSummary(
    input.household,
    input.children,
    input.adults,
    input.categories,
    input.expenseItems.map((item) => ({
      id: item.id,
      category_id: item.category_id,
      total: item.total,
    }))
  )
}

export function categoriesForEntity(
  categories: Category[],
  entityType: 'child' | 'adult' | 'household',
  entityId: string
): Category[] {
  return categories
    .filter((category) => category.entity_type === entityType && category.entity_id === entityId)
    .slice()
    .sort((a, b) => a.sort_order - b.sort_order)
}

export function itemsForCategory(items: ExpenseItem[], categoryId: string): ExpenseItem[] {
  return items.filter((item) => item.category_id === categoryId)
}

export function calculateEntityPlanningTotals(
  categories: Category[],
  items: ExpenseItem[],
  entityType: 'child' | 'adult' | 'household'
): EntityPlanningTotals {
  const forwardNames = forwardPlanningNames(entityType)
  const needsName = needsWantsName(entityType)
  const miscCategory = categories.find((category) => category.is_percentage_based)
  const miscPercentage = miscCategory?.percentage_value ?? 15

  const itemsIn = (predicate: (category: Category) => boolean) =>
    categories.filter(predicate).flatMap((category) => itemsForCategory(items, category.id))

  const nonMiscCurrentTotal = itemsIn((category) => !category.is_percentage_based)
    .reduce((sum, item) => sum + item.total, 0)
  const miscCurrentSituation = (miscPercentage / 100) * nonMiscCurrentTotal
  const currentSituationTotal = nonMiscCurrentTotal + miscCurrentSituation

  const needsTotal = itemsIn((category) => category.name === needsName)
    .filter((item) => item.need_want === 'need')
    .reduce((sum, item) => sum + (item.adjusted_total ?? item.total), 0)

  const forwardPlanningItemsTotal = itemsIn((category) => forwardNames.includes(category.name))
    .reduce((sum, item) => sum + (item.adjusted_total ?? item.total), 0)

  const miscForwardPlanning = (miscPercentage / 100) * (needsTotal + forwardPlanningItemsTotal)
  const forwardPlanningTotal = forwardPlanningItemsTotal + needsTotal + miscForwardPlanning
  const potentialSavings = currentSituationTotal - forwardPlanningTotal

  const wantTotal = itemsIn((category) => category.name === needsName)
    .filter((item) => item.need_want === 'want')
    .reduce((sum, item) => sum + (item.adjusted_total ?? item.total), 0)

  return {
    currentSituationTotal,
    forwardPlanningTotal,
    potentialSavings,
    wantTotal,
    needsTotal,
    miscPercentage,
    miscCurrentSituation,
    miscForwardPlanning,
  }
}
