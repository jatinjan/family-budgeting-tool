"use client"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { 
  db, 
  type Child, 
  type Category, 
  type ExpenseItem,
  type Adult,
  type AdultCategory,
  type AdultExpenseItem,
  type Household,
  type HouseholdCategory,
  type HouseholdExpenseItem
} from "@/lib/db"
import { formatCurrency } from "@/lib/config"
import { PageHeader } from "@/components/page-header"
import {
  CHILD_FORWARD_PLANNING as childForwardPlanningCategories,
  ADULT_FORWARD_PLANNING as adultForwardPlanningCategories,
  HOUSEHOLD_FORWARD_PLANNING as householdForwardPlanningCategories,
  CHILD_NEEDS_WANTS as childNeedsWantsCategory,
  ADULT_NEEDS_WANTS as adultNeedsWantsCategory,
  HOUSEHOLD_NEEDS_WANTS as householdNeedsWantsCategory,
} from "@/lib/planning-categories"
import { AlertCircle, ChevronDown, ChevronRight, Users, User, Home } from "lucide-react"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"

interface ChildCategoryWithItems {
  category: Category
  items: ExpenseItem[]
}

interface AdultCategoryWithItems {
  category: AdultCategory
  items: AdultExpenseItem[]
}

interface HouseholdCategoryWithItems {
  category: HouseholdCategory
  items: HouseholdExpenseItem[]
}

interface ChildPlanningData {
  child: Child
  categories: ChildCategoryWithItems[]
}

interface AdultPlanningData {
  adult: Adult
  categories: AdultCategoryWithItems[]
}

interface HouseholdPlanningData {
  household: Household
  categories: HouseholdCategoryWithItems[]
}

