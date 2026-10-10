import {
  calculateAnnualCost,
  defaultAdultCategories,
  defaultCategories,
  defaultHouseholdCategories,
} from "@/lib/budget-templates"
import { db } from "@/lib/db"

export type BudgetEntityKind = "child" | "adult" | "household"

/**
 * Restore any missing template categories or line items for one person/household.
 * Spec: docs/specs/budget-calculations.md §1.5
 */
export async function ensureBudgetTemplates(kind: BudgetEntityKind, entityId: number): Promise<boolean> {
  if (kind === "child") {
    return ensureFor(
      entityId,
      defaultCategories,
      db.categories,
      db.items,
      "childId",
    )
  }
  if (kind === "adult") {
    return ensureFor(
      entityId,
      defaultAdultCategories,
      db.adultCategories,
      db.adultItems,
      "adultId",
    )
  }
  return ensureFor(
    entityId,
    defaultHouseholdCategories,
    db.householdCategories,
    db.householdItems,
    "householdId",
  )
}

type TemplateItem = {
  name: string
  cost: number
  frequency: "weekly" | "fortnightly" | "monthly" | "quarterly" | "term" | "annual" | "bi-monthly"
  quantity: number
  needWant?: "need" | "want"
}

type TemplateCategory = {
  name: string
  description: string
  order: number
  confidencePercent?: number
  isPercentageBased?: boolean
  percentageValue?: number
  items: TemplateItem[]
}

type NamedRow = { id?: number; name: string }

async function ensureFor(
  entityId: number,
  templates: readonly TemplateCategory[],
  categoryTable: {
    where: (field: string) => { equals: (id: number) => { toArray: () => Promise<NamedRow[]> } }
    add: (row: Record<string, unknown>) => Promise<number>
  },
  itemTable: {
    where: (field: string) => { equals: (id: number) => { toArray: () => Promise<Array<{ name: string }>> } }
    add: (row: Record<string, unknown>) => Promise<unknown>
  },
  entityField: "childId" | "adultId" | "householdId",
): Promise<boolean> {
  let changed = false
  const existing = await categoryTable.where(entityField).equals(entityId).toArray()
  const byName = new Map(existing.map((category) => [category.name, category]))

  for (const template of templates) {
    let category = byName.get(template.name)
    if (!category?.id) {
      const id = await categoryTable.add({
        [entityField]: entityId,
        name: template.name,
        description: template.description,
        confidencePercent: template.confidencePercent,
        isPercentageBased: template.isPercentageBased,
        percentageValue: template.percentageValue,
        order: template.order,
      })
      category = { id, name: template.name }
      byName.set(template.name, category)
      changed = true
    }
    if (template.isPercentageBased || !category.id) continue

    const items = await itemTable.where("categoryId").equals(category.id).toArray()
    const names = new Set(items.map((item) => item.name))
    for (const item of template.items) {
      if (names.has(item.name)) continue
      const total = calculateAnnualCost(item.cost, item.frequency, item.quantity)
      await itemTable.add({
        categoryId: category.id,
        name: item.name,
        cost: item.cost,
        frequency: item.frequency,
        quantity: item.quantity,
        total,
        needWant: item.needWant,
      })
      names.add(item.name)
      changed = true
    }
  }

  return changed
}
