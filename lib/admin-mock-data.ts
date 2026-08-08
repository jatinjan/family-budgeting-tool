// Demo-only mock data for the admin panel. No backend — this file acts as
// the "data contract" the real API would eventually satisfy.

export type PlanType = "founding" | "monthly" | "annual"
export type UserStatus = "active" | "trialing" | "cancelled"
export type PromoType = "lifetime" | "percentage" | "trial"
export type PromoStatus = "active" | "expired"

export interface AdminUser {
  id: string
  familyName: string
  email: string
  plan: PlanType
  status: UserStatus
  signedUpAt: string // ISO date
  lastActiveAt: string // ISO date
  refunded?: boolean
}

export interface PromoCode {
  id: string
  code: string
  type: PromoType
  /** Human-readable discount, e.g. "50% off" or "30-day free trial" */
  discountLabel: string
  redemptions: number
  maxRedemptions: number
  status: PromoStatus
  expiresAt: string | null // ISO date, null = no expiry
}

export interface ActivityEvent {
  id: string
  familyName: string
  message: string
  timestamp: string // ISO datetime
}

export interface SubscriptionRecord {
  id: string
  familyName: string
  plan: PlanType
  status: UserStatus
  nextBillingDate: string | null // ISO date, null for lifetime/cancelled
  amount: number // AUD
}

export const PLAN_LABELS: Record<PlanType, string> = {
  founding: "Founding — Lifetime Free",
  monthly: "Monthly $12",
  annual: "Annual $99",
}

export const PROMO_TYPE_LABELS: Record<PromoType, string> = {
  lifetime: "Lifetime free",
  percentage: "Percentage discount",
  trial: "Free trial",
}

// ---------------------------------------------------------------------------
// Formatting helpers (en-AU)
// ---------------------------------------------------------------------------

export function formatAdminDate(iso: string | null): string {
  if (!iso) return "—"
  return new Date(iso).toLocaleDateString("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
  })
}

export function formatAdminDateTime(iso: string): string {
  return new Date(iso).toLocaleString("en-AU", {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  })
}

