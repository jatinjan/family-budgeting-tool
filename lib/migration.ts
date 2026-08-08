/**
 * Data Migration Layer
 * Handles migrating existing IndexedDB data to Supabase when a user signs up
 */

import { db } from './db'
import { supabase } from './supabase'
import { formatCurrency } from './utils/formatters'

export interface LocalDataSummary {
  hasData: boolean
  hasHousehold: boolean
  childrenCount: number
  adultsCount: number
  categoriesCount: number
  itemsCount: number
  totalAnnual: number
}

export interface MigrationResult {
  success: boolean
  migratedCount: number
  errors: string[]
}

/**
 * Check for existing local data in IndexedDB
 */
export async function checkLocalData(): Promise<LocalDataSummary> {
  try {
    const [
      households,
      children,
      adults,
      categories,
      adultCategories,
      householdCategories,
      items,
      adultItems,
      householdItems,
    ] = await Promise.all([
      db.households.toArray(),
      db.children.toArray(),
      db.adults.toArray(),
      db.categories.toArray(),
      db.adultCategories.toArray(),
      db.householdCategories.toArray(),
      db.items.toArray(),
      db.adultItems.toArray(),
      db.householdItems.toArray(),
    ])

    const allItems = [...items, ...adultItems, ...householdItems]
    const allCategories = [...categories, ...adultCategories, ...householdCategories]

    const totalAnnual = allItems.reduce((sum, item) => sum + (item.total || 0), 0)

    return {
      hasData: households.length > 0 || children.length > 0 || adults.length > 0 || allItems.length > 0,
      hasHousehold: households.length > 0,
      childrenCount: children.length,
      adultsCount: adults.length,
      categoriesCount: allCategories.length,
      itemsCount: allItems.length,
      totalAnnual,
    }
  } catch (error) {
    console.error('Error checking local data:', error)
    return {
      hasData: false,
      hasHousehold: false,
      childrenCount: 0,
      adultsCount: 0,
      categoriesCount: 0,
      itemsCount: 0,
      totalAnnual: 0,
    }
  }
}

function chunkArray<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = []
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size))
  }
  return chunks
}

/**
 * Migrate all local data to Supabase
 */
