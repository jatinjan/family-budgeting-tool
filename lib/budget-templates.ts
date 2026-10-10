// Default budget templates shared by the family app (Dexie) and the coach editor (Supabase).
// Pure data and arithmetic only: must not import Dexie.

export type BudgetFrequency =
  | "weekly"
  | "fortnightly"
  | "monthly"
  | "quarterly"
  | "term"
  | "annual"
  | "bi-monthly"

// Default category templates
export const defaultCategories = [
  {
    name: "Education",
    description: "School fees, uniforms, transport, and hidden annual costs",
    order: 1,
    items: [
      {
        name: "School Fees",
        cost: 0,
        frequency: "annual" as const,
        quantity: 1,
        needWant: "need" as const,
      },
      {
        name: "Uniforms",
        cost: 0,
        frequency: "annual" as const,
        quantity: 1,
        needWant: "need" as const,
      },
      {
        name: "School Supplies",
        cost: 0,
        frequency: "term" as const,
        quantity: 4,
        needWant: "need" as const,
      },
      {
        name: "School Transport",
        cost: 0,
        frequency: "monthly" as const,
        quantity: 12,
        needWant: "need" as const,
      },
      {
        name: "Out of School Care",
        cost: 0,
        frequency: "weekly" as const,
        quantity: 52,
        needWant: "need" as const,
      },
      {
        name: "Vacation Care",
        cost: 0,
        frequency: "annual" as const,
        quantity: 1,
        needWant: "need" as const,
      },
      {
        name: "Day Care",
        cost: 0,
        frequency: "weekly" as const,
        quantity: 52,
        needWant: "need" as const,
      },
      {
        name: "Nanny",
        cost: 0,
        frequency: "weekly" as const,
        quantity: 52,
        needWant: "need" as const,
      },
    ],
  },
  {
    name: "Child Communication and Subscriptions",
    description: "Communication and app subscriptions specific to the child only",
    order: 2,
    items: [
      {
        name: "Phone Bill",
        cost: 0,
        frequency: "monthly" as const,
        quantity: 12,
        needWant: "need" as const,
      },
      {
        name: "App Subscriptions",
        cost: 0,
        frequency: "monthly" as const,
        quantity: 12,
        needWant: "want" as const,
      },
    ],
  },
  {
    name: "Extracurricular",
    description: "Sports, music, clubs, after-school activities and holiday programs",
    order: 3,
    items: [
      {
        name: "Swimming",
        cost: 0,
        frequency: "term" as const,
        quantity: 4,
        needWant: undefined,
      },
      {
        name: "Gymnastics",
        cost: 0,
        frequency: "term" as const,
        quantity: 4,
        needWant: undefined,
      },
      {
        name: "Music",
        cost: 0,
        frequency: "term" as const,
        quantity: 4,
        needWant: undefined,
      },
      {
        name: "Martial Arts",
        cost: 0,
        frequency: "term" as const,
        quantity: 4,
        needWant: undefined,
      },
      {
        name: "Soccer",
        cost: 0,
        frequency: "term" as const,
        quantity: 4,
        needWant: undefined,
      },
      {
        name: "Tennis",
        cost: 0,
        frequency: "term" as const,
        quantity: 4,
        needWant: undefined,
      },
      {
        name: "Basketball",
        cost: 0,
        frequency: "term" as const,
        quantity: 4,
        needWant: undefined,
      },
      {
        name: "Netball",
        cost: 0,
        frequency: "term" as const,
        quantity: 4,
        needWant: undefined,
      },
      {
        name: "Dance",
        cost: 0,
        frequency: "term" as const,
        quantity: 4,
        needWant: undefined,
      },
      {
        name: "Kumon",
        cost: 0,
        frequency: "monthly" as const,
        quantity: 12,
        needWant: undefined,
      },
      {
        name: "Northshore",
        cost: 0,
        frequency: "term" as const,
        quantity: 4,
        needWant: undefined,
      },
    ],
  },
  {
    name: "Medical & Special Needs",
    description: "Therapies, medications, and specialist visits",
    order: 4,
    items: [
      {
        name: "Regular Check-ups",
        cost: 0,
        frequency: "annual" as const,
        quantity: 1,
        needWant: "need" as const,
      },
      {
        name: "Dental Care",
        cost: 0,
        frequency: "annual" as const,
        quantity: 1,
        needWant: "need" as const,
      },
      {
        name: "Medicines",
        cost: 0,
        frequency: "monthly" as const,
        quantity: 12,
        needWant: "need" as const,
      },
      {
        name: "Occupational Therapy",
        cost: 0,
        frequency: "weekly" as const,
        quantity: 52,
        needWant: "need" as const,
      },
      {
        name: "Physiotherapy",
        cost: 0,
        frequency: "weekly" as const,
        quantity: 52,
        needWant: "need" as const,
      },
      {
        name: "Speech Therapy",
        cost: 0,
        frequency: "weekly" as const,
        quantity: 52,
        needWant: "need" as const,
      },
    ],
  },
  {
    name: "Clothing & Toys",
    description: "Clothing cycles, toy budgets, and seasonal needs",
    order: 5,
    items: [
      {
        name: "Seasonal Clothing",
        cost: 0,
        frequency: "term" as const,
        quantity: 4,
        needWant: "need" as const,
      },
      {
        name: "Shoes",
        cost: 0,
        frequency: "term" as const,
        quantity: 4,
        needWant: "need" as const,
      },
      {
        name: "Toys",
        cost: 0,
        frequency: "monthly" as const,
        quantity: 12,
        needWant: "want" as const,
      },
      {
        name: "Weekly Toys",
        cost: 0,
        frequency: "weekly" as const,
        quantity: 52,
        needWant: "want" as const,
      },
      {
        name: "Books and Stationary",
        cost: 0,
        frequency: "monthly" as const,
        quantity: 12,
        needWant: "need" as const,
      },
    ],
  },
  {
    name: "Entertainment/Events",
    description: "Outings, entertainment, and special events",
    order: 6,
    items: [
      {
        name: "Concerts",
        cost: 0,
        frequency: "annual" as const,
        quantity: 1,
        needWant: "want" as const,
      },
      {
        name: "Entertainment Parks",
        cost: 0,
        frequency: "annual" as const,
        quantity: 1,
        needWant: "want" as const,
      },
      {
        name: "Play centres",
        cost: 0,
        frequency: "monthly" as const,
        quantity: 12,
        needWant: "want" as const,
      },
    ],
  },
  {
    name: "Parties & Social",
    description: "Birthday parties, gifts, and social events",
    order: 7,
    items: [
      {
        name: "Birthday Party (Hosting)",
        cost: 0,
        frequency: "annual" as const,
        quantity: 1,
        needWant: "want" as const,
      },
      {
        name: "Party Gifts (Attending)",
        cost: 0,
        frequency: "monthly" as const,
        quantity: 12,
        needWant: "want" as const,
      },
      {
        name: "Other Gifts",
        cost: 0,
        frequency: "annual" as const,
        quantity: 1,
        needWant: "want" as const,
      },
      {
        name: "Christmas",
        cost: 0,
        frequency: "annual" as const,
        quantity: 1,
        needWant: "want" as const,
      },
    ],
  },
  {
    name: "Holiday",
    description: "Child-related travel and holiday expenses",
    order: 8,
    items: [
      {
        name: "School Holiday Activities",
        cost: 0,
        frequency: "quarterly" as const,
        quantity: 4,
        needWant: "want" as const,
      },
      {
        name: "Camp/Excursions",
        cost: 0,
        frequency: "annual" as const,
        quantity: 1,
        needWant: "want" as const,
      },
      {
        name: "Travel Essentials",
        cost: 0,
        frequency: "annual" as const,
        quantity: 1,
        needWant: "want" as const,
      },
    ],
  },
  {
    name: "Specialised Equipment and Training",
    description:
      "Equipment, gear, training and performance costs for your child’s specialised sport or art activity.",
    order: 10,
    items: [
      {
        name: "Equipment & Gear",
        cost: 0,
        frequency: "annual" as const,
        quantity: 1,
        needWant: "need" as const,
      },
      {
        name: "Training & Coaching",
        cost: 0,
        frequency: "term" as const,
        quantity: 4,
        needWant: "need" as const,
      },
      {
        name: "Competition/Performance Costs",
        cost: 0,
        frequency: "annual" as const,
        quantity: 1,
        needWant: "want" as const,
      },
      {
        name: "Maintenance & Upkeep",
        cost: 0,
        frequency: "annual" as const,
        quantity: 1,
        needWant: "need" as const,
      },
    ],
  },
  {
    name: "Meal/Canteen",
    description: "Child related meal/canteen expenses",
    order: 11,
    items: [
      {
        name: "Lunch orders",
        cost: 0,
        frequency: "weekly" as const,
        quantity: 52,
        needWant: "need" as const,
      },
      {
        name: "Meals",
        cost: 0,
        frequency: "weekly" as const,
        quantity: 52,
        needWant: "need" as const,
      },
    ],
  },
  {
    name: "Miscellaneous",
    description: "Unexpected costs and buffer",
    order: 12,
    confidencePercent: 0.1,
    isPercentageBased: true,
    percentageValue: 15,
    items: [],
  },
]

