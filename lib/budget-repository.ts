import { supabase } from '@/lib/supabase'
import type { Adult, Category, Child, ExpenseItem, Household } from '@/types/database'

export interface CloudBudgetRows {
  households: Household[]
  adults: Adult[]
  children: Child[]
  categories: Category[]
  expenseItems: ExpenseItem[]
}

function throwQueryError(
  table: keyof CloudBudgetRows,
  error: { message: string } | null,
): void {
  if (error) {
    throw new Error(`Could not load ${table}: ${error.message}`)
  }
}

/**
 * Canonical authenticated read repository. RLS remains the security boundary;
 * the user id filter narrows the query and protects callers from mixed caches.
 */
export async function fetchCloudBudgetRows(userId: string): Promise<CloudBudgetRows> {
  const [households, adults, children, categories, expenseItems] = await Promise.all([
    supabase
      .from('households')
      .select('*')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false }),
    supabase.from('adults').select('*').eq('user_id', userId).order('name'),
    supabase.from('children').select('*').eq('user_id', userId).order('name'),
    supabase.from('categories').select('*').eq('user_id', userId).order('sort_order'),
    supabase.from('expense_items').select('*').eq('user_id', userId),
  ])

  throwQueryError('households', households.error)
  throwQueryError('adults', adults.error)
  throwQueryError('children', children.error)
  throwQueryError('categories', categories.error)
  throwQueryError('expenseItems', expenseItems.error)

  return {
    households: (households.data ?? []) as Household[],
    adults: (adults.data ?? []) as Adult[],
    children: (children.data ?? []) as Child[],
    categories: (categories.data ?? []) as Category[],
    expenseItems: (expenseItems.data ?? []) as ExpenseItem[],
  }
}