export function formatAdminCurrency(amount: number): string {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

// ---------------------------------------------------------------------------
// Users — 12 mock families
// ---------------------------------------------------------------------------

export const mockUsers: AdminUser[] = [
  {
    id: "usr_01",
    familyName: "The Nguyen Family",
    email: "linh.nguyen@outlook.com.au",
    plan: "founding",
    status: "active",
    signedUpAt: "2026-03-04",
    lastActiveAt: "2026-07-13",
  },
  {
    id: "usr_02",
    familyName: "Sarah Mitchell",
    email: "sarah.mitchell@gmail.com",
    plan: "founding",
    status: "active",
    signedUpAt: "2026-03-09",
    lastActiveAt: "2026-07-12",
  },
  {
    id: "usr_03",
    familyName: "Kelly Robertson",
    email: "kelly.robertson@bigpond.com",
    plan: "founding",
    status: "active",
    signedUpAt: "2026-03-17",
    lastActiveAt: "2026-07-11",
  },
  {
    id: "usr_04",
    familyName: "The Papadopoulos Family",
    email: "maria.papadopoulos@gmail.com",
    plan: "founding",
    status: "active",
    signedUpAt: "2026-03-22",
    lastActiveAt: "2026-07-08",
  },
  {
    id: "usr_05",
    familyName: "The Singh Family",
    email: "priya.singh@yahoo.com.au",
    plan: "founding",
    status: "active",
    signedUpAt: "2026-04-02",
    lastActiveAt: "2026-07-13",
  },
  {
    id: "usr_06",
    familyName: "Emma & Josh Walker",
    email: "emma.walker@iinet.net.au",
    plan: "founding",
    status: "active",
    signedUpAt: "2026-04-11",
    lastActiveAt: "2026-07-05",
  },
  {
    id: "usr_07",
    familyName: "The O'Brien Family",
    email: "dan.obrien@gmail.com",
    plan: "founding",
    status: "active",
    signedUpAt: "2026-04-19",
    lastActiveAt: "2026-07-10",
  },
  {
    id: "usr_08",
    familyName: "The Tran Family",
    email: "kim.tran@hotmail.com",
    plan: "founding",
    status: "active",
    signedUpAt: "2026-05-01",
    lastActiveAt: "2026-07-09",
  },
  {
    id: "usr_09",
    familyName: "Liam & Chloe Harris",
    email: "liam.harris@gmail.com",
    plan: "monthly",
    status: "active",
    signedUpAt: "2026-05-14",
    lastActiveAt: "2026-07-12",
  },
  {
    id: "usr_10",
    familyName: "Olivia Bennett",
    email: "olivia.bennett@outlook.com",
    plan: "monthly",
    status: "trialing",
    signedUpAt: "2026-06-28",
    lastActiveAt: "2026-07-13",
  },
  {
    id: "usr_11",
    familyName: "The Thompson Family",
    email: "jack.thompson@bigpond.com",
    plan: "annual",
    status: "trialing",
    signedUpAt: "2026-07-01",
    lastActiveAt: "2026-07-11",
  },
  {
    id: "usr_12",
    familyName: "Grace Kowalski",
    email: "grace.kowalski@gmail.com",
    plan: "annual",
    status: "cancelled",
    signedUpAt: "2026-04-27",
    lastActiveAt: "2026-06-19",
  },
]

// ---------------------------------------------------------------------------
// Promo codes — 5 mock codes
// ---------------------------------------------------------------------------

export const mockPromoCodes: PromoCode[] = [
  {
    id: "promo_01",
    code: "FOUNDING20",
    type: "lifetime",
    discountLabel: "Lifetime free access",
    redemptions: 14,
    maxRedemptions: 20,
    status: "active",
    expiresAt: "2026-08-31",
  },
  {
    id: "promo_02",
    code: "LAUNCH50",
    type: "percentage",
    discountLabel: "50% off first year",
    redemptions: 23,
    maxRedemptions: 100,
    status: "active",
    expiresAt: "2026-09-30",
  },
  {
    id: "promo_03",
    code: "EARLYBIRD",
    type: "trial",
    discountLabel: "30-day free trial",
    redemptions: 42,
    maxRedemptions: 50,
    status: "expired",
    expiresAt: "2026-05-31",
  },
  {
    id: "promo_04",
    code: "MUMSGROUP",
    type: "percentage",
    discountLabel: "25% off",
    redemptions: 6,
    maxRedemptions: 40,
    status: "active",
    expiresAt: "2026-12-31",
  },
  {
    id: "promo_05",
    code: "SCHOOLHOL",
    type: "trial",
    discountLabel: "14-day free trial",
    redemptions: 3,
    maxRedemptions: 25,
    status: "active",
    expiresAt: "2026-10-10",
  },
]

// ---------------------------------------------------------------------------
// Activity log — ~20 events over the last 14 days (reverse-chronological)
// ---------------------------------------------------------------------------

export const mockActivity: ActivityEvent[] = [
  {
    id: "evt_01",
    familyName: "Olivia Bennett",
    message: "Olivia Bennett logged in",
    timestamp: "2026-07-13T09:42:00",
  },
  {
    id: "evt_02",
    familyName: "The Nguyen Family",
    message: "The Nguyen Family updated Household budget",
    timestamp: "2026-07-13T08:15:00",
  },
  {
    id: "evt_03",
    familyName: "The Singh Family",
    message: "The Singh Family added a child profile (Arjun, 7)",
    timestamp: "2026-07-12T21:03:00",
  },
  {
    id: "evt_04",
    familyName: "Liam & Chloe Harris",
    message: "Payment succeeded — $12.00 (Monthly)",
    timestamp: "2026-07-12T14:00:00",
  },
  {
    id: "evt_05",
    familyName: "Sarah Mitchell",
    message: "Sarah M. logged in",
    timestamp: "2026-07-12T10:27:00",
  },
  {
    id: "evt_06",
    familyName: "The Thompson Family",
    message: "The Thompson Family started a free trial (Annual)",
    timestamp: "2026-07-11T19:48:00",
  },
  {
    id: "evt_07",
    familyName: "Kelly Robertson",
    message: "Promo code FOUNDING20 redeemed by Kelly R.",
    timestamp: "2026-07-11T16:31:00",
  },
  {
    id: "evt_08",
    familyName: "The Tran Family",
    message: "The Tran Family exported budget summary (CSV)",
    timestamp: "2026-07-10T20:12:00",
  },
  {
    id: "evt_09",
    familyName: "The O'Brien Family",
    message: "The O'Brien Family updated Planning sheet",
    timestamp: "2026-07-10T13:55:00",
  },
  {
    id: "evt_10",
    familyName: "Emma & Josh Walker",
    message: "Emma W. logged in",
    timestamp: "2026-07-09T22:04:00",
  },
  {
    id: "evt_11",
    familyName: "The Papadopoulos Family",
    message: "The Papadopoulos Family updated Adults budget",
    timestamp: "2026-07-08T18:26:00",
  },
  {
    id: "evt_12",
    familyName: "Olivia Bennett",
    message: "Promo code SCHOOLHOL redeemed by Olivia B.",
    timestamp: "2026-07-07T11:39:00",
  },
  {
    id: "evt_13",
    familyName: "The Nguyen Family",
    message: "The Nguyen Family marked 3 items as Wants",
    timestamp: "2026-07-06T09:58:00",
  },
  {
    id: "evt_14",
    familyName: "Grace Kowalski",
    message: "Grace Kowalski cancelled subscription (Annual)",
    timestamp: "2026-07-05T15:20:00",
  },
  {
    id: "evt_15",
    familyName: "The Singh Family",
    message: "The Singh Family updated Children budget",
    timestamp: "2026-07-04T20:44:00",
  },
  {
    id: "evt_16",
    familyName: "Kelly Robertson",
    message: "Kelly R. printed budget summary",
    timestamp: "2026-07-03T12:17:00",
  },
  {
    id: "evt_17",
    familyName: "Liam & Chloe Harris",
    message: "Liam & Chloe Harris upgraded to Monthly plan",
    timestamp: "2026-07-02T17:05:00",
  },
  {
    id: "evt_18",
    familyName: "The Tran Family",
    message: "The Tran Family logged in",
    timestamp: "2026-07-01T08:52:00",
  },
  {
    id: "evt_19",
    familyName: "Sarah Mitchell",
    message: "Payment succeeded — $12.00 (Monthly)",
    timestamp: "2026-06-30T14:00:00",
  },
  {
    id: "evt_20",
    familyName: "The O'Brien Family",
    message: "Promo code FOUNDING20 redeemed by Dan O.",
    timestamp: "2026-06-29T10:08:00",
  },
]

// ---------------------------------------------------------------------------
// Subscription records — mirror the 12 families
// ---------------------------------------------------------------------------

export const mockSubscriptions: SubscriptionRecord[] = [
  { id: "sub_01", familyName: "The Nguyen Family", plan: "founding", status: "active", nextBillingDate: null, amount: 0 },
  { id: "sub_02", familyName: "Sarah Mitchell", plan: "founding", status: "active", nextBillingDate: null, amount: 0 },
  { id: "sub_03", familyName: "Kelly Robertson", plan: "founding", status: "active", nextBillingDate: null, amount: 0 },
  { id: "sub_04", familyName: "The Papadopoulos Family", plan: "founding", status: "active", nextBillingDate: null, amount: 0 },
  { id: "sub_05", familyName: "The Singh Family", plan: "founding", status: "active", nextBillingDate: null, amount: 0 },
  { id: "sub_06", familyName: "Emma & Josh Walker", plan: "founding", status: "active", nextBillingDate: null, amount: 0 },
  { id: "sub_07", familyName: "The O'Brien Family", plan: "founding", status: "active", nextBillingDate: null, amount: 0 },
  { id: "sub_08", familyName: "The Tran Family", plan: "founding", status: "active", nextBillingDate: null, amount: 0 },
  { id: "sub_09", familyName: "Liam & Chloe Harris", plan: "monthly", status: "active", nextBillingDate: "2026-08-02", amount: 12 },
  { id: "sub_10", familyName: "Olivia Bennett", plan: "monthly", status: "trialing", nextBillingDate: "2026-07-28", amount: 12 },
  { id: "sub_11", familyName: "The Thompson Family", plan: "annual", status: "trialing", nextBillingDate: "2026-07-31", amount: 99 },
  { id: "sub_12", familyName: "Grace Kowalski", plan: "annual", status: "cancelled", nextBillingDate: null, amount: 99 },
]

// Headline metrics shown on the Subscriptions tab
export const mockSubscriptionStats = {
  totalFamilies: 12,
  foundingFamilies: 8,
  foundingCap: 20,
  mrr: 84, // AUD
  activeTrials: 2,
}

// ---------------------------------------------------------------------------
// Family Detail — Profile & Budget Snapshots
// ---------------------------------------------------------------------------

export type OnboardingStatus = "signed_up" | "profile_complete" | "budget_started" | "plan_complete"

export const ONBOARDING_LABELS: Record<OnboardingStatus, string> = {
  signed_up: "Signed up",
  profile_complete: "Profile complete",
  budget_started: "Budget started",
  plan_complete: "Plan complete",
}

export type HousingType = "own" | "rent" | "board" | "other"
export type SchoolLevel = "preschool" | "primary" | "secondary" | "tertiary" | "not_school_age"
export type HeardAboutUs = "friend" | "facebook" | "instagram" | "google" | "workshop" | "financial_advisor" | "other"

export interface FamilyChild {
  name: string
  age: number
  schoolLevel: SchoolLevel
}

export interface FamilyAdult {
  name: string
  age: number
}

export interface FamilyProfile {
  userId: string
  adults: FamilyAdult[]
  children: FamilyChild[]
  housingType: HousingType
  heardAboutUs: HeardAboutUs
  onboardingStatus: OnboardingStatus
}

export interface BudgetItem {
  name: string
  cost: number
  frequency: "weekly" | "monthly" | "quarterly" | "term" | "annual"
  annualTotal: number
  needWant: "need" | "want" | null
}

export interface BudgetCategory {
  name: string
  annualTotal: number
  itemCount: number
  completedItemCount: number
  items: BudgetItem[]
}

export interface EntityBudget {
  entityName: string // e.g., child name, adult name, or "Household"
  categories: BudgetCategory[]
  totalAnnual: number
}

export interface FamilyBudgetSnapshot {
  userId: string
  children: EntityBudget[]
  adults: EntityBudget[]
  household: EntityBudget | null
  totalAnnual: number
  categoriesCompleted: number
  categoriesTotal: number
}

export const SCHOOL_LEVEL_LABELS: Record<SchoolLevel, string> = {
  preschool: "Preschool",
  primary: "Primary School",
  secondary: "High School",
  tertiary: "University/TAFE",
  not_school_age: "Not school age",
}

export const HOUSING_TYPE_LABELS: Record<HousingType, string> = {
  own: "Own home",
  rent: "Renting",
  board: "Boarding",
  other: "Other",
}

export const HEARD_ABOUT_LABELS: Record<HeardAboutUs, string> = {
  friend: "Friend or family",
  facebook: "Facebook",
  instagram: "Instagram",
  google: "Google search",
  workshop: "Budgeting workshop",
  financial_advisor: "Financial advisor",
  other: "Other",
}

// ---------------------------------------------------------------------------
// Detailed Family Profiles (5 families with full data)
// ---------------------------------------------------------------------------

export const mockFamilyProfiles: FamilyProfile[] = [
  {
    userId: "usr_01",
    adults: [
      { name: "Linh", age: 38 },
      { name: "Minh", age: 41 },
    ],
    children: [
      { name: "Sophie", age: 12, schoolLevel: "secondary" },
      { name: "Lucas", age: 8, schoolLevel: "primary" },
      { name: "Mia", age: 4, schoolLevel: "preschool" },
    ],
    housingType: "own",
    heardAboutUs: "workshop",
    onboardingStatus: "plan_complete",
  },
  {
    userId: "usr_02",
    adults: [{ name: "Sarah", age: 34 }],
    children: [
      { name: "Ethan", age: 6, schoolLevel: "primary" },
      { name: "Lily", age: 3, schoolLevel: "preschool" },
    ],
    housingType: "rent",
    heardAboutUs: "facebook",
    onboardingStatus: "plan_complete",
  },
  {
    userId: "usr_05",
    adults: [
      { name: "Priya", age: 36 },
      { name: "Raj", age: 39 },
    ],
    children: [
      { name: "Arjun", age: 7, schoolLevel: "primary" },
      { name: "Ananya", age: 10, schoolLevel: "primary" },
    ],
    housingType: "own",
    heardAboutUs: "friend",
    onboardingStatus: "budget_started",
  },
  {
    userId: "usr_09",
    adults: [
      { name: "Liam", age: 32 },
      { name: "Chloe", age: 30 },
    ],
    children: [{ name: "Noah", age: 2, schoolLevel: "not_school_age" }],
    housingType: "rent",
    heardAboutUs: "instagram",
    onboardingStatus: "budget_started",
  },
  {
    userId: "usr_10",
    adults: [{ name: "Olivia", age: 29 }],
    children: [{ name: "Ava", age: 5, schoolLevel: "preschool" }],
    housingType: "rent",
    heardAboutUs: "google",
    onboardingStatus: "signed_up", // Incomplete — coaching signal
  },
]

// ---------------------------------------------------------------------------
// Detailed Budget Snapshots
// ---------------------------------------------------------------------------

export const mockFamilyBudgets: FamilyBudgetSnapshot[] = [
  // usr_01 - The Nguyen Family — COMPLETE, comprehensive budget
  {
    userId: "usr_01",
    children: [
      {
        entityName: "Sophie (12)",
        totalAnnual: 8940,
        categories: [
          {
            name: "Education",
            annualTotal: 3200,
            itemCount: 6,
            completedItemCount: 6,
            items: [
              { name: "School fees", cost: 2400, frequency: "annual", annualTotal: 2400, needWant: "need" },
              { name: "Textbooks & stationery", cost: 350, frequency: "annual", annualTotal: 350, needWant: "need" },
              { name: "School uniform", cost: 280, frequency: "annual", annualTotal: 280, needWant: "need" },
              { name: "Excursions", cost: 170, frequency: "annual", annualTotal: 170, needWant: "need" },
            ],
          },
          {
            name: "Extracurricular",
            annualTotal: 2860,
            itemCount: 5,
            completedItemCount: 4,
            items: [
              { name: "Swimming lessons", cost: 45, frequency: "weekly", annualTotal: 2340, needWant: "need" },
              { name: "Piano lessons", cost: 130, frequency: "monthly", annualTotal: 1560, needWant: "want" },
              { name: "Netball registration", cost: 280, frequency: "annual", annualTotal: 280, needWant: "need" },
            ],
          },
          {
            name: "Medical & Health",
            annualTotal: 680,
            itemCount: 4,
            completedItemCount: 3,
            items: [
              { name: "Dental checkups", cost: 180, frequency: "annual", annualTotal: 180, needWant: "need" },
              { name: "Orthodontics", cost: 500, frequency: "annual", annualTotal: 500, needWant: "need" },
            ],
          },
          {
            name: "Clothing & Personal",
            annualTotal: 1200,
            itemCount: 4,
            completedItemCount: 4,
            items: [
              { name: "Seasonal clothes", cost: 300, frequency: "quarterly", annualTotal: 1200, needWant: "need" },
            ],
          },
          {
            name: "Entertainment",
            annualTotal: 1000,
            itemCount: 3,
            completedItemCount: 2,
            items: [
              { name: "Birthday party", cost: 400, frequency: "annual", annualTotal: 400, needWant: "want" },
              { name: "Movies & outings", cost: 50, frequency: "monthly", annualTotal: 600, needWant: "want" },
            ],
          },
        ],
      },
      {
        entityName: "Lucas (8)",
        totalAnnual: 6280,
        categories: [
          {
            name: "Education",
            annualTotal: 2100,
            itemCount: 5,
            completedItemCount: 5,
            items: [
              { name: "School fees", cost: 1600, frequency: "annual", annualTotal: 1600, needWant: "need" },
              { name: "Stationery & books", cost: 250, frequency: "annual", annualTotal: 250, needWant: "need" },
              { name: "School uniform", cost: 250, frequency: "annual", annualTotal: 250, needWant: "need" },
            ],
          },
          {
            name: "Extracurricular",
            annualTotal: 2080,
            itemCount: 4,
            completedItemCount: 3,
            items: [
              { name: "Soccer registration", cost: 320, frequency: "annual", annualTotal: 320, needWant: "need" },
              { name: "Swimming lessons", cost: 45, frequency: "weekly", annualTotal: 2340, needWant: "need" },
            ],
          },
          {
            name: "Medical & Health",
            annualTotal: 300,
            itemCount: 3,
            completedItemCount: 2,
            items: [
              { name: "Dental checkups", cost: 150, frequency: "annual", annualTotal: 150, needWant: "need" },
              { name: "GP visits", cost: 150, frequency: "annual", annualTotal: 150, needWant: "need" },
            ],
          },
          {
            name: "Clothing & Personal",
            annualTotal: 1000,
            itemCount: 3,
            completedItemCount: 3,
            items: [
              { name: "Clothes & shoes", cost: 250, frequency: "quarterly", annualTotal: 1000, needWant: "need" },
            ],
          },
          {
            name: "Entertainment",
            annualTotal: 800,
            itemCount: 3,
            completedItemCount: 2,
            items: [
              { name: "Birthday party", cost: 350, frequency: "annual", annualTotal: 350, needWant: "want" },
              { name: "Toys & games", cost: 150, frequency: "quarterly", annualTotal: 600, needWant: "want" },
            ],
          },
        ],
      },
      {
        entityName: "Mia (4)",
        totalAnnual: 9360,
        categories: [
          {
            name: "Childcare",
            annualTotal: 7800,
            itemCount: 2,
            completedItemCount: 2,
            items: [
              { name: "Daycare fees (3 days)", cost: 150, frequency: "weekly", annualTotal: 7800, needWant: "need" },
            ],
          },
          {
            name: "Medical & Health",
            annualTotal: 360,
            itemCount: 3,
            completedItemCount: 2,
            items: [
              { name: "GP visits", cost: 180, frequency: "annual", annualTotal: 180, needWant: "need" },
              { name: "Immunisations", cost: 180, frequency: "annual", annualTotal: 180, needWant: "need" },
            ],
          },
          {
            name: "Clothing & Personal",
            annualTotal: 800,
            itemCount: 2,
            completedItemCount: 2,
            items: [
              { name: "Clothes & shoes", cost: 200, frequency: "quarterly", annualTotal: 800, needWant: "need" },
            ],
          },
          {
            name: "Entertainment",
            annualTotal: 400,
            itemCount: 2,
            completedItemCount: 1,
            items: [
              { name: "Playgroup activities", cost: 100, frequency: "quarterly", annualTotal: 400, needWant: "want" },
            ],
          },
        ],
      },
    ],
    adults: [
      {
        entityName: "Linh",
        totalAnnual: 4640,
        categories: [
          {
            name: "Fitness & Wellbeing",
            annualTotal: 1560,
            itemCount: 3,
            completedItemCount: 3,
            items: [
              { name: "Gym membership", cost: 65, frequency: "monthly", annualTotal: 780, needWant: "need" },
              { name: "Yoga classes", cost: 65, frequency: "monthly", annualTotal: 780, needWant: "want" },
            ],
          },
          {
            name: "Personal",
            annualTotal: 1680,
            itemCount: 4,
            completedItemCount: 3,
            items: [
              { name: "Haircuts", cost: 90, frequency: "quarterly", annualTotal: 360, needWant: "need" },
              { name: "Clothing", cost: 330, frequency: "quarterly", annualTotal: 1320, needWant: "need" },
            ],
          },
          {
            name: "Medical",
            annualTotal: 900,
            itemCount: 3,
            completedItemCount: 3,
            items: [
              { name: "Dental", cost: 400, frequency: "annual", annualTotal: 400, needWant: "need" },
              { name: "Optometrist & glasses", cost: 500, frequency: "annual", annualTotal: 500, needWant: "need" },
            ],
          },
          {
            name: "Subscriptions",
            annualTotal: 500,
            itemCount: 4,
            completedItemCount: 3,
            items: [
              { name: "Spotify", cost: 12, frequency: "monthly", annualTotal: 144, needWant: "want" },
              { name: "Audible", cost: 15, frequency: "monthly", annualTotal: 180, needWant: "want" },
            ],
          },
        ],
      },
      {
        entityName: "Minh",
        totalAnnual: 3820,
        categories: [
          {
            name: "Fitness & Wellbeing",
            annualTotal: 1040,
            itemCount: 2,
            completedItemCount: 2,
            items: [
              { name: "Gym membership", cost: 65, frequency: "monthly", annualTotal: 780, needWant: "need" },
              { name: "Golf (monthly)", cost: 65, frequency: "quarterly", annualTotal: 260, needWant: "want" },
            ],
          },
          {
            name: "Personal",
            annualTotal: 1080,
            itemCount: 3,
            completedItemCount: 3,
            items: [
              { name: "Haircuts", cost: 45, frequency: "quarterly", annualTotal: 180, needWant: "need" },
              { name: "Clothing", cost: 225, frequency: "quarterly", annualTotal: 900, needWant: "need" },
            ],
          },
          {
            name: "Medical",
            annualTotal: 700,
            itemCount: 2,
            completedItemCount: 2,
            items: [
              { name: "Dental", cost: 400, frequency: "annual", annualTotal: 400, needWant: "need" },
              { name: "GP & scripts", cost: 300, frequency: "annual", annualTotal: 300, needWant: "need" },
            ],
          },
          {
            name: "Transport",
            annualTotal: 1000,
            itemCount: 2,
            completedItemCount: 2,
            items: [
              { name: "Opal card (work)", cost: 40, frequency: "weekly", annualTotal: 2080, needWant: "need" },
            ],
          },
        ],
      },
    ],
    household: {
      entityName: "Household",
      totalAnnual: 52340,
      categories: [
        {
          name: "Housing",
          annualTotal: 18000,
          itemCount: 3,
          completedItemCount: 3,
          items: [
            { name: "Mortgage repayments", cost: 1500, frequency: "monthly", annualTotal: 18000, needWant: "need" },
          ],
        },
        {
          name: "Utilities",
          annualTotal: 4800,
          itemCount: 5,
          completedItemCount: 5,
          items: [
            { name: "Electricity", cost: 180, frequency: "monthly", annualTotal: 2160, needWant: "need" },
            { name: "Gas", cost: 80, frequency: "monthly", annualTotal: 960, needWant: "need" },
            { name: "Water", cost: 70, frequency: "monthly", annualTotal: 840, needWant: "need" },
            { name: "Internet", cost: 70, frequency: "monthly", annualTotal: 840, needWant: "need" },
          ],
        },
        {
          name: "Insurance",
          annualTotal: 4200,
          itemCount: 4,
          completedItemCount: 4,
          items: [
            { name: "Home & contents", cost: 1800, frequency: "annual", annualTotal: 1800, needWant: "need" },
            { name: "Car insurance", cost: 1200, frequency: "annual", annualTotal: 1200, needWant: "need" },
            { name: "Health insurance", cost: 100, frequency: "monthly", annualTotal: 1200, needWant: "need" },
          ],
        },
        {
          name: "Groceries",
          annualTotal: 15600,
          itemCount: 2,
          completedItemCount: 2,
          items: [
            { name: "Weekly groceries", cost: 300, frequency: "weekly", annualTotal: 15600, needWant: "need" },
          ],
        },
        {
          name: "Transport",
          annualTotal: 5200,
          itemCount: 4,
          completedItemCount: 4,
          items: [
            { name: "Petrol", cost: 60, frequency: "weekly", annualTotal: 3120, needWant: "need" },
            { name: "Car rego", cost: 800, frequency: "annual", annualTotal: 800, needWant: "need" },
            { name: "Car service", cost: 640, frequency: "annual", annualTotal: 640, needWant: "need" },
            { name: "Tolls", cost: 50, frequency: "monthly", annualTotal: 600, needWant: "need" },
          ],
        },
        {
          name: "Entertainment",
          annualTotal: 2340,
          itemCount: 4,
          completedItemCount: 3,
          items: [
            { name: "Netflix", cost: 23, frequency: "monthly", annualTotal: 276, needWant: "want" },
            { name: "Disney+", cost: 14, frequency: "monthly", annualTotal: 168, needWant: "want" },
            { name: "Family outings", cost: 150, frequency: "monthly", annualTotal: 1800, needWant: "want" },
          ],
        },
        {
          name: "Family Holidays",
          annualTotal: 5000,
          itemCount: 2,
          completedItemCount: 2,
          items: [
            { name: "Annual holiday", cost: 5000, frequency: "annual", annualTotal: 5000, needWant: "want" },
          ],
        },
      ],
    },
    totalAnnual: 85380,
    categoriesCompleted: 19,
    categoriesTotal: 21,
  },

  // usr_02 - Sarah Mitchell — COMPLETE, single parent
  {
    userId: "usr_02",
    children: [
      {
        entityName: "Ethan (6)",
        totalAnnual: 5620,
        categories: [
          {
            name: "Education",
            annualTotal: 1850,
            itemCount: 4,
            completedItemCount: 4,
            items: [
              { name: "School fees (public)", cost: 850, frequency: "annual", annualTotal: 850, needWant: "need" },
              { name: "Uniform & supplies", cost: 400, frequency: "annual", annualTotal: 400, needWant: "need" },
              { name: "Before school care", cost: 50, frequency: "weekly", annualTotal: 2600, needWant: "need" },
            ],
          },
          {
            name: "Extracurricular",
            annualTotal: 1820,
            itemCount: 3,
            completedItemCount: 3,
            items: [
              { name: "Swimming", cost: 35, frequency: "weekly", annualTotal: 1820, needWant: "need" },
            ],
          },
          {
            name: "Medical",
            annualTotal: 350,
            itemCount: 2,
            completedItemCount: 2,
            items: [
              { name: "Dental & GP", cost: 350, frequency: "annual", annualTotal: 350, needWant: "need" },
            ],
          },
          {
            name: "Clothing",
            annualTotal: 800,
            itemCount: 2,
            completedItemCount: 2,
            items: [
              { name: "Clothes & shoes", cost: 200, frequency: "quarterly", annualTotal: 800, needWant: "need" },
            ],
          },
          {
            name: "Entertainment",
            annualTotal: 800,
            itemCount: 3,
            completedItemCount: 2,
            items: [
              { name: "Birthday", cost: 300, frequency: "annual", annualTotal: 300, needWant: "want" },
              { name: "Outings", cost: 125, frequency: "quarterly", annualTotal: 500, needWant: "want" },
            ],
          },
        ],
      },
      {
        entityName: "Lily (3)",
        totalAnnual: 11700,
        categories: [
          {
            name: "Childcare",
            annualTotal: 10400,
            itemCount: 1,
            completedItemCount: 1,
            items: [
              { name: "Daycare (4 days)", cost: 200, frequency: "weekly", annualTotal: 10400, needWant: "need" },
            ],
          },
          {
            name: "Medical",
            annualTotal: 300,
            itemCount: 2,
            completedItemCount: 2,
            items: [
              { name: "GP & immunisations", cost: 300, frequency: "annual", annualTotal: 300, needWant: "need" },
            ],
          },
          {
            name: "Clothing",
            annualTotal: 600,
            itemCount: 2,
            completedItemCount: 2,
            items: [
              { name: "Clothes", cost: 150, frequency: "quarterly", annualTotal: 600, needWant: "need" },
            ],
          },
          {
            name: "Entertainment",
            annualTotal: 400,
            itemCount: 2,
            completedItemCount: 1,
            items: [
              { name: "Toys & activities", cost: 100, frequency: "quarterly", annualTotal: 400, needWant: "want" },
            ],
          },
        ],
      },
    ],
    adults: [
      {
        entityName: "Sarah",
        totalAnnual: 3240,
        categories: [
          {
            name: "Fitness",
            annualTotal: 600,
            itemCount: 2,
            completedItemCount: 1,
            items: [
              { name: "Park runs (free)", cost: 0, frequency: "weekly", annualTotal: 0, needWant: "need" },
              { name: "Yoga app", cost: 50, frequency: "annual", annualTotal: 50, needWant: "want" },
            ],
          },
          {
            name: "Personal",
            annualTotal: 1440,
            itemCount: 3,
            completedItemCount: 3,
            items: [
              { name: "Hair & beauty", cost: 120, frequency: "quarterly", annualTotal: 480, needWant: "need" },
              { name: "Clothing", cost: 240, frequency: "quarterly", annualTotal: 960, needWant: "need" },
            ],
          },
          {
            name: "Medical",
            annualTotal: 600,
            itemCount: 2,
            completedItemCount: 2,
            items: [
              { name: "Dental & GP", cost: 600, frequency: "annual", annualTotal: 600, needWant: "need" },
            ],
          },
          {
            name: "Subscriptions",
            annualTotal: 600,
            itemCount: 3,
            completedItemCount: 3,
            items: [
              { name: "Spotify", cost: 12, frequency: "monthly", annualTotal: 144, needWant: "want" },
              { name: "Phone plan", cost: 35, frequency: "monthly", annualTotal: 420, needWant: "need" },
            ],
          },
        ],
      },
    ],
    household: {
      entityName: "Household",
      totalAnnual: 36920,
      categories: [
        {
          name: "Housing",
          annualTotal: 20800,
          itemCount: 1,
          completedItemCount: 1,
          items: [
            { name: "Rent", cost: 400, frequency: "weekly", annualTotal: 20800, needWant: "need" },
          ],
        },
        {
          name: "Utilities",
          annualTotal: 3120,
          itemCount: 4,
          completedItemCount: 4,
          items: [
            { name: "Electricity", cost: 120, frequency: "monthly", annualTotal: 1440, needWant: "need" },
            { name: "Gas", cost: 60, frequency: "monthly", annualTotal: 720, needWant: "need" },
            { name: "Internet", cost: 80, frequency: "monthly", annualTotal: 960, needWant: "need" },
          ],
        },
        {
          name: "Insurance",
          annualTotal: 1800,
          itemCount: 2,
          completedItemCount: 2,
          items: [
            { name: "Contents insurance", cost: 600, frequency: "annual", annualTotal: 600, needWant: "need" },
            { name: "Health insurance", cost: 100, frequency: "monthly", annualTotal: 1200, needWant: "need" },
          ],
        },
        {
          name: "Groceries",
          annualTotal: 9360,
          itemCount: 1,
          completedItemCount: 1,
          items: [
            { name: "Weekly shop", cost: 180, frequency: "weekly", annualTotal: 9360, needWant: "need" },
          ],
        },
        {
          name: "Transport",
          annualTotal: 2840,
          itemCount: 3,
          completedItemCount: 3,
          items: [
            { name: "Petrol", cost: 40, frequency: "weekly", annualTotal: 2080, needWant: "need" },
            { name: "Rego & insurance", cost: 760, frequency: "annual", annualTotal: 760, needWant: "need" },
          ],
        },
        {
          name: "Entertainment",
          annualTotal: 1500,
          itemCount: 3,
          completedItemCount: 2,
          items: [
            { name: "Netflix", cost: 17, frequency: "monthly", annualTotal: 204, needWant: "want" },
            { name: "Family outings", cost: 100, frequency: "monthly", annualTotal: 1200, needWant: "want" },
          ],
        },
        {
          name: "Holidays",
          annualTotal: 2000,
          itemCount: 1,
          completedItemCount: 1,
          items: [
            { name: "Camping trip", cost: 2000, frequency: "annual", annualTotal: 2000, needWant: "want" },
          ],
        },
      ],
    },
    totalAnnual: 57480,
    categoriesCompleted: 18,
    categoriesTotal: 19,
  },

  // usr_05 - The Singh Family — IN PROGRESS, started but not complete
  {
    userId: "usr_05",
    children: [
      {
        entityName: "Arjun (7)",
        totalAnnual: 3200,
        categories: [
          {
            name: "Education",
            annualTotal: 1800,
            itemCount: 4,
            completedItemCount: 3,
            items: [
              { name: "School fees", cost: 1200, frequency: "annual", annualTotal: 1200, needWant: "need" },
              { name: "Uniform", cost: 300, frequency: "annual", annualTotal: 300, needWant: "need" },
              { name: "Books", cost: 300, frequency: "annual", annualTotal: 300, needWant: "need" },
            ],
          },
          {
            name: "Extracurricular",
            annualTotal: 1400,
            itemCount: 4,
            completedItemCount: 2,
            items: [
              { name: "Cricket", cost: 400, frequency: "annual", annualTotal: 400, needWant: "need" },
              { name: "Maths tutoring", cost: 250, frequency: "term", annualTotal: 1000, needWant: "need" },
            ],
          },
          {
            name: "Medical",
            annualTotal: 0,
            itemCount: 3,
            completedItemCount: 0,
            items: [],
          },
          {
            name: "Clothing",
            annualTotal: 0,
            itemCount: 2,
            completedItemCount: 0,
            items: [],
          },
        ],
      },
      {
        entityName: "Ananya (10)",
        totalAnnual: 4100,
        categories: [
          {
            name: "Education",
            annualTotal: 2100,
            itemCount: 4,
            completedItemCount: 3,
            items: [
              { name: "School fees", cost: 1500, frequency: "annual", annualTotal: 1500, needWant: "need" },
              { name: "Uniform & books", cost: 600, frequency: "annual", annualTotal: 600, needWant: "need" },
            ],
          },
          {
            name: "Extracurricular",
            annualTotal: 2000,
            itemCount: 4,
            completedItemCount: 2,
            items: [
              { name: "Bharatanatyam dance", cost: 80, frequency: "weekly", annualTotal: 4160, needWant: "need" },
            ],
          },
          {
            name: "Medical",
            annualTotal: 0,
            itemCount: 3,
            completedItemCount: 0,
            items: [],
          },
        ],
      },
    ],
    adults: [
      {
        entityName: "Priya",
        totalAnnual: 0,
        categories: [
          { name: "Fitness", annualTotal: 0, itemCount: 2, completedItemCount: 0, items: [] },
          { name: "Personal", annualTotal: 0, itemCount: 3, completedItemCount: 0, items: [] },
        ],
      },
      {
        entityName: "Raj",
        totalAnnual: 0,
        categories: [
          { name: "Fitness", annualTotal: 0, itemCount: 2, completedItemCount: 0, items: [] },
          { name: "Personal", annualTotal: 0, itemCount: 3, completedItemCount: 0, items: [] },
        ],
      },
    ],
    household: {
      entityName: "Household",
      totalAnnual: 24000,
      categories: [
        {
          name: "Housing",
          annualTotal: 24000,
          itemCount: 1,
          completedItemCount: 1,
          items: [
            { name: "Mortgage", cost: 2000, frequency: "monthly", annualTotal: 24000, needWant: "need" },
          ],
        },
        { name: "Utilities", annualTotal: 0, itemCount: 4, completedItemCount: 0, items: [] },
        { name: "Insurance", annualTotal: 0, itemCount: 3, completedItemCount: 0, items: [] },
        { name: "Groceries", annualTotal: 0, itemCount: 2, completedItemCount: 0, items: [] },
      ],
    },
    totalAnnual: 31300,
    categoriesCompleted: 6,
    categoriesTotal: 21,
  },

  // usr_09 - Liam & Chloe Harris — IN PROGRESS, young family
  {
    userId: "usr_09",
    children: [
      {
        entityName: "Noah (2)",
        totalAnnual: 15600,
        categories: [
          {
            name: "Childcare",
            annualTotal: 15600,
            itemCount: 1,
            completedItemCount: 1,
            items: [
              { name: "Daycare (3 days)", cost: 300, frequency: "weekly", annualTotal: 15600, needWant: "need" },
            ],
          },
          { name: "Medical", annualTotal: 0, itemCount: 2, completedItemCount: 0, items: [] },
          { name: "Clothing", annualTotal: 0, itemCount: 2, completedItemCount: 0, items: [] },
        ],
      },
    ],
    adults: [
      {
        entityName: "Liam",
        totalAnnual: 1560,
        categories: [
          {
            name: "Fitness",
            annualTotal: 780,
            itemCount: 2,
            completedItemCount: 1,
            items: [
              { name: "Gym", cost: 65, frequency: "monthly", annualTotal: 780, needWant: "want" },
            ],
          },
          {
            name: "Subscriptions",
            annualTotal: 780,
            itemCount: 3,
            completedItemCount: 2,
            items: [
              { name: "Kayo Sports", cost: 28, frequency: "monthly", annualTotal: 336, needWant: "want" },
              { name: "Phone", cost: 45, frequency: "monthly", annualTotal: 540, needWant: "need" },
            ],
          },
        ],
      },
      {
        entityName: "Chloe",
        totalAnnual: 0,
        categories: [
          { name: "Fitness", annualTotal: 0, itemCount: 2, completedItemCount: 0, items: [] },
          { name: "Personal", annualTotal: 0, itemCount: 3, completedItemCount: 0, items: [] },
        ],
      },
    ],
    household: {
      entityName: "Household",
      totalAnnual: 31200,
      categories: [
        {
          name: "Housing",
          annualTotal: 26000,
          itemCount: 1,
          completedItemCount: 1,
          items: [
            { name: "Rent", cost: 500, frequency: "weekly", annualTotal: 26000, needWant: "need" },
          ],
        },
        {
          name: "Groceries",
          annualTotal: 5200,
          itemCount: 1,
          completedItemCount: 1,
          items: [
            { name: "Weekly shop", cost: 100, frequency: "weekly", annualTotal: 5200, needWant: "need" },
          ],
        },
        { name: "Utilities", annualTotal: 0, itemCount: 4, completedItemCount: 0, items: [] },
        { name: "Insurance", annualTotal: 0, itemCount: 3, completedItemCount: 0, items: [] },
        { name: "Transport", annualTotal: 0, itemCount: 3, completedItemCount: 0, items: [] },
      ],
    },
    totalAnnual: 48360,
    categoriesCompleted: 5,
    categoriesTotal: 17,
  },

  // usr_10 - Olivia Bennett — INCOMPLETE, just signed up (coaching signal)
  {
    userId: "usr_10",
    children: [
      {
        entityName: "Ava (5)",
        totalAnnual: 0,
        categories: [
          { name: "Education", annualTotal: 0, itemCount: 4, completedItemCount: 0, items: [] },
          { name: "Extracurricular", annualTotal: 0, itemCount: 3, completedItemCount: 0, items: [] },
          { name: "Medical", annualTotal: 0, itemCount: 2, completedItemCount: 0, items: [] },
          { name: "Clothing", annualTotal: 0, itemCount: 2, completedItemCount: 0, items: [] },
        ],
      },
    ],
    adults: [
      {
        entityName: "Olivia",
        totalAnnual: 0,
        categories: [
          { name: "Fitness", annualTotal: 0, itemCount: 2, completedItemCount: 0, items: [] },
          { name: "Personal", annualTotal: 0, itemCount: 3, completedItemCount: 0, items: [] },
          { name: "Medical", annualTotal: 0, itemCount: 2, completedItemCount: 0, items: [] },
        ],
      },
    ],
    household: null, // Hasn't even set up household
    totalAnnual: 0,
    categoriesCompleted: 0,
    categoriesTotal: 18,
  },
]

// Helper to get family detail by user ID
export function getFamilyProfile(userId: string): FamilyProfile | undefined {
  return mockFamilyProfiles.find((p) => p.userId === userId)
}

export function getFamilyBudget(userId: string): FamilyBudgetSnapshot | undefined {
  return mockFamilyBudgets.find((b) => b.userId === userId)
}

export function formatRelativeDate(iso: string): string {
  const date = new Date(iso)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays === 0) return "Today"
  if (diffDays === 1) return "Yesterday"
  if (diffDays < 7) return `${diffDays} days ago`
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`
  return formatAdminDate(iso)
}
