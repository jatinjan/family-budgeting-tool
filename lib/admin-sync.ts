// Sync utility to push main app data (IndexedDB) to admin panel (localStorage)
// This enables real-time visibility of user budget entries in the admin panel

import { db } from "./db"
import {
  getUsers,
  setUsers,
  getFamilyProfiles,
  setFamilyProfiles,
  getFamilyBudgets,
  setFamilyBudgets,
  addActivityEvent,
} from "./admin-state"
import type {
  FamilyProfile,
  FamilyBudgetSnapshot,
  EntityBudget,
  BudgetCategory,
  BudgetItem,
  OnboardingStatus,
  SchoolLevel,
  HousingType,
} from "./admin-mock-data"

// Get or create a demo user ID for the current session
function getDemoUserId(): string {
  if (typeof window === "undefined") return "demo_user"
  let userId = sessionStorage.getItem("mbff_demo_user_id")
  if (!userId) {
    // Check if there's a recently created user in admin state
    const users = getUsers()
    const recentUser = users.find(u => {
      const signedUp = new Date(u.signedUpAt)
      const now = new Date()
      const hoursDiff = (now.getTime() - signedUp.getTime()) / (1000 * 60 * 60)
      return hoursDiff < 24 // Users created in last 24 hours
    })
    if (recentUser) {
      userId = recentUser.id
    } else {
      userId = `usr_demo_${Date.now()}`
    }
    sessionStorage.setItem("mbff_demo_user_id", userId)
  }
  return userId
}

// Map school level strings to admin types
function mapSchoolLevel(level: string): SchoolLevel {
  const map: Record<string, SchoolLevel> = {
    "preschool": "preschool",
    "primary": "primary",
    "secondary": "secondary",
    "tertiary": "tertiary",
    "kindy": "preschool",
    "prep": "primary",
    "high school": "secondary",
    "university": "tertiary",
    "tafe": "tertiary",
  }
  return map[level.toLowerCase()] || "primary"
}

// Map housing type strings to admin types
function mapHousingType(type: string): HousingType {
  const map: Record<string, HousingType> = {
    "own": "own",
    "rent": "rent",
    "board": "board",
    "owned": "own",
    "renting": "rent",
    "mortgage": "own",
  }
  return map[type.toLowerCase()] || "other"
}

// Determine onboarding status based on data completeness
function determineOnboardingStatus(
  hasHousehold: boolean,
  hasChildren: boolean,
  hasAdults: boolean,
  totalBudget: number,
  categoriesCompleted: number,
  totalCategories: number
): OnboardingStatus {
  if (categoriesCompleted >= totalCategories * 0.8 && totalBudget > 0) {
    return "plan_complete"
  }
  if (totalBudget > 0 || categoriesCompleted > 0) {
    return "budget_started"
  }
  if (hasHousehold || hasChildren || hasAdults) {
    return "profile_complete"
  }
  return "signed_up"
}

// Convert expense items to admin format
function convertItems(items: Array<{
  name: string
  cost: number
  frequency: string
  total: number
  needWant?: "need" | "want"
}>): BudgetItem[] {
  return items
    .filter(item => item.cost > 0 || item.total > 0)
    .map(item => ({
      name: item.name,
      cost: item.cost,
      frequency: item.frequency as BudgetItem["frequency"],
      annualTotal: item.total,
      needWant: item.needWant || null,
    }))
}

