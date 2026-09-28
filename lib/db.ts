import Dexie, { type EntityTable } from "dexie"
import type { SyncFailureCode, SyncStatus } from "@/types/sync"
import {
  calculateAnnualCost,
  calculateMiscellaneousTotal,
  defaultAdultCategories,
  defaultCategories,
  defaultHouseholdCategories,
  type BudgetFrequency,
} from "./budget-templates"

// Sync metadata mixin for all syncable records
export interface SyncableFields {
  syncStatus: SyncStatus
  lastModified: number
  lastSynced: number | null
  syncAttempts: number
  cloudId: string | null
  serverUpdatedAt?: string | null
  pendingOperation?: "CREATE" | "UPDATE" | null
  syncErrorCode?: SyncFailureCode | null
  syncErrorMessage?: string | null
}

export interface Child extends Partial<SyncableFields> {
  id?: number
  name: string
  age: number
  schoolLevel: string
  region?: string
  createdAt: Date
}

export interface Adult extends Partial<SyncableFields> {
  id?: number
  name: string
  age: number
  createdAt: Date
}

export interface Household extends Partial<SyncableFields> {
  id?: number
  name: string
  housingType: string
  members: number
  createdAt: Date
}

export interface Category extends Partial<SyncableFields> {
  id?: number
  childId: number
  name: string
  description: string
  confidencePercent?: number
  isPercentageBased?: boolean
  percentageValue?: number
  order: number
}

export interface AdultCategory extends Partial<SyncableFields> {
  id?: number
  adultId: number
  name: string
  description: string
  confidencePercent?: number
  isPercentageBased?: boolean
  percentageValue?: number
  order: number
}

export interface HouseholdCategory extends Partial<SyncableFields> {
  id?: number
  householdId: number
  name: string
  description: string
  confidencePercent?: number
  isPercentageBased?: boolean
  percentageValue?: number
  order: number
}

export type { BudgetFrequency }

export interface ExpenseItem extends Partial<SyncableFields> {
  id?: number
  categoryId: number
  name: string
  cost: number
  frequency: BudgetFrequency
  quantity: number
  total: number
  needWant?: "need" | "want"
  adjustedTotal?: number
}

export interface AdultExpenseItem extends Partial<SyncableFields> {
  id?: number
  categoryId: number
  name: string
  cost: number
  frequency: BudgetFrequency
  quantity: number
  total: number
  needWant?: "need" | "want"
  adjustedTotal?: number
}

export interface HouseholdExpenseItem extends Partial<SyncableFields> {
  id?: number
  categoryId: number
  name: string
  cost: number
  frequency: BudgetFrequency
  quantity: number
  total: number
  needWant?: "need" | "want"
  adjustedTotal?: number
}

export interface Settings {
  key: string
  value: string
}

export interface SyncQueue {
  id?: number
  table: string
  operation: "INSERT" | "UPDATE" | "DELETE"
  recordId: number
  cloudId: string | null
  ownerUserId: string
  expectedUpdatedAt?: string | null
  timestamp: number
  attempts: number
  lastError?: string | null
}

export interface QuarantineSnapshot {
  id: string
  ownerUserId: string | null
  createdAt: number
  reason: "ACCOUNT_SWITCH" | "LEGACY_CLOUD_RESET"
  data: string
}

const db = new Dexie("FamilyBudgetingApp") as Dexie & {
  children: EntityTable<Child, "id">
  categories: EntityTable<Category, "id">
  items: EntityTable<ExpenseItem, "id">
  adults: EntityTable<Adult, "id">
  adultCategories: EntityTable<AdultCategory, "id">
  adultItems: EntityTable<AdultExpenseItem, "id">
  households: EntityTable<Household, "id">
  householdCategories: EntityTable<HouseholdCategory, "id">
  householdItems: EntityTable<HouseholdExpenseItem, "id">
  settings: EntityTable<Settings, "key">
  syncQueue: EntityTable<SyncQueue, "id">
  quarantineSnapshots: EntityTable<QuarantineSnapshot, "id">
}