// Helper function to calculate annual cost
export function calculateAnnualCost(
  cost: number,
  frequency: BudgetFrequency,
  quantity: number,
): number {
  switch (frequency) {
    case "weekly":
      return cost * quantity
    case "bi-monthly":
      return cost * quantity
    case "monthly":
      return cost * quantity
    case "term":
      return cost * quantity
    case "quarterly":
      return cost * quantity
    case "annual":
      return cost * quantity
    default:
      return cost * quantity
  }
}

// Helper function to calculate Miscellaneous based on percentage of other categories
export function calculateMiscellaneousTotal(percentageValue: number, otherCategoriesTotal: number): number {
  return (percentageValue / 100) * otherCategoriesTotal
}

// Default adult category templates
export const defaultAdultCategories = [
  {
    name: "Education",
    description: "Self-development and learning expenses",
    order: 1,
    items: [
      {
        name: "Self Development Courses",
        cost: 0,
        frequency: "annual" as const,
        quantity: 1,
        needWant: "want" as const,
      },
    ],
  },
  {
    name: "Fitness",
    description: "Gym memberships and fitness activities",
    order: 2,
    items: [
      {
        name: "Gym",
        cost: 0,
        frequency: "monthly" as const,
        quantity: 12,
        needWant: "need" as const,
      },
      {
        name: "Pilates",
        cost: 0,
        frequency: "monthly" as const,
        quantity: 12,
        needWant: "need" as const,
      },
      {
        name: "Yoga",
        cost: 0,
        frequency: "monthly" as const,
        quantity: 12,
        needWant: "need" as const,
      },
      {
        name: "Sports",
        cost: 0,
        frequency: "monthly" as const,
        quantity: 12,
        needWant: "need" as const,
      },
    ],
  },
  {
    name: "Adult Communications & Subscriptions",
    description: "Communication and app subscriptions specific to the adult only",
    order: 3,
    items: [
      {
        name: "Phone Bill",
        cost: 0,
        frequency: "monthly" as const,
        quantity: 12,
        needWant: "need" as const,
      },
      {
        name: "App Subscriptions",
        cost: 0,
        frequency: "monthly" as const,
        quantity: 12,
        needWant: "want" as const,
      },
    ],
  },
  {
    name: "Medical",
    description: "Healthcare and medical expenses",
    order: 4,
    items: [
      {
        name: "GP Visits",
        cost: 0,
        frequency: "annual" as const,
        quantity: 1,
        needWant: "need" as const,
      },
      {
        name: "Dental Care",
        cost: 0,
        frequency: "annual" as const,
        quantity: 1,
        needWant: "need" as const,
      },
      {
        name: "Physiotherapy",
        cost: 0,
        frequency: "monthly" as const,
        quantity: 12,
        needWant: "need" as const,
      },
      {
        name: "Medicinal",
        cost: 0,
        frequency: "monthly" as const,
        quantity: 12,
        needWant: "need" as const,
      },
    ],
  },
  {
    name: "Vehicles/Transport",
    description: "Vehicle costs and transportation expenses",
    order: 5,
    items: [
      {
        name: "Repayments",
        cost: 0,
        frequency: "monthly" as const,
        quantity: 12,
        needWant: "need" as const,
      },
      {
        name: "Fuel",
        cost: 0,
        frequency: "weekly" as const,
        quantity: 52,
        needWant: "need" as const,
      },
      {
        name: "Parking Fees",
        cost: 0,
        frequency: "monthly" as const,
        quantity: 12,
        needWant: "need" as const,
      },
      {
        name: "Scheduled Maintenance",
        cost: 0,
        frequency: "annual" as const,
        quantity: 1,
        needWant: "need" as const,
      },
      {
        name: "Uber/Taxi",
        cost: 0,
        frequency: "monthly" as const,
        quantity: 12,
        needWant: "want" as const,
      },
      {
        name: "Public Transport",
        cost: 0,
        frequency: "weekly" as const,
        quantity: 52,
        needWant: "need" as const,
      },
      {
        name: "Insurance",
        cost: 0,
        frequency: "annual" as const,
        quantity: 1,
        needWant: "need" as const,
      },
      {
        name: "Rego",
        cost: 0,
        frequency: "annual" as const,
        quantity: 1,
        needWant: "need" as const,
      },
    ],
  },
  {
    name: "Personal Debt Repayment",
    description: "Loan and debt repayments",
    order: 6,
    items: [
      {
        name: "Education",
        cost: 0,
        frequency: "monthly" as const,
        quantity: 12,
        needWant: "need" as const,
      },
      {
        name: "Personal",
        cost: 0,
        frequency: "monthly" as const,
        quantity: 12,
        needWant: "need" as const,
      },
      {
        name: "Credit Card",
        cost: 0,
        frequency: "monthly" as const,
        quantity: 12,
        needWant: "need" as const,
      },
    ],
  },
  {
    name: "Personal",
    description: "Personal care and clothing",
    order: 7,
    items: [
      {
        name: "Clothing",
        cost: 0,
        frequency: "quarterly" as const,
        quantity: 4,
        needWant: "need" as const,
      },
      {
        name: "Shoes",
        cost: 0,
        frequency: "annual" as const,
        quantity: 1,
        needWant: "need" as const,
      },
      {
        name: "Grooming",
        cost: 0,
        frequency: "monthly" as const,
        quantity: 12,
        needWant: "need" as const,
      },
      {
        name: "Toiletries",
        cost: 0,
        frequency: "monthly" as const,
        quantity: 12,
        needWant: "need" as const,
      },
    ],
  },
  {
    name: "Gifting",
    description: "Donations and gifts for others",
    order: 8,
    items: [
      {
        name: "Donations",
        cost: 0,
        frequency: "monthly" as const,
        quantity: 12,
        needWant: "want" as const,
      },
      {
        name: "Gifts",
        cost: 0,
        frequency: "monthly" as const,
        quantity: 12,
        needWant: "want" as const,
      },
    ],
  },
  {
    name: "Adult Holidays/ Solo Travel",
    description: "Personal travel and holiday expenses",
    order: 9,
    items: [
      {
        name: "Personal Trip",
        cost: 0,
        frequency: "annual" as const,
        quantity: 1,
        needWant: "want" as const,
      },
      {
        name: "Weekend Getaways",
        cost: 0,
        frequency: "quarterly" as const,
        quantity: 4,
        needWant: "want" as const,
      },
      {
        name: "Travel Insurance",
        cost: 0,
        frequency: "annual" as const,
        quantity: 1,
        needWant: "need" as const,
      },
      {
        name: "Luggage/Travel Gear",
        cost: 0,
        frequency: "annual" as const,
        quantity: 1,
        needWant: "want" as const,
      },
    ],
  },
  {
    name: "Eating Out",
    description: "Adult related dining and takeaway expenses",
    order: 10,
    items: [
      {
        name: "Dining In",
        cost: 0,
        frequency: "monthly" as const,
        quantity: 12,
        needWant: "want" as const,
      },
      {
        name: "Coffees",
        cost: 0,
        frequency: "weekly" as const,
        quantity: 52,
        needWant: "want" as const,
      },
      {
        name: "Take Away",
        cost: 0,
        frequency: "weekly" as const,
        quantity: 52,
        needWant: "want" as const,
      },
      {
        name: "Uber Eats",
        cost: 0,
        frequency: "weekly" as const,
        quantity: 52,
        needWant: "want" as const,
      },
    ],
  },
  {
    name: "Miscellaneous",
    description: "Unexpected costs and buffer",
    order: 11,
    confidencePercent: 0.1,
    isPercentageBased: true,
    percentageValue: 15,
    items: [],
  },
]