// Sync all IndexedDB data to admin panel state
export async function syncToAdmin(): Promise<void> {
  try {
    const userId = getDemoUserId()
    
    // Load all data from IndexedDB
    const [children, adults, households] = await Promise.all([
      db.children.toArray(),
      db.adults.toArray(),
      db.households.toArray(),
    ])
    
    const household = households[0] // App only uses first household
    
    // If no data at all, nothing to sync
    if (!household && children.length === 0 && adults.length === 0) {
      return
    }
    
    // Build family profile
    const childProfiles = await Promise.all(
      children.map(async (child) => ({
        name: child.name,
        age: child.age,
        schoolLevel: mapSchoolLevel(child.schoolLevel),
      }))
    )
    
    const adultProfiles = adults.map(adult => ({
      name: adult.name,
      age: adult.age,
    }))
    
    // Build budget data
    let totalBudget = 0
    let categoriesCompleted = 0
    let totalCategories = 0
    
    // Children budgets
    const childBudgets: EntityBudget[] = await Promise.all(
      children.map(async (child) => {
        const categories = await db.categories.where("childId").equals(child.id!).toArray()
        const categoryBudgets: BudgetCategory[] = await Promise.all(
          categories.map(async (cat) => {
            const items = await db.items.where("categoryId").equals(cat.id!).toArray()
            const itemsWithCost = items.filter(i => i.cost > 0 || i.total > 0)
            const catTotal = items.reduce((sum, i) => sum + (i.total || 0), 0)
            
            totalCategories++
            if (itemsWithCost.length > 0) categoriesCompleted++
            
            return {
              name: cat.name,
              annualTotal: catTotal,
              itemCount: items.length,
              completedItemCount: itemsWithCost.length,
              items: convertItems(items),
            }
          })
        )
        
        const childTotal = categoryBudgets.reduce((sum, c) => sum + c.annualTotal, 0)
        totalBudget += childTotal
        
        return {
          entityName: `${child.name} (${child.age})`,
          totalAnnual: childTotal,
          categories: categoryBudgets,
        }
      })
    )
    
    // Adults budgets
    const adultBudgets: EntityBudget[] = await Promise.all(
      adults.map(async (adult) => {
        const categories = await db.adultCategories.where("adultId").equals(adult.id!).toArray()
        const categoryBudgets: BudgetCategory[] = await Promise.all(
          categories.map(async (cat) => {
            const items = await db.adultItems.where("categoryId").equals(cat.id!).toArray()
            const itemsWithCost = items.filter(i => i.cost > 0 || i.total > 0)
            const catTotal = items.reduce((sum, i) => sum + (i.total || 0), 0)
            
            totalCategories++
            if (itemsWithCost.length > 0) categoriesCompleted++
            
            return {
              name: cat.name,
              annualTotal: catTotal,
              itemCount: items.length,
              completedItemCount: itemsWithCost.length,
              items: convertItems(items),
            }
          })
        )
        
        const adultTotal = categoryBudgets.reduce((sum, c) => sum + c.annualTotal, 0)
        totalBudget += adultTotal
        
        return {
          entityName: adult.name,
          totalAnnual: adultTotal,
          categories: categoryBudgets,
        }
      })
    )
    
    // Household budget
    let householdBudget: EntityBudget | null = null
    if (household) {
      const categories = await db.householdCategories.where("householdId").equals(household.id!).toArray()
      const categoryBudgets: BudgetCategory[] = await Promise.all(
        categories.map(async (cat) => {
          const items = await db.householdItems.where("categoryId").equals(cat.id!).toArray()
          const itemsWithCost = items.filter(i => i.cost > 0 || i.total > 0)
          const catTotal = items.reduce((sum, i) => sum + (i.total || 0), 0)
          
          totalCategories++
          if (itemsWithCost.length > 0) categoriesCompleted++
          
          return {
            name: cat.name,
            annualTotal: catTotal,
            itemCount: items.length,
            completedItemCount: itemsWithCost.length,
            items: convertItems(items),
          }
        })
      )
      
      const householdTotal = categoryBudgets.reduce((sum, c) => sum + c.annualTotal, 0)
      totalBudget += householdTotal
      
      householdBudget = {
        entityName: "Household",
        totalAnnual: householdTotal,
        categories: categoryBudgets,
      }
    }
    
    // Determine onboarding status
    const onboardingStatus = determineOnboardingStatus(
      !!household,
      children.length > 0,
      adults.length > 0,
      totalBudget,
      categoriesCompleted,
      totalCategories
    )
    
    // Update or create profile
    const profiles = getFamilyProfiles()
    const existingProfileIdx = profiles.findIndex(p => p.userId === userId)
    
    const profile: FamilyProfile = {
      userId,
      adults: adultProfiles.length > 0 ? adultProfiles : [{ name: "Demo User", age: 30 }],
      children: childProfiles,
      housingType: household ? mapHousingType(household.housingType) : "rent",
      heardAboutUs: "other",
      onboardingStatus,
    }
    
    if (existingProfileIdx >= 0) {
      profiles[existingProfileIdx] = profile
    } else {
      profiles.unshift(profile)
    }
    setFamilyProfiles(profiles)
    
    // Update or create budget
    const budgets = getFamilyBudgets()
    const existingBudgetIdx = budgets.findIndex(b => b.userId === userId)
    
    const budget: FamilyBudgetSnapshot = {
      userId,
      children: childBudgets,
      adults: adultBudgets,
      household: householdBudget,
      totalAnnual: totalBudget,
      categoriesCompleted,
      categoriesTotal: totalCategories || 21,
    }
    
    if (existingBudgetIdx >= 0) {
      budgets[existingBudgetIdx] = budget
    } else {
      budgets.unshift(budget)
    }
    setFamilyBudgets(budgets)
    
    // Ensure user exists in users list
    const users = getUsers()
    const existingUserIdx = users.findIndex(u => u.id === userId)
    
    if (existingUserIdx < 0) {
      // Create a demo user if none exists
      const familyName = household?.name || (children[0]?.name ? `${children[0].name}'s Family` : "Demo Family")
      users.unshift({
        id: userId,
        familyName,
        email: "demo@mybalancedfamily.com.au",
        plan: "founding",
        status: "active",
        signedUpAt: new Date().toISOString().split("T")[0],
        lastActiveAt: new Date().toISOString().split("T")[0],
      })
      setUsers(users)
      
      // Add activity event
      addActivityEvent(familyName, `${familyName} started entering their budget`)
    } else {
      // Update last active
      users[existingUserIdx].lastActiveAt = new Date().toISOString().split("T")[0]
      setUsers(users)
    }
    
    console.log("[Admin Sync] Budget synced to admin panel:", {
      userId,
      totalBudget,
      categoriesCompleted,
      totalCategories,
      onboardingStatus,
    })
    
  } catch (error) {
    console.error("[Admin Sync] Failed to sync:", error)
  }
}

// Sync a specific activity event
export function syncActivityEvent(familyName: string, message: string): void {
  addActivityEvent(familyName, message)
}