export default function PlanningPage() {
  const [childrenData, setChildrenData] = useState<ChildPlanningData[]>([])
  const [adultsData, setAdultsData] = useState<AdultPlanningData[]>([])
  const [householdsData, setHouseholdsData] = useState<HouseholdPlanningData[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [openSections, setOpenSections] = useState<Set<string>>(new Set())

  useEffect(() => {
    loadAllData()
  }, [])

  async function loadAllData() {
    setLoading(true)

    // Load children data
    const children = await db.children.toArray()
    const childrenPlanningData: ChildPlanningData[] = []
    for (const child of children) {
      const categories = await db.categories.where("childId").equals(child.id!).sortBy("order")
      const categoriesWithItems: ChildCategoryWithItems[] = []
      for (const category of categories) {
        const items = await db.items.where("categoryId").equals(category.id!).toArray()
        // Auto-set Extracurricular items with cost > 0 and no needWant to "need"
        if (category.name === "Extracurricular") {
          for (const item of items) {
            if (item.cost > 0 && !item.needWant) {
              await db.items.update(item.id!, { needWant: "need" })
              item.needWant = "need"
            }
          }
        }
        categoriesWithItems.push({ category, items })
      }
      childrenPlanningData.push({ child, categories: categoriesWithItems })
    }
    setChildrenData(childrenPlanningData)

    // Load adults data
    const adults = await db.adults.toArray()
    const adultsPlanningData: AdultPlanningData[] = []
    for (const adult of adults) {
      const categories = await db.adultCategories.where("adultId").equals(adult.id!).sortBy("order")
      const categoriesWithItems: AdultCategoryWithItems[] = []
      for (const category of categories) {
        const items = await db.adultItems.where("categoryId").equals(category.id!).toArray()
        // Auto-set Fitness items to "need" by default (only if cost is 0 and needWant was "want" from old defaults)
        if (category.name === "Fitness") {
          for (const item of items) {
            if (item.cost === 0 && item.needWant === "want") {
              await db.adultItems.update(item.id!, { needWant: "need" })
              item.needWant = "need"
            } else if (item.cost > 0 && !item.needWant) {
              await db.adultItems.update(item.id!, { needWant: "need" })
              item.needWant = "need"
            }
          }
        }
        categoriesWithItems.push({ category, items })
      }
      adultsPlanningData.push({ adult, categories: categoriesWithItems })
    }
    setAdultsData(adultsPlanningData)

    // Load households data
    const households = await db.households.toArray()
    const householdsPlanningData: HouseholdPlanningData[] = []
    for (const household of households) {
      const categories = await db.householdCategories.where("householdId").equals(household.id!).sortBy("order")
      const categoriesWithItems: HouseholdCategoryWithItems[] = []
      for (const category of categories) {
        const items = await db.householdItems.where("categoryId").equals(category.id!).toArray()
        // Auto-set Subscriptions items to "need" by default (only if cost is 0 and needWant was "want" from old defaults)
        if (category.name === "Subscriptions") {
          for (const item of items) {
            if (item.cost === 0 && item.needWant === "want") {
              await db.householdItems.update(item.id!, { needWant: "need" })
              item.needWant = "need"
            } else if (item.cost > 0 && !item.needWant) {
              await db.householdItems.update(item.id!, { needWant: "need" })
              item.needWant = "need"
            }
          }
        }
        categoriesWithItems.push({ category, items })
      }
      householdsPlanningData.push({ household, categories: categoriesWithItems })
    }
    setHouseholdsData(householdsPlanningData)

    // Open first section of each type by default
    const initialOpen = new Set<string>()
    if (childrenPlanningData.length > 0) initialOpen.add(`child-${childrenPlanningData[0].child.id}`)
    if (adultsPlanningData.length > 0) initialOpen.add(`adult-${adultsPlanningData[0].adult.id}`)
    if (householdsPlanningData.length > 0) initialOpen.add(`household-${householdsPlanningData[0].household.id}`)
    setOpenSections(initialOpen)

    setLoading(false)
  }

  function toggleSection(sectionId: string) {
    setOpenSections(prev => {
      const next = new Set(prev)
      if (next.has(sectionId)) {
        next.delete(sectionId)
      } else {
        next.add(sectionId)
      }
      return next
    })
  }

  // Child item updates
  async function updateChildItemNeedWant(itemId: number, needWant: "need" | "want", childId: number) {
    setSaving(true)
    await db.items.update(itemId, { needWant })
    setChildrenData(prev => prev.map(cd => {
      if (cd.child.id !== childId) return cd
      return {
        ...cd,
        categories: cd.categories.map(cat => ({
          ...cat,
          items: cat.items.map(item => item.id === itemId ? { ...item, needWant } : item)
        }))
      }
    }))
    setSaving(false)
  }

  async function updateChildItemAdjustment(itemId: number, adjustedTotal: number, childId: number) {
    setSaving(true)
    await db.items.update(itemId, { adjustedTotal })
    setChildrenData(prev => prev.map(cd => {
      if (cd.child.id !== childId) return cd
      return {
        ...cd,
        categories: cd.categories.map(cat => ({
          ...cat,
          items: cat.items.map(item => item.id === itemId ? { ...item, adjustedTotal } : item)
        }))
      }
    }))
    setSaving(false)
  }

  // Adult item updates
  async function updateAdultItemNeedWant(itemId: number, needWant: "need" | "want", adultId: number) {
    setSaving(true)
    await db.adultItems.update(itemId, { needWant })
    setAdultsData(prev => prev.map(ad => {
      if (ad.adult.id !== adultId) return ad
      return {
        ...ad,
        categories: ad.categories.map(cat => ({
          ...cat,
          items: cat.items.map(item => item.id === itemId ? { ...item, needWant } : item)
        }))
      }
    }))
    setSaving(false)
  }

  async function updateAdultItemAdjustment(itemId: number, adjustedTotal: number, adultId: number) {
    setSaving(true)
    await db.adultItems.update(itemId, { adjustedTotal })
    setAdultsData(prev => prev.map(ad => {
      if (ad.adult.id !== adultId) return ad
      return {
        ...ad,
        categories: ad.categories.map(cat => ({
          ...cat,
          items: cat.items.map(item => item.id === itemId ? { ...item, adjustedTotal } : item)
        }))
      }
    }))
    setSaving(false)
  }

  // Household item updates
  async function updateHouseholdItemNeedWant(itemId: number, needWant: "need" | "want", householdId: number) {
    setSaving(true)
    await db.householdItems.update(itemId, { needWant })
    setHouseholdsData(prev => prev.map(hd => {
      if (hd.household.id !== householdId) return hd
      return {
        ...hd,
        categories: hd.categories.map(cat => ({
          ...cat,
          items: cat.items.map(item => item.id === itemId ? { ...item, needWant } : item)
        }))
      }
    }))
    setSaving(false)
  }

  async function updateHouseholdItemAdjustment(itemId: number, adjustedTotal: number, householdId: number) {
    setSaving(true)
    await db.householdItems.update(itemId, { adjustedTotal })
    setHouseholdsData(prev => prev.map(hd => {
      if (hd.household.id !== householdId) return hd
      return {
        ...hd,
        categories: hd.categories.map(cat => ({
          ...cat,
          items: cat.items.map(item => item.id === itemId ? { ...item, adjustedTotal } : item)
        }))
      }
    }))
    setSaving(false)
  }

  // Calculate totals for a child
  function calculateChildTotals(data: ChildPlanningData) {
    const miscCategory = data.categories.find(c => c.category.isPercentageBased)
    const miscPercentage = miscCategory?.category.percentageValue ?? 15

    const nonMiscCurrentTotal = data.categories
      .filter(c => !c.category.isPercentageBased)
      .flatMap(c => c.items)
      .reduce((sum, item) => sum + item.total, 0)
    const miscCurrentSituation = (miscPercentage / 100) * nonMiscCurrentTotal
    const currentSituationTotal = nonMiscCurrentTotal + miscCurrentSituation

    const needsTotal = data.categories
      .filter(c => c.category.name === childNeedsWantsCategory)
      .flatMap(c => c.items)
      .filter(item => item.needWant === "need")
      .reduce((sum, item) => sum + (item.adjustedTotal ?? item.total), 0)

    const forwardPlanningItemsTotal = data.categories
      .filter(c => childForwardPlanningCategories.includes(c.category.name))
      .flatMap(c => c.items)
      .reduce((sum, item) => sum + (item.adjustedTotal ?? item.total), 0)

    const miscForwardPlanning = (miscPercentage / 100) * (needsTotal + forwardPlanningItemsTotal)
    const forwardPlanningTotal = forwardPlanningItemsTotal + needsTotal + miscForwardPlanning
    const potentialSavings = currentSituationTotal - forwardPlanningTotal

    const wantTotal = data.categories
      .filter(c => c.category.name === childNeedsWantsCategory)
      .flatMap(c => c.items)
      .filter(item => item.needWant === "want")
      .reduce((sum, item) => sum + (item.adjustedTotal ?? item.total), 0)

    return { currentSituationTotal, forwardPlanningTotal, potentialSavings, wantTotal, miscPercentage, miscCurrentSituation, miscForwardPlanning, needsTotal, forwardPlanningItemsTotal }
  }

  // Calculate totals for an adult
  function calculateAdultTotals(data: AdultPlanningData) {
    const miscCategory = data.categories.find(c => c.category.isPercentageBased)
    const miscPercentage = miscCategory?.category.percentageValue ?? 15

    const nonMiscCurrentTotal = data.categories
      .filter(c => !c.category.isPercentageBased)
      .flatMap(c => c.items)
      .reduce((sum, item) => sum + item.total, 0)
    const miscCurrentSituation = (miscPercentage / 100) * nonMiscCurrentTotal
    const currentSituationTotal = nonMiscCurrentTotal + miscCurrentSituation

    const needsTotal = data.categories
      .filter(c => c.category.name === adultNeedsWantsCategory)
      .flatMap(c => c.items)
      .filter(item => item.needWant === "need")
      .reduce((sum, item) => sum + (item.adjustedTotal ?? item.total), 0)

    const forwardPlanningItemsTotal = data.categories
      .filter(c => adultForwardPlanningCategories.includes(c.category.name))
      .flatMap(c => c.items)
      .reduce((sum, item) => sum + (item.adjustedTotal ?? item.total), 0)

    const miscForwardPlanning = (miscPercentage / 100) * (needsTotal + forwardPlanningItemsTotal)
    const forwardPlanningTotal = forwardPlanningItemsTotal + needsTotal + miscForwardPlanning
    const potentialSavings = currentSituationTotal - forwardPlanningTotal

    const wantTotal = data.categories
      .filter(c => c.category.name === adultNeedsWantsCategory)
      .flatMap(c => c.items)
      .filter(item => item.needWant === "want")
      .reduce((sum, item) => sum + (item.adjustedTotal ?? item.total), 0)

    return { currentSituationTotal, forwardPlanningTotal, potentialSavings, wantTotal, miscPercentage, miscCurrentSituation, miscForwardPlanning, needsTotal, forwardPlanningItemsTotal }
  }

  // Calculate totals for a household
  function calculateHouseholdTotals(data: HouseholdPlanningData) {
    const miscCategory = data.categories.find(c => c.category.isPercentageBased)
    const miscPercentage = miscCategory?.category.percentageValue ?? 15

    const nonMiscCurrentTotal = data.categories
      .filter(c => !c.category.isPercentageBased)
      .flatMap(c => c.items)
      .reduce((sum, item) => sum + item.total, 0)
    const miscCurrentSituation = (miscPercentage / 100) * nonMiscCurrentTotal
    const currentSituationTotal = nonMiscCurrentTotal + miscCurrentSituation

    const needsTotal = data.categories
      .filter(c => c.category.name === householdNeedsWantsCategory)
      .flatMap(c => c.items)
      .filter(item => item.needWant === "need")
      .reduce((sum, item) => sum + (item.adjustedTotal ?? item.total), 0)

    const forwardPlanningItemsTotal = data.categories
      .filter(c => householdForwardPlanningCategories.includes(c.category.name))
      .flatMap(c => c.items)
      .reduce((sum, item) => sum + (item.adjustedTotal ?? item.total), 0)

    const miscForwardPlanning = (miscPercentage / 100) * (needsTotal + forwardPlanningItemsTotal)
    const forwardPlanningTotal = forwardPlanningItemsTotal + needsTotal + miscForwardPlanning
    const potentialSavings = currentSituationTotal - forwardPlanningTotal

    const wantTotal = data.categories
      .filter(c => c.category.name === householdNeedsWantsCategory)
      .flatMap(c => c.items)
      .filter(item => item.needWant === "want")
      .reduce((sum, item) => sum + (item.adjustedTotal ?? item.total), 0)

    return { currentSituationTotal, forwardPlanningTotal, potentialSavings, wantTotal, miscPercentage, miscCurrentSituation, miscForwardPlanning, needsTotal, forwardPlanningItemsTotal }
  }

  // Grand totals
  const grandCurrentSituation = 
    childrenData.reduce((sum, cd) => sum + calculateChildTotals(cd).currentSituationTotal, 0) +
    adultsData.reduce((sum, ad) => sum + calculateAdultTotals(ad).currentSituationTotal, 0) +
    householdsData.reduce((sum, hd) => sum + calculateHouseholdTotals(hd).currentSituationTotal, 0)

  const grandForwardPlanning = 
    childrenData.reduce((sum, cd) => sum + calculateChildTotals(cd).forwardPlanningTotal, 0) +
    adultsData.reduce((sum, ad) => sum + calculateAdultTotals(ad).forwardPlanningTotal, 0) +
    householdsData.reduce((sum, hd) => sum + calculateHouseholdTotals(hd).forwardPlanningTotal, 0)

  const grandPotentialSavings = grandCurrentSituation - grandForwardPlanning

  const grandWants = 
    childrenData.reduce((sum, cd) => sum + calculateChildTotals(cd).wantTotal, 0) +
    adultsData.reduce((sum, ad) => sum + calculateAdultTotals(ad).wantTotal, 0) +
    householdsData.reduce((sum, hd) => sum + calculateHouseholdTotals(hd).wantTotal, 0)

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center pb-24">
        <p className="text-muted-foreground">Loading planning data...</p>
      </div>
    )
  }

  const hasNoData = childrenData.length === 0 && adultsData.length === 0 && householdsData.length === 0

  if (hasNoData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-secondary/5 to-accent/5 pb-24">
        <div className="mx-auto max-w-2xl px-4 py-8">
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <div className="mb-4 rounded-full bg-primary/10 p-4">
                <AlertCircle className="h-8 w-8 text-primary" />
              </div>
              <h3 className="mb-2 text-xl font-semibold">No Data Available</h3>
              <p className="text-muted-foreground">Add children, adults, or household data to start planning</p>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  // Render category items
  function renderCategoryCard(
    categoryData: ChildCategoryWithItems | AdultCategoryWithItems | HouseholdCategoryWithItems,
    entityType: "child" | "adult" | "household",
    entityId: number,
    forwardPlanningCategories: string[],
    needsWantsCategory: string,
    totals: ReturnType<typeof calculateChildTotals>,
    updateNeedWant: (itemId: number, needWant: "need" | "want", entityId: number) => void,
    updateAdjustment: (itemId: number, adjustedTotal: number, entityId: number) => void
  ) {
    const category = categoryData.category
    // Only show expense items that have an amount entered in the budget sheet
    const items = categoryData.items.filter((item) => item.cost > 0)
    const isForwardPlanningCategory = forwardPlanningCategories.includes(category.name)
    const isNeedsWantsCategory = category.name === needsWantsCategory
    const isMiscellaneousCategory = category.isPercentageBased

    // Hide non-percentage categories that have no entered items
    if (!isMiscellaneousCategory && items.length === 0) {
      return null
    }

    const categoryTotal = items.reduce((sum, item) => sum + (item.adjustedTotal ?? item.total), 0)

    if (isMiscellaneousCategory) {
      return (
        <Card key={category.id} className="overflow-hidden border-dashed">
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <CardTitle className="text-lg">{category.name}</CardTitle>
                <CardDescription className="mt-1">
                  {category.description} ({totals.miscPercentage}% of expenses)
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="rounded-lg border border-muted bg-muted/30 p-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">Current Situation</p>
                  <p className="text-lg font-bold text-primary">{formatCurrency(totals.miscCurrentSituation)}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">Forward Planning</p>
                  <p className="text-lg font-bold text-purple-600">{formatCurrency(totals.miscForwardPlanning)}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )
    }

    return (
      <Card key={category.id} className="overflow-hidden">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <CardTitle className="text-lg">{category.name}</CardTitle>
              <CardDescription className="mt-1">{category.description}</CardDescription>
            </div>
            <div className="text-right">
              <p className="text-xs font-medium text-muted-foreground">Total</p>
              <p className="text-lg font-bold text-primary">{formatCurrency(categoryTotal)}</p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          {items.length > 0 ? (
            <div className="space-y-3">
              {items.map((item) => (
                <div key={item.id}>
                  {isForwardPlanningCategory ? (
                    <div className="rounded-lg border border-muted bg-muted/30 p-3">
                      <div className="mb-3">
                        <p className="font-medium text-sm">{item.name}</p>
                        <p className="text-xs text-muted-foreground">{formatCurrency(item.total)} annual</p>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs font-medium text-muted-foreground">Current Situation</label>
                          <div className="mt-1 text-sm font-semibold text-primary">{formatCurrency(item.total)}</div>
                        </div>
                        <div>
                          <label className="text-xs font-medium text-muted-foreground">Forward Planning</label>
                          <div className="mt-1 flex items-center">
                            <span className="text-sm font-semibold text-muted-foreground mr-1">$</span>
                            <input
                              type="number"
                              step="1"
                              min="0"
                              defaultValue={Math.round(item.adjustedTotal ?? item.total)}
                              onBlur={(e) => {
                                const value = Number.parseInt(e.target.value, 10)
                                updateAdjustment(item.id!, isNaN(value) ? 0 : value, entityId)
                              }}
                              className="w-full rounded border border-input bg-background px-2 py-2 text-sm font-semibold"
                              disabled={saving}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : isNeedsWantsCategory ? (
                    <div className="rounded-lg border border-muted bg-muted/30 p-3">
                      <div className="mb-3">
                        <p className="font-medium text-sm">{item.name}</p>
                        <p className="text-xs text-muted-foreground">{formatCurrency(item.total)} annual</p>
                      </div>
                      <div className="grid grid-cols-2 gap-3 mb-3">
                        <div>
                          <label className="text-xs font-medium text-muted-foreground">Current Situation</label>
                          <div className="mt-1 text-sm font-semibold text-primary">{formatCurrency(item.total)}</div>
                        </div>
                        <div>
                          <label className="text-xs font-medium text-muted-foreground">Forward Planning</label>
                          <div className="mt-1 flex items-center">
                            <span className="text-sm font-semibold text-muted-foreground mr-1">$</span>
                            <input
                              type="number"
                              step="1"
                              min="0"
                              defaultValue={Math.round(item.adjustedTotal ?? item.total)}
                              onBlur={(e) => {
                                const value = Number.parseInt(e.target.value, 10)
                                updateAdjustment(item.id!, isNaN(value) ? 0 : value, entityId)
                              }}
                              className="w-full rounded border border-input bg-background px-2 py-2 text-sm font-semibold"
                              disabled={saving}
                            />
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2 pt-1">
                        <Button
                          size="sm"
                          variant={item.needWant === "need" ? "default" : "outline"}
                          className="flex-1"
                          onClick={() => updateNeedWant(item.id!, "need", entityId)}
                          disabled={saving}
                        >
                          <span className="mr-1">&#10003;</span>
                          Need
                        </Button>
                        <Button
                          size="sm"
                          variant={item.needWant === "want" ? "default" : "outline"}
                          className="flex-1"
                          onClick={() => updateNeedWant(item.id!, "want", entityId)}
                          disabled={saving}
                        >
                          <span className="mr-1">&#9671;</span>
                          Want
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-2 rounded-lg border border-muted bg-muted/30 p-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-sm">{item.name}</p>
                          <p className="text-xs text-muted-foreground">{formatCurrency(item.total)} annual</p>
                        </div>
                        <p className="font-bold text-primary">{formatCurrency(item.total)}</p>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground py-2">No items in this category</p>
          )}
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-secondary/5 to-accent/5 pb-24">
      <div className="mx-auto max-w-4xl px-4 py-8">
        <PageHeader />

        {/* Header */}
        <div className="mb-8">
          <h1 className="mb-3 font-serif text-xl font-bold text-foreground">Budget Planning</h1>
          <p className="text-sm leading-relaxed text-muted-foreground">
            This page gives you a calm, simple view of your family expenses so you can understand where your money is going today and explore how small, thoughtful changes could shape your year ahead.
          </p>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            You can update any dollar amounts to reflect what you expect to spend. For specific categories (Extracurricular for children, Fitness for adults, Subscriptions for household), you can choose which items are true needs and which are wants.
          </p>
        </div>

        {/* Grand Summary Cards */}
        <div className="mb-8 grid grid-cols-1 gap-3 sm:grid-cols-4">
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
            <CardContent className="p-4">
              <p className="text-xs font-medium text-blue-700">Current Situation</p>
              <p className="mt-1 text-lg font-bold text-blue-900">{formatCurrency(grandCurrentSituation)}</p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
            <CardContent className="p-4">
              <p className="text-xs font-medium text-purple-700">Forward Planning</p>
              <p className="mt-1 text-lg font-bold text-purple-900">{formatCurrency(grandForwardPlanning)}</p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-teal-50 to-teal-100 border-teal-200">
            <CardContent className="p-4">
              <p className="text-xs font-medium text-teal-700">Potential Savings</p>
              <p className="mt-1 text-lg font-bold text-teal-900">{formatCurrency(grandPotentialSavings)}</p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-amber-50 to-amber-100 border-amber-200">
            <CardContent className="p-4">
              <p className="text-xs font-medium text-amber-700">Wants (Optional)</p>
              <p className="mt-1 text-lg font-bold text-amber-900">{formatCurrency(grandWants)}</p>
            </CardContent>
          </Card>
        </div>

        {/* Children Section */}
        {childrenData.length > 0 && (
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              <Users className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-semibold">Children</h2>
            </div>
            <div className="space-y-4">
              {childrenData.map(childData => {
                const totals = calculateChildTotals(childData)
                const isOpen = openSections.has(`child-${childData.child.id}`)
                return (
                  <Collapsible
                    key={childData.child.id}
                    open={isOpen}
                    onOpenChange={() => toggleSection(`child-${childData.child.id}`)}
                  >
                    <Card className="overflow-hidden">
                      <CollapsibleTrigger className="w-full">
                        <CardHeader className="pb-3 cursor-pointer hover:bg-muted/30 transition-colors">
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <div className="flex items-center gap-3">
                              {isOpen ? <ChevronDown className="h-5 w-5 shrink-0" /> : <ChevronRight className="h-5 w-5 shrink-0" />}
                              <div className="text-left">
                                <CardTitle className="text-lg">{childData.child.name}</CardTitle>
                                <CardDescription>{childData.child.age} years old - {childData.child.schoolLevel}</CardDescription>
                              </div>
                            </div>
                            <div className="grid grid-cols-3 gap-2 text-right sm:gap-4">
                              <div className="min-w-0">
                                <p className="text-[10px] sm:text-xs text-muted-foreground">Current</p>
                                <p className="text-sm sm:text-base font-bold text-primary truncate">{formatCurrency(totals.currentSituationTotal)}</p>
                              </div>
                              <div className="min-w-0">
                                <p className="text-[10px] sm:text-xs text-muted-foreground">Forward</p>
                                <p className="text-sm sm:text-base font-bold text-purple-600 truncate">{formatCurrency(totals.forwardPlanningTotal)}</p>
                              </div>
                              <div className="min-w-0">
                                <p className="text-[10px] sm:text-xs text-muted-foreground">Savings</p>
                                <p className="text-sm sm:text-base font-bold text-teal-600 truncate">{formatCurrency(totals.potentialSavings)}</p>
                              </div>
                            </div>
                          </div>
                        </CardHeader>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <CardContent className="pt-0 space-y-4">
                          {childData.categories.map(categoryData => 
                            renderCategoryCard(
                              categoryData,
                              "child",
                              childData.child.id!,
                              childForwardPlanningCategories,
                              childNeedsWantsCategory,
                              totals,
                              updateChildItemNeedWant,
                              updateChildItemAdjustment
                            )
                          )}
                        </CardContent>
                      </CollapsibleContent>
                    </Card>
                  </Collapsible>
                )
              })}
            </div>
          </div>
        )}

        {/* Adults Section */}
        {adultsData.length > 0 && (
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              <User className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-semibold">Adults</h2>
            </div>
            <div className="space-y-4">
              {adultsData.map(adultData => {
                const totals = calculateAdultTotals(adultData)
                const isOpen = openSections.has(`adult-${adultData.adult.id}`)
                return (
                  <Collapsible
                    key={adultData.adult.id}
                    open={isOpen}
                    onOpenChange={() => toggleSection(`adult-${adultData.adult.id}`)}
                  >
                    <Card className="overflow-hidden">
                      <CollapsibleTrigger className="w-full">
                        <CardHeader className="pb-3 cursor-pointer hover:bg-muted/30 transition-colors">
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <div className="flex items-center gap-3">
                              {isOpen ? <ChevronDown className="h-5 w-5 shrink-0" /> : <ChevronRight className="h-5 w-5 shrink-0" />}
                              <div className="text-left">
                                <CardTitle className="text-lg">{adultData.adult.name}</CardTitle>
                                <CardDescription>{adultData.adult.age} years old</CardDescription>
                              </div>
                            </div>
                            <div className="grid grid-cols-3 gap-2 text-right sm:gap-4">
                              <div className="min-w-0">
                                <p className="text-[10px] sm:text-xs text-muted-foreground">Current</p>
                                <p className="text-sm sm:text-base font-bold text-primary truncate">{formatCurrency(totals.currentSituationTotal)}</p>
                              </div>
                              <div className="min-w-0">
                                <p className="text-[10px] sm:text-xs text-muted-foreground">Forward</p>
                                <p className="text-sm sm:text-base font-bold text-purple-600 truncate">{formatCurrency(totals.forwardPlanningTotal)}</p>
                              </div>
                              <div className="min-w-0">
                                <p className="text-[10px] sm:text-xs text-muted-foreground">Savings</p>
                                <p className="text-sm sm:text-base font-bold text-teal-600 truncate">{formatCurrency(totals.potentialSavings)}</p>
                              </div>
                            </div>
                          </div>
                        </CardHeader>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <CardContent className="pt-0 space-y-4">
                          {adultData.categories.map(categoryData => 
                            renderCategoryCard(
                              categoryData,
                              "adult",
                              adultData.adult.id!,
                              adultForwardPlanningCategories,
                              adultNeedsWantsCategory,
                              totals,
                              updateAdultItemNeedWant,
                              updateAdultItemAdjustment
                            )
                          )}
                        </CardContent>
                      </CollapsibleContent>
                    </Card>
                  </Collapsible>
                )
              })}
            </div>
          </div>
        )}

        {/* Household Section */}
        {householdsData.length > 0 && (
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              <Home className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-semibold">Household</h2>
            </div>
            <div className="space-y-4">
              {householdsData.map(householdData => {
                const totals = calculateHouseholdTotals(householdData)
                const isOpen = openSections.has(`household-${householdData.household.id}`)
                return (
                  <Collapsible
                    key={householdData.household.id}
                    open={isOpen}
                    onOpenChange={() => toggleSection(`household-${householdData.household.id}`)}
                  >
                    <Card className="overflow-hidden">
                      <CollapsibleTrigger className="w-full">
                        <CardHeader className="pb-3 cursor-pointer hover:bg-muted/30 transition-colors">
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <div className="flex items-center gap-3">
                              {isOpen ? <ChevronDown className="h-5 w-5 shrink-0" /> : <ChevronRight className="h-5 w-5 shrink-0" />}
                              <div className="text-left">
                                <CardTitle className="text-lg">{householdData.household.name}</CardTitle>
                                <CardDescription>{householdData.household.housingType} - {householdData.household.members} members</CardDescription>
                              </div>
                            </div>
                            <div className="grid grid-cols-3 gap-2 text-right sm:gap-4">
                              <div className="min-w-0">
                                <p className="text-[10px] sm:text-xs text-muted-foreground">Current</p>
                                <p className="text-sm sm:text-base font-bold text-primary truncate">{formatCurrency(totals.currentSituationTotal)}</p>
                              </div>
                              <div className="min-w-0">
                                <p className="text-[10px] sm:text-xs text-muted-foreground">Forward</p>
                                <p className="text-sm sm:text-base font-bold text-purple-600 truncate">{formatCurrency(totals.forwardPlanningTotal)}</p>
                              </div>
                              <div className="min-w-0">
                                <p className="text-[10px] sm:text-xs text-muted-foreground">Savings</p>
                                <p className="text-sm sm:text-base font-bold text-teal-600 truncate">{formatCurrency(totals.potentialSavings)}</p>
                              </div>
                            </div>
                          </div>
                        </CardHeader>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <CardContent className="pt-0 space-y-4">
                          {householdData.categories.map(categoryData => 
                            renderCategoryCard(
                              categoryData,
                              "household",
                              householdData.household.id!,
                              householdForwardPlanningCategories,
                              householdNeedsWantsCategory,
                              totals,
                              updateHouseholdItemNeedWant,
                              updateHouseholdItemAdjustment
                            )
                          )}
                        </CardContent>
                      </CollapsibleContent>
                    </Card>
                  </Collapsible>
                )
              })}
            </div>
          </div>
        )}

        {/* Help Text */}
        <Card className="mt-8 border-dashed bg-muted/30">
          <CardContent className="p-4 text-sm text-muted-foreground">
            <p className="font-medium mb-2">Planning Guide:</p>
            <p>
              <strong>Forward Planning Categories:</strong> Most categories allow you to adjust amounts based on your actual situation. You can reduce costs by choosing alternative options.
            </p>
            <p className="mt-2">
              <strong>Needs:</strong> Essential expenses required for health, safety, and wellbeing
            </p>
            <p className="mt-2">
              <strong>Wants:</strong> Optional expenses that improve quality of life but are not essential
            </p>
            <p className="mt-2">
              <strong>Needs/Wants Categories:</strong> Extracurricular (children), Fitness (adults), Subscriptions (household)
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