// Schema definition - version 1 (original)
db.version(1).stores({
  children: "++id, name, age, schoolLevel, region, createdAt",
  categories: "++id, childId, name, order",
  items: "++id, categoryId, name, frequency, needWant, adjustedTotal",
  adults: "++id, name, age, createdAt",
  adultCategories: "++id, adultId, name, order",
  adultItems: "++id, categoryId, name, frequency, needWant, adjustedTotal",
  households: "++id, name, housingType, members, createdAt",
  householdCategories: "++id, householdId, name, order",
  householdItems: "++id, categoryId, name, frequency, needWant, adjustedTotal",
  settings: "key",
})

// Schema definition - version 2 (with sync metadata)
db.version(2).stores({
  children: "++id, name, age, schoolLevel, region, createdAt, syncStatus, cloudId",
  categories: "++id, childId, name, order, syncStatus, cloudId",
  items: "++id, categoryId, name, frequency, needWant, adjustedTotal, syncStatus, cloudId",
  adults: "++id, name, age, createdAt, syncStatus, cloudId",
  adultCategories: "++id, adultId, name, order, syncStatus, cloudId",
  adultItems: "++id, categoryId, name, frequency, needWant, adjustedTotal, syncStatus, cloudId",
  households: "++id, name, housingType, members, createdAt, syncStatus, cloudId",
  householdCategories: "++id, householdId, name, order, syncStatus, cloudId",
  householdItems: "++id, categoryId, name, frequency, needWant, adjustedTotal, syncStatus, cloudId",
  settings: "key",
  syncQueue: "++id, table, operation, recordId, cloudId, timestamp",
}).upgrade(tx => {
  // Add sync metadata to existing records
  const addSyncMeta = (table: Dexie.Table) => {
    return table.toCollection().modify(record => {
      if (!record.syncStatus) {
        record.syncStatus = "LOCAL_ONLY"
        record.lastModified = Date.now()
        record.lastSynced = null
        record.syncAttempts = 0
        record.cloudId = null
      }
    })
  }

  return Promise.all([
    addSyncMeta(tx.table("children")),
    addSyncMeta(tx.table("categories")),
    addSyncMeta(tx.table("items")),
    addSyncMeta(tx.table("adults")),
    addSyncMeta(tx.table("adultCategories")),
    addSyncMeta(tx.table("adultItems")),
    addSyncMeta(tx.table("households")),
    addSyncMeta(tx.table("householdCategories")),
    addSyncMeta(tx.table("householdItems")),
  ])
})

// Schema definition - version 3 (account boundary and delete outbox)
db.version(3).stores({
  children: "++id, name, age, schoolLevel, region, createdAt, syncStatus, cloudId",
  categories: "++id, childId, name, order, syncStatus, cloudId",
  items: "++id, categoryId, name, frequency, needWant, adjustedTotal, syncStatus, cloudId",
  adults: "++id, name, age, createdAt, syncStatus, cloudId",
  adultCategories: "++id, adultId, name, order, syncStatus, cloudId",
  adultItems: "++id, categoryId, name, frequency, needWant, adjustedTotal, syncStatus, cloudId",
  households: "++id, name, housingType, members, createdAt, syncStatus, cloudId",
  householdCategories: "++id, householdId, name, order, syncStatus, cloudId",
  householdItems: "++id, categoryId, name, frequency, needWant, adjustedTotal, syncStatus, cloudId",
  settings: "key",
  syncQueue: "++id, ownerUserId, [ownerUserId+operation], table, operation, recordId, cloudId, timestamp",
  quarantineSnapshots: "id, ownerUserId, createdAt",
})

export { db }

export {
  defaultCategories,
  defaultAdultCategories,
  defaultHouseholdCategories,
  calculateAnnualCost,
  calculateMiscellaneousTotal,
}