// Default household category templates
export const defaultHouseholdCategories = [
  {
    name: "Housing",
    description: "Housing payments and property insurance",
    order: 1,
    items: [
      {
        name: "Rent",
        cost: 0,
        frequency: "monthly" as const,
        quantity: 12,
        needWant: "need" as const,
      },
      {
        name: "Mortgage Payments",
        cost: 0,
        frequency: "monthly" as const,
        quantity: 12,
        needWant: "need" as const,
      },
      {
        name: "Home Content Insurance",
        cost: 0,
        frequency: "annual" as const,
        quantity: 1,
        needWant: "need" as const,
      },
      {
        name: "Building Insurance",
        cost: 0,
        frequency: "annual" as const,
        quantity: 1,
        needWant: "need" as const,
      },
      {
        name: "Strata",
        cost: 0,
        frequency: "quarterly" as const,
        quantity: 4,
        needWant: "need" as const,
      },
      {
        name: "Council Rates",
        cost: 0,
        frequency: "quarterly" as const,
        quantity: 4,
        needWant: "need" as const,
      },
    ],
  },
  {
    name: "Utilities",
    description: "Essential household utilities",
    order: 2,
    items: [
      {
        name: "Water",
        cost: 0,
        frequency: "quarterly" as const,
        quantity: 4,
        needWant: "need" as const,
      },
      {
        name: "Electricity",
        cost: 0,
        frequency: "monthly" as const,
        quantity: 12,
        needWant: "need" as const,
      },
      {
        name: "Gas",
        cost: 0,
        frequency: "monthly" as const,
        quantity: 12,
        needWant: "need" as const,
      },
    ],
  },
  {
    name: "Scheduled Maintenance",
    description: "Regular home maintenance services",
    order: 3,
    items: [
      {
        name: "Pest Control",
        cost: 0,
        frequency: "annual" as const,
        quantity: 1,
        needWant: "need" as const,
      },
      {
        name: "Gardening",
        cost: 0,
        frequency: "monthly" as const,
        quantity: 12,
        needWant: "want" as const,
      },
      {
        name: "Water Filtration",
        cost: 0,
        frequency: "annual" as const,
        quantity: 1,
        needWant: "want" as const,
      },
      {
        name: "Cleaner",
        cost: 0,
        frequency: "weekly" as const,
        quantity: 52,
        needWant: "want" as const,
      },
    ],
  },
  {
    name: "Insurance",
    description: "Health and life insurance policies (excluding property and vehicle)",
    order: 4,
    items: [
      {
        name: "Health",
        cost: 0,
        frequency: "monthly" as const,
        quantity: 12,
        needWant: "need" as const,
      },
      {
        name: "Life Insurance",
        cost: 0,
        frequency: "monthly" as const,
        quantity: 12,
        needWant: "need" as const,
      },
      {
        name: "Income Protection",
        cost: 0,
        frequency: "monthly" as const,
        quantity: 12,
        needWant: "need" as const,
      },
    ],
  },
  {
    name: "Communications & Subscriptions",
    description: "Phone, internet, and streaming services",
    order: 5,
    items: [
      {
        name: "Phone Bill",
        cost: 0,
        frequency: "monthly" as const,
        quantity: 12,
        needWant: "need" as const,
      },
      {
        name: "Internet",
        cost: 0,
        frequency: "monthly" as const,
        quantity: 12,
        needWant: "need" as const,
      },
      {
        name: "Netflix",
        cost: 0,
        frequency: "monthly" as const,
        quantity: 12,
        needWant: "need" as const,
      },
      {
        name: "Amazon",
        cost: 0,
        frequency: "monthly" as const,
        quantity: 12,
        needWant: "need" as const,
      },
      {
        name: "Foxtel",
        cost: 0,
        frequency: "monthly" as const,
        quantity: 12,
        needWant: "need" as const,
      },
      {
        name: "Kayo",
        cost: 0,
        frequency: "monthly" as const,
        quantity: 12,
        needWant: "need" as const,
      },
      {
        name: "Disney Hotstar",
        cost: 0,
        frequency: "monthly" as const,
        quantity: 12,
        needWant: "need" as const,
      },
      {
        name: "Stan",
        cost: 0,
        frequency: "monthly" as const,
        quantity: 12,
        needWant: "need" as const,
      },
      {
        name: "Youtube",
        cost: 0,
        frequency: "monthly" as const,
        quantity: 12,
        needWant: "need" as const,
      },
      {
        name: "Spotify",
        cost: 0,
        frequency: "monthly" as const,
        quantity: 12,
        needWant: "need" as const,
      },
      {
        name: "Microsoft",
        cost: 0,
        frequency: "monthly" as const,
        quantity: 12,
        needWant: "need" as const,
      },
      {
        name: "Phone App Subscriptions",
        cost: 0,
        frequency: "monthly" as const,
        quantity: 12,
        needWant: "need" as const,
      },
    ],
  },
  {
    name: "Groceries & Household Supplies",
    description: "Food and household essentials",
    order: 6,
    items: [
      {
        name: "Supermarket",
        cost: 0,
        frequency: "weekly" as const,
        quantity: 52,
        needWant: "need" as const,
      },
      {
        name: "Fresh Fruit and Veg/Meat",
        cost: 0,
        frequency: "weekly" as const,
        quantity: 52,
        needWant: "need" as const,
      },
      {
        name: "Special Grocers",
        cost: 0,
        frequency: "monthly" as const,
        quantity: 12,
        needWant: "want" as const,
      },
      {
        name: "Alcohol",
        cost: 0,
        frequency: "weekly" as const,
        quantity: 52,
        needWant: "want" as const,
      },
    ],
  },
  {
    name: "Entertainment & Recreation",
    description: "Movies, concerts, and activities",
    order: 7,
    items: [
      {
        name: "Movies",
        cost: 0,
        frequency: "monthly" as const,
        quantity: 12,
        needWant: "want" as const,
      },
      {
        name: "Concerts",
        cost: 0,
        frequency: "annual" as const,
        quantity: 1,
        needWant: "want" as const,
      },
      {
        name: "Recreational Activities",
        cost: 0,
        frequency: "monthly" as const,
        quantity: 12,
        needWant: "want" as const,
      },
    ],
  },
  {
    name: "Eating Out",
    description: "Dining and takeaway expenses",
    order: 8,
    items: [
      {
        name: "Take Outs",
        cost: 0,
        frequency: "weekly" as const,
        quantity: 52,
        needWant: "want" as const,
      },
      {
        name: "Dining In",
        cost: 0,
        frequency: "monthly" as const,
        quantity: 12,
        needWant: "want" as const,
      },
      {
        name: "Coffees",
        cost: 0,
        frequency: "weekly" as const,
        quantity: 52,
        needWant: "want" as const,
      },
      {
        name: "Uber Eats",
        cost: 0,
        frequency: "weekly" as const,
        quantity: 52,
        needWant: "want" as const,
      },
    ],
  },
  {
    name: "Pets",
    description: "Pet care and expenses",
    order: 9,
    items: [
      {
        name: "Pet Food",
        cost: 0,
        frequency: "monthly" as const,
        quantity: 12,
        needWant: "need" as const,
      },
      {
        name: "Grooming",
        cost: 0,
        frequency: "monthly" as const,
        quantity: 12,
        needWant: "want" as const,
      },
      {
        name: "Insurance",
        cost: 0,
        frequency: "monthly" as const,
        quantity: 12,
        needWant: "need" as const,
      },
      {
        name: "Vet Visits",
        cost: 0,
        frequency: "annual" as const,
        quantity: 1,
        needWant: "need" as const,
      },
      {
        name: "Treats",
        cost: 0,
        frequency: "monthly" as const,
        quantity: 12,
        needWant: "want" as const,
      },
      {
        name: "Toys",
        cost: 0,
        frequency: "annual" as const,
        quantity: 1,
        needWant: "want" as const,
      },
      {
        name: "Dog Care",
        cost: 0,
        frequency: "monthly" as const,
        quantity: 12,
        needWant: "want" as const,
      },
    ],
  },
  {
    name: "Family Holidays",
    description: "Family travel and holiday expenses",
    order: 10,
    items: [
      {
        name: "Domestic Holiday",
        cost: 0,
        frequency: "annual" as const,
        quantity: 1,
        needWant: "want" as const,
      },
      {
        name: "International Holiday",
        cost: 0,
        frequency: "annual" as const,
        quantity: 1,
        needWant: "want" as const,
      },
      {
        name: "Accommodation",
        cost: 0,
        frequency: "annual" as const,
        quantity: 1,
        needWant: "want" as const,
      },
      {
        name: "Flights",
        cost: 0,
        frequency: "annual" as const,
        quantity: 1,
        needWant: "want" as const,
      },
      {
        name: "Travel Insurance",
        cost: 0,
        frequency: "annual" as const,
        quantity: 1,
        needWant: "need" as const,
      },
      {
        name: "Holiday Activities",
        cost: 0,
        frequency: "annual" as const,
        quantity: 1,
        needWant: "want" as const,
      },
      {
        name: "Holiday Meals/Dining",
        cost: 0,
        frequency: "annual" as const,
        quantity: 1,
        needWant: "want" as const,
      },
    ],
  },
  {
    name: "Miscellaneous",
    description: "Unexpected costs and buffer",
    order: 11,
    confidencePercent: 0.1,
    isPercentageBased: true,
    percentageValue: 15,
    items: [],
  },
]

