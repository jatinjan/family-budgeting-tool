// Shared admin state that persists to localStorage
// Allows sign-up page to add users that appear in admin panel in real-time

import {
  mockUsers,
  mockActivity,
  mockPromoCodes,
  mockSubscriptions,
  mockSubscriptionStats,
  mockFamilyProfiles,
  mockFamilyBudgets,
  type AdminUser,
  type ActivityEvent,
  type PromoCode,
  type SubscriptionRecord,
  type PlanType,
  type FamilyProfile,
  type FamilyBudgetSnapshot,
  type OnboardingStatus,
} from "./admin-mock-data"

export type { PromoCode }

const STORAGE_KEYS = {
  users: "mbff_admin_users",
  activity: "mbff_admin_activity",
  promoCodes: "mbff_admin_promos",
  subscriptions: "mbff_admin_subscriptions",
  stats: "mbff_admin_stats",
  profiles: "mbff_admin_profiles",
  budgets: "mbff_admin_budgets",
}

// Initialize from localStorage or fall back to mock data
function getStoredData<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback
  try {
    const stored = localStorage.getItem(key)
    return stored ? JSON.parse(stored) : fallback
  } catch {
    return fallback
  }
}

function setStoredData<T>(key: string, data: T): void {
  if (typeof window === "undefined") return
  try {
    localStorage.setItem(key, JSON.stringify(data))
  } catch {
    // localStorage might be full or disabled
  }
}

// ---------------------------------------------------------------------------
// Users
// ---------------------------------------------------------------------------

export function getUsers(): AdminUser[] {
  return getStoredData(STORAGE_KEYS.users, mockUsers)
}

export function setUsers(users: AdminUser[]): void {
  setStoredData(STORAGE_KEYS.users, users)
}

export function addUser(user: Omit<AdminUser, "id">): AdminUser {
  const users = getUsers()
  const newUser: AdminUser = {
    ...user,
    id: `usr_${Date.now()}`,
  }
  const updated = [newUser, ...users]
  setUsers(updated)
  return newUser
}

// ---------------------------------------------------------------------------
// Activity
// ---------------------------------------------------------------------------

export function getActivity(): ActivityEvent[] {
  return getStoredData(STORAGE_KEYS.activity, mockActivity)
}

export function setActivity(events: ActivityEvent[]): void {
  setStoredData(STORAGE_KEYS.activity, events)
}

export function addActivityEvent(
  familyName: string,
  message: string
): ActivityEvent {
  const events = getActivity()
  const newEvent: ActivityEvent = {
    id: `evt_${Date.now()}`,
    familyName,
    message,
    timestamp: new Date().toISOString(),
  }
  const updated = [newEvent, ...events]
  setActivity(updated)
  return newEvent
}

// ---------------------------------------------------------------------------
// Promo Codes
// ---------------------------------------------------------------------------

export function getPromoCodes(): PromoCode[] {
  return getStoredData(STORAGE_KEYS.promoCodes, mockPromoCodes)
}

export function setPromoCodes(codes: PromoCode[]): void {
  setStoredData(STORAGE_KEYS.promoCodes, codes)
}

export function incrementPromoRedemption(code: string): void {
  const codes = getPromoCodes()
  const updated = codes.map((c) =>
    c.code.toLowerCase() === code.toLowerCase()
      ? { ...c, redemptions: c.redemptions + 1 }
      : c
  )
  setPromoCodes(updated)
}

// ---------------------------------------------------------------------------
// Subscriptions
// ---------------------------------------------------------------------------

export function getSubscriptions(): SubscriptionRecord[] {
  return getStoredData(STORAGE_KEYS.subscriptions, mockSubscriptions)
}

export function setSubscriptions(subs: SubscriptionRecord[]): void {
  setStoredData(STORAGE_KEYS.subscriptions, subs)
}

export function addSubscription(
  familyName: string,
  plan: PlanType,
  status: "active" | "trialing",
  amount: number
): SubscriptionRecord {
  const subs = getSubscriptions()
  const newSub: SubscriptionRecord = {
    id: `sub_${Date.now()}`,
    familyName,
    plan,
    status,
    nextBillingDate:
      plan === "founding"
        ? null
        : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
            .toISOString()
            .split("T")[0],
    amount,
  }
  const updated = [newSub, ...subs]
  setSubscriptions(updated)
  return newSub
}

// ---------------------------------------------------------------------------
// Stats
// ---------------------------------------------------------------------------

interface AdminStats {
  totalFamilies: number
  foundingFamilies: number
  foundingCap: number
  mrr: number
  activeTrials: number
}

export function getStats(): AdminStats {
  return getStoredData(STORAGE_KEYS.stats, mockSubscriptionStats)
}

export function recalculateStats(): AdminStats {
  const users = getUsers()
  const subs = getSubscriptions()

  const foundingCount = users.filter((u) => u.plan === "founding").length
  const activeMonthly = subs.filter(
    (s) => s.plan === "monthly" && s.status === "active"
  ).length
  const activeAnnual = subs.filter(
    (s) => s.plan === "annual" && s.status === "active"
  ).length
  const trialing = subs.filter((s) => s.status === "trialing").length

  const stats: AdminStats = {
    totalFamilies: users.length,
    foundingFamilies: foundingCount,
    foundingCap: 20,
    mrr: activeMonthly * 12 + Math.round((activeAnnual * 99) / 12),
    activeTrials: trialing,
  }

  setStoredData(STORAGE_KEYS.stats, stats)
  return stats
}

// ---------------------------------------------------------------------------
// Family Profiles
// ---------------------------------------------------------------------------

export function getFamilyProfiles(): FamilyProfile[] {
  return getStoredData(STORAGE_KEYS.profiles, mockFamilyProfiles)
}

export function setFamilyProfiles(profiles: FamilyProfile[]): void {
  setStoredData(STORAGE_KEYS.profiles, profiles)
}

export function getFamilyProfile(userId: string): FamilyProfile | undefined {
  const profiles = getFamilyProfiles()
  return profiles.find((p) => p.userId === userId)
}

export function addFamilyProfile(profile: FamilyProfile): void {
  const profiles = getFamilyProfiles()
  const updated = [profile, ...profiles.filter((p) => p.userId !== profile.userId)]
  setFamilyProfiles(updated)
}

// ---------------------------------------------------------------------------
// Family Budgets
// ---------------------------------------------------------------------------

export function getFamilyBudgets(): FamilyBudgetSnapshot[] {
  return getStoredData(STORAGE_KEYS.budgets, mockFamilyBudgets)
}

export function setFamilyBudgets(budgets: FamilyBudgetSnapshot[]): void {
  setStoredData(STORAGE_KEYS.budgets, budgets)
}

export function getFamilyBudget(userId: string): FamilyBudgetSnapshot | undefined {
  const budgets = getFamilyBudgets()
  return budgets.find((b) => b.userId === userId)
}

export function addFamilyBudget(budget: FamilyBudgetSnapshot): void {
  const budgets = getFamilyBudgets()
  const updated = [budget, ...budgets.filter((b) => b.userId !== budget.userId)]
  setFamilyBudgets(updated)
}

// ---------------------------------------------------------------------------
// Reset to defaults
// ---------------------------------------------------------------------------

export function resetAdminState(): void {
  if (typeof window === "undefined") return
  Object.values(STORAGE_KEYS).forEach((key) => {
    localStorage.removeItem(key)
  })
}