// Initialize default data for a child
export async function initializeChildData(childId: number) {
  for (const categoryTemplate of defaultCategories) {
    const categoryId = await db.categories.add({
      childId,
      name: categoryTemplate.name,
      description: categoryTemplate.description,
      confidencePercent: categoryTemplate.confidencePercent,
      isPercentageBased: categoryTemplate.isPercentageBased,
      percentageValue: categoryTemplate.percentageValue,
      order: categoryTemplate.order,
    })

    if (categoryTemplate.isPercentageBased && categoryTemplate.percentageValue) {
      const otherCategoriesTotal = await db.items
        .where("categoryId")
        .notEqual(categoryId as number)
        .toArray()
        .then((items) => items.reduce((acc, item) => acc + item.total, 0))

      const miscellaneousTotal = calculateMiscellaneousTotal(categoryTemplate.percentageValue, otherCategoriesTotal)

      await db.items.add({
        categoryId: categoryId as number,
        name: "Miscellaneous",
        cost: miscellaneousTotal,
        frequency: "annual" as const,
        quantity: 1,
        total: miscellaneousTotal,
        needWant: "want" as const,
      })
    } else {
      for (const itemTemplate of categoryTemplate.items) {
        const total = calculateAnnualCost(itemTemplate.cost, itemTemplate.frequency, itemTemplate.quantity)

        await db.items.add({
          categoryId: categoryId as number,
          name: itemTemplate.name,
          cost: itemTemplate.cost,
          frequency: itemTemplate.frequency,
          quantity: itemTemplate.quantity,
          total,
          needWant: itemTemplate.needWant,
        })
      }
    }
  }
}

// Initialize default data for an adult
export async function initializeAdultData(adultId: number) {
  for (const categoryTemplate of defaultAdultCategories) {
    const categoryId = await db.adultCategories.add({
      adultId,
      name: categoryTemplate.name,
      description: categoryTemplate.description,
      confidencePercent: categoryTemplate.confidencePercent,
      isPercentageBased: categoryTemplate.isPercentageBased,
      percentageValue: categoryTemplate.percentageValue,
      order: categoryTemplate.order,
    })

    if (categoryTemplate.isPercentageBased && categoryTemplate.percentageValue) {
      const otherCategoriesTotal = await db.adultItems
        .where("categoryId")
        .notEqual(categoryId as number)
        .toArray()
        .then((items) => items.reduce((acc, item) => acc + item.total, 0))

      const miscellaneousTotal = calculateMiscellaneousTotal(categoryTemplate.percentageValue, otherCategoriesTotal)

      await db.adultItems.add({
        categoryId: categoryId as number,
        name: "Miscellaneous",
        cost: miscellaneousTotal,
        frequency: "annual" as const,
        quantity: 1,
        total: miscellaneousTotal,
        needWant: "want" as const,
      })
    } else {
      for (const itemTemplate of categoryTemplate.items) {
        const total = calculateAnnualCost(itemTemplate.cost, itemTemplate.frequency, itemTemplate.quantity)

        await db.adultItems.add({
          categoryId: categoryId as number,
          name: itemTemplate.name,
          cost: itemTemplate.cost,
          frequency: itemTemplate.frequency,
          quantity: itemTemplate.quantity,
          total,
          needWant: itemTemplate.needWant,
        })
      }
    }
  }
}

// Initialize default data for a household
export async function initializeHouseholdData(householdId: number) {
  for (const categoryTemplate of defaultHouseholdCategories) {
    const categoryId = await db.householdCategories.add({
      householdId,
      name: categoryTemplate.name,
      description: categoryTemplate.description,
      confidencePercent: categoryTemplate.confidencePercent,
      isPercentageBased: categoryTemplate.isPercentageBased,
      percentageValue: categoryTemplate.percentageValue,
      order: categoryTemplate.order,
    })

    if (categoryTemplate.isPercentageBased && categoryTemplate.percentageValue) {
      const otherCategoriesTotal = await db.householdItems
        .where("categoryId")
        .notEqual(categoryId as number)
        .toArray()
        .then((items) => items.reduce((acc, item) => acc + item.total, 0))

      const miscellaneousTotal = calculateMiscellaneousTotal(categoryTemplate.percentageValue, otherCategoriesTotal)

      await db.householdItems.add({
        categoryId: categoryId as number,
        name: "Miscellaneous",
        cost: miscellaneousTotal,
        frequency: "annual" as const,
        quantity: 1,
        total: miscellaneousTotal,
        needWant: "want" as const,
      })
    } else {
      for (const itemTemplate of categoryTemplate.items) {
        const total = calculateAnnualCost(itemTemplate.cost, itemTemplate.frequency, itemTemplate.quantity)

        await db.householdItems.add({
          categoryId: categoryId as number,
          name: itemTemplate.name,
          cost: itemTemplate.cost,
          frequency: itemTemplate.frequency,
          quantity: itemTemplate.quantity,
          total,
          needWant: itemTemplate.needWant,
        })
      }
    }
  }
}
