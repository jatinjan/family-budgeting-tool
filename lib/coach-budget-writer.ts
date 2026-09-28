import { supabase } from '@/lib/supabase'
import { fetchLatestLease, leaseState } from '@/lib/coach-lease'
import {
  calculateAnnualCost,
  defaultAdultCategories,
  defaultCategories,
  defaultHouseholdCategories,
  type BudgetFrequency,
} from '@/lib/budget-templates'
import {
  isCheckConstraintError,
  mapFrequencyToCloud,
  mapHousingTypeToCloud,
  mapSchoolLevelToCloud,
} from '@/lib/sync-field-map'
import type { ExpenseItem } from '@/types/database'

export type CoachEntityType = 'child' | 'adult' | 'household'

type EntityTable = 'children' | 'adults' | 'households'
type BudgetTable = EntityTable | 'categories' | 'expense_items'

/** The lease ended (timed out, family took back, or claimed) mid-edit. */
export class LeaseEndedError extends Error {
  constructor() {
    super('Your editing session has ended. Changes were not saved.')
    this.name = 'LeaseEndedError'
  }
}

/** Someone else changed this row since it was loaded. */
export class StaleRowError extends Error {
  constructor() {
    super('This was changed somewhere else. The latest version has been loaded; please try again.')
    this.name = 'StaleRowError'
  }
}

const ENTITY_TABLE: Record<CoachEntityType, EntityTable> = {
  child: 'children',
  adult: 'adults',
  household: 'households',
}

function toWriteError(error: { message: string }): Error {
  if (/COACH_LEASE_REQUIRED|BUDGET_LOCKED|row-level security/i.test(error.message)) {
    return new LeaseEndedError()
  }
  return new Error(error.message)
}

/** RLS hides rows from a coach without a lease, so a 0-row write needs a lease check to be explained. */
async function zeroRowError(familyId: string): Promise<Error> {
  const [{ data: auth }, lease] = await Promise.all([
    supabase.auth.getUser(),
    fetchLatestLease(familyId).catch(() => null),
  ])
  const holds = lease && leaseState(lease) === 'active' && lease.coach_id === auth.user?.id
  return holds ? new StaleRowError() : new LeaseEndedError()
}

function templatesFor(type: CoachEntityType) {
  if (type === 'child') return defaultCategories
  if (type === 'adult') return defaultAdultCategories
  return defaultHouseholdCategories
}

/** Same default categories and items the family app creates locally. */
export function buildTemplateCategories(type: CoachEntityType) {
  return templatesFor(type).map((template) => {
    const percentage = 'isPercentageBased' in template && template.isPercentageBased
    const percentageValue = ('percentageValue' in template && template.percentageValue) || 15
    const items = percentage
      ? [{ name: 'Miscellaneous', cost: 0, frequency: 'annual', quantity: 1, total: 0, need_want: 'want' }]
      : template.items.map((item) => ({
          name: item.name,
          cost: item.cost,
          frequency: item.frequency,
          quantity: item.quantity,
          total: calculateAnnualCost(item.cost, item.frequency, item.quantity),
          need_want: item.needWant ?? null,
        }))
    return {
      name: template.name,
      description: template.description,
      is_percentage_based: Boolean(percentage),
      percentage_value: percentageValue,
      sort_order: template.order,
      items,
    }
  })
}

type Fields = Record<string, unknown>

function cloudSafe(table: BudgetTable, fields: Fields): Fields {
  const next = { ...fields }
  if (table === 'children' && 'school_level' in next) next.school_level = mapSchoolLevelToCloud(next.school_level)
  if (table === 'households' && 'housing_type' in next) next.housing_type = mapHousingTypeToCloud(next.housing_type)
  if (table === 'expense_items' && 'frequency' in next) next.frequency = mapFrequencyToCloud(next.frequency)
  return next
}

export async function createEntity(familyId: string, type: CoachEntityType, fields: Fields): Promise<string> {
  const categories = buildTemplateCategories(type)
  const call = (payload: Fields) =>
    supabase.rpc('coach_create_entity', {
      p_family: familyId,
      p_entity_type: type,
      p_fields: payload,
      p_categories: categories,
    } as never)

  let { data, error } = await call(fields)
  if (error && isCheckConstraintError(error)) {
    ;({ data, error } = await call(cloudSafe(ENTITY_TABLE[type], fields)))
  }
  if (error) throw toWriteError(error)
  return data as unknown as string
}

export async function deleteEntity(familyId: string, type: CoachEntityType, entityId: string): Promise<void> {
  const { error } = await supabase.rpc('coach_delete_entity', {
    p_family: familyId,
    p_entity_type: type,
    p_entity: entityId,
  } as never)
  if (error) throw toWriteError(error)
}

/** Compare-and-swap update: only applies if the row is still at `expectedUpdatedAt`. */
async function updateRow(
  table: BudgetTable,
  familyId: string,
  rowId: string,
  expectedUpdatedAt: string,
  fields: Fields,
): Promise<void> {
  const run = (payload: Fields) =>
    supabase
      .from(table)
      .update(payload as never)
      .eq('id', rowId)
      .eq('user_id', familyId)
      .eq('updated_at', expectedUpdatedAt)
      .select('id')
      .maybeSingle()

  let { data, error } = await run(fields)
  if (error && isCheckConstraintError(error)) {
    ;({ data, error } = await run(cloudSafe(table, fields)))
  }
  if (error) throw toWriteError(error)
  if (!data) throw await zeroRowError(familyId)
}

export function updateEntity(
  familyId: string,
  type: CoachEntityType,
  entityId: string,
  expectedUpdatedAt: string,
  fields: Fields,
): Promise<void> {
  return updateRow(ENTITY_TABLE[type], familyId, entityId, expectedUpdatedAt, fields)
}

export function updateCategoryPercentage(
  familyId: string,
  categoryId: string,
  expectedUpdatedAt: string,
  percentageValue: number,
): Promise<void> {
  return updateRow('categories', familyId, categoryId, expectedUpdatedAt, { percentage_value: percentageValue })
}

export interface ItemInput {
  name: string
  cost: number
  frequency: BudgetFrequency
  quantity: number
  needWant: 'need' | 'want' | null
}

function itemFields(input: ItemInput): Fields {
  return {
    name: input.name.trim(),
    cost: input.cost,
    frequency: input.frequency,
    quantity: input.quantity,
    total: calculateAnnualCost(input.cost, input.frequency, input.quantity),
    need_want: input.needWant,
  }
}

export async function addItem(familyId: string, categoryId: string, input: ItemInput): Promise<void> {
  const payload = { user_id: familyId, category_id: categoryId, ...itemFields(input) }
  let { error } = await supabase.from('expense_items').insert(payload as never)
  if (error && isCheckConstraintError(error)) {
    ;({ error } = await supabase.from('expense_items').insert(cloudSafe('expense_items', payload) as never))
  }
  if (error) throw toWriteError(error)
}

export function updateItem(familyId: string, item: ExpenseItem, input: ItemInput): Promise<void> {
  return updateRow('expense_items', familyId, item.id, item.updated_at, itemFields(input))
}

export async function deleteItem(familyId: string, item: ExpenseItem): Promise<void> {
  const { data, error } = await supabase
    .from('expense_items')
    .delete()
    .eq('id', item.id)
    .eq('user_id', familyId)
    .eq('updated_at', item.updated_at)
    .select('id')
    .maybeSingle()
  if (error) throw toWriteError(error)
  if (!data) throw await zeroRowError(familyId)
}