export async function migrateToCloud(userId: string): Promise<MigrationResult> {
  const errors: string[] = []
  let migratedCount = 0

  const idMap: Record<string, string> = {}

  try {
    const [
      households,
      children,
      adults,
      categories,
      adultCategories,
      householdCategories,
      items,
      adultItems,
      householdItems,
    ] = await Promise.all([
      db.households.toArray(),
      db.children.toArray(),
      db.adults.toArray(),
      db.categories.toArray(),
      db.adultCategories.toArray(),
      db.householdCategories.toArray(),
      db.items.toArray(),
      db.adultItems.toArray(),
      db.householdItems.toArray(),
    ])

    if (households.length > 0) {
      const householdData = households[0]
      const { data, error } = await supabase
        .from('households')
        .insert({
          user_id: userId,
          name: householdData.name,
          housing_type: householdData.housingType,
          members: householdData.members || 1,
        })
        .select()
        .single()

      if (error) {
        errors.push(`Household: ${error.message}`)
      } else if (data) {
        idMap[`household:${householdData.id}`] = data.id
        migratedCount++
      }
    }

    for (const child of children) {
      const { data, error } = await supabase
        .from('children')
        .insert({
          user_id: userId,
          name: child.name,
          age: child.age,
          school_level: child.schoolLevel,
        })
        .select()
        .single()

      if (error) {
        errors.push(`Child "${child.name}": ${error.message}`)
      } else if (data) {
        idMap[`child:${child.id}`] = data.id
        migratedCount++
      }
    }

    for (const adult of adults) {
      const { data, error } = await supabase
        .from('adults')
        .insert({
          user_id: userId,
          name: adult.name,
          age: adult.age,
        })
        .select()
        .single()

      if (error) {
        errors.push(`Adult "${adult.name}": ${error.message}`)
      } else if (data) {
        idMap[`adult:${adult.id}`] = data.id
        migratedCount++
      }
    }

    for (const category of categories) {
      const cloudChildId = idMap[`child:${category.childId}`]
      if (!cloudChildId) {
        errors.push(`Category "${category.name}": child not migrated`)
        continue
      }

      const { data, error } = await supabase
        .from('categories')
        .insert({
          user_id: userId,
          entity_type: 'child',
          entity_id: cloudChildId,
          name: category.name,
          description: category.description || '',
          is_percentage_based: category.isPercentageBased || false,
          percentage_value: category.percentageValue || 15,
          sort_order: category.order,
        })
        .select()
        .single()

      if (error) {
        errors.push(`Category "${category.name}": ${error.message}`)
      } else if (data) {
        idMap[`category:${category.id}`] = data.id
        migratedCount++
      }
    }

    for (const category of adultCategories) {
      const cloudAdultId = idMap[`adult:${category.adultId}`]
      if (!cloudAdultId) {
        errors.push(`Adult Category "${category.name}": adult not migrated`)
        continue
      }

      const { data, error } = await supabase
        .from('categories')
        .insert({
          user_id: userId,
          entity_type: 'adult',
          entity_id: cloudAdultId,
          name: category.name,
          description: category.description || '',
          is_percentage_based: category.isPercentageBased || false,
          percentage_value: category.percentageValue || 15,
          sort_order: category.order,
        })
        .select()
        .single()

      if (error) {
        errors.push(`Adult Category "${category.name}": ${error.message}`)
      } else if (data) {
        idMap[`adultCategory:${category.id}`] = data.id
        migratedCount++
      }
    }

    for (const category of householdCategories) {
      const cloudHouseholdId = idMap[`household:${category.householdId}`]
      if (!cloudHouseholdId) {
        errors.push(`Household Category "${category.name}": household not migrated`)
        continue
      }

      const { data, error } = await supabase
        .from('categories')
        .insert({
          user_id: userId,
          entity_type: 'household',
          entity_id: cloudHouseholdId,
          name: category.name,
          description: category.description || '',
          is_percentage_based: category.isPercentageBased || false,
          percentage_value: category.percentageValue || 15,
          sort_order: category.order,
        })
        .select()
        .single()

      if (error) {
        errors.push(`Household Category "${category.name}": ${error.message}`)
      } else if (data) {
        idMap[`householdCategory:${category.id}`] = data.id
        migratedCount++
      }
    }

    const migrateItems = async (
      itemList: typeof items,
      categoryPrefix: string,
      itemType: string
    ) => {
      const batches = chunkArray(itemList, 50)

      for (const batch of batches) {
        const mappedItems = batch
          .map(item => {
            const cloudCategoryId = idMap[`${categoryPrefix}:${item.categoryId}`]
            if (!cloudCategoryId) return null

            return {
              user_id: userId,
              category_id: cloudCategoryId,
              name: item.name,
              cost: item.cost,
              frequency: item.frequency,
              quantity: item.quantity,
              total: item.total,
              need_want: item.needWant || null,
              adjusted_total: item.adjustedTotal || null,
            }
          })
          .filter((item): item is NonNullable<typeof item> => item !== null)

        if (mappedItems.length > 0) {
          const { error } = await supabase
            .from('expense_items')
            .insert(mappedItems)

          if (error) {
            errors.push(`${itemType} items batch: ${error.message}`)
          } else {
            migratedCount += mappedItems.length
          }
        }
      }
    }

    await migrateItems(items, 'category', 'Child')
    await migrateItems(adultItems, 'adultCategory', 'Adult')
    await migrateItems(householdItems, 'householdCategory', 'Household')

    if (errors.length === 0) {
      await clearLocalData()
    }

    return {
      success: errors.length === 0,
      migratedCount,
      errors,
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    return {
      success: false,
      migratedCount,
      errors: [...errors, `Unexpected error: ${errorMessage}`],
    }
  }
}

/**
 * Clear all local data from IndexedDB
 */
export async function clearLocalData(): Promise<void> {
  await db.transaction('rw', [
    db.households,
    db.children,
    db.adults,
    db.categories,
    db.adultCategories,
    db.householdCategories,
    db.items,
    db.adultItems,
    db.householdItems,
  ], async () => {
    await db.households.clear()
    await db.children.clear()
    await db.adults.clear()
    await db.categories.clear()
    await db.adultCategories.clear()
    await db.householdCategories.clear()
    await db.items.clear()
    await db.adultItems.clear()
    await db.householdItems.clear()
  })
}

/**
 * Format local data summary for display
 */
export function formatLocalDataSummary(summary: LocalDataSummary): string {
  const parts: string[] = []

  if (summary.hasHousehold) parts.push('1 household')
  if (summary.childrenCount > 0) parts.push(`${summary.childrenCount} ${summary.childrenCount === 1 ? 'child' : 'children'}`)
  if (summary.adultsCount > 0) parts.push(`${summary.adultsCount} ${summary.adultsCount === 1 ? 'adult' : 'adults'}`)
  if (summary.itemsCount > 0) parts.push(`${summary.itemsCount} budget ${summary.itemsCount === 1 ? 'item' : 'items'}`)

  if (parts.length === 0) return 'No data found'

  return parts.join(', ')
}
