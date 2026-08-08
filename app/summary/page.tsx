"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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
import { Printer, Download, AlertCircle, Users, User, Home, ChevronDown, ChevronRight } from "lucide-react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { APP_CONFIG, formatCurrency } from "@/lib/config"
import { PageHeader } from "@/components/page-header"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Badge } from "@/components/ui/badge"

interface CategoryWithItems {
  category: Category | AdultCategory | HouseholdCategory
  items: (ExpenseItem | AdultExpenseItem | HouseholdExpenseItem)[]
  currentSituationTotal: number
  forwardPlanningTotal: number
  wantTotal: number
  potentialSavings: number
}

interface ChildSummary {
  child: Child
  categories: CategoryWithItems[]
  currentSituationTotal: number
  forwardPlanningTotal: number
  wantTotal: number
  potentialSavings: number
}

interface AdultSummary {
  adult: Adult
  categories: CategoryWithItems[]
  currentSituationTotal: number
  forwardPlanningTotal: number
  wantTotal: number
  potentialSavings: number
}

interface HouseholdSummary {
  household: Household
  categories: CategoryWithItems[]
  currentSituationTotal: number
  forwardPlanningTotal: number
  wantTotal: number
  potentialSavings: number
}

// Forward planning categories
const childForwardPlanningCategories = ["Education", "Medical & Special Needs", "Clothing & Toys", "Entertainment/Events", "Parties & Social"]
const adultForwardPlanningCategories = ["Education", "Medical", "Vehicles/Transport", "Debt Repayment", "Personal", "Gifting"]
const householdForwardPlanningCategories = ["Mortgage/Rent", "Utilities", "Scheduled Maintenance", "Insurance", "Groceries", "Entertainment", "Eating Out", "Pets"]

// Needs/Wants categories
const childNeedsWantsCategory = "Extracurricular"
const adultNeedsWantsCategory = "Fitness"
const householdNeedsWantsCategory = "Subscriptions"

export default function SummaryPage() {
  const [childrenSummaries, setChildrenSummaries] = useState<ChildSummary[]>([])
  const [adultsSummaries, setAdultsSummaries] = useState<AdultSummary[]>([])
  const [householdSummary, setHouseholdSummary] = useState<HouseholdSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [openSections, setOpenSections] = useState<Set<string>>(new Set())

  useEffect(() => {
    loadAllData()
  }, [])

  async function loadAllData() {
    setLoading(true)

    // Load children summaries
    const children = await db.children.toArray()
    const childSummaries: ChildSummary[] = []
    
    for (const child of children) {
      const summary = await loadChildSummary(child)
      childSummaries.push(summary)
    }
    setChildrenSummaries(childSummaries)

    // Load adults summaries
    const adults = await db.adults.toArray()
    const adultSummaries: AdultSummary[] = []
    
    for (const adult of adults) {
      const summary = await loadAdultSummary(adult)
      adultSummaries.push(summary)
    }
    setAdultsSummaries(adultSummaries)

    // Load household summary (only one)
    const households = await db.households.toArray()
    if (households.length > 0) {
      const summary = await loadHouseholdSummary(households[0])
      setHouseholdSummary(summary)
    }

    // Open first section of each type by default
    const initialOpen = new Set<string>()
    if (childSummaries.length > 0) initialOpen.add(`child-${childSummaries[0].child.id}`)
    if (adultSummaries.length > 0) initialOpen.add(`adult-${adultSummaries[0].adult.id}`)
    if (households.length > 0) initialOpen.add(`household-${households[0].id}`)
    setOpenSections(initialOpen)

    setLoading(false)
  }

  async function loadChildSummary(child: Child): Promise<ChildSummary> {
    const categories = await db.categories.where("childId").equals(child.id!).sortBy("order")
    const categoriesWithItems: CategoryWithItems[] = []
    
    const miscCategory = categories.find((c) => c.isPercentageBased)
    const miscPercentage = miscCategory?.percentageValue ?? 15

    let nonMiscCurrentTotal = 0
    let nonMiscForwardPlanningTotal = 0
    let extracurricularNeedsTotal = 0

    // First pass: calculate totals
    for (const category of categories) {
      if (category.isPercentageBased) continue
      
      const items = await db.items.where("categoryId").equals(category.id!).toArray()
      const itemsWithCost = items.filter((item) => item.cost > 0 || item.total > 0)
      
      for (const item of itemsWithCost) {
        nonMiscCurrentTotal += item.total
        
        if (childForwardPlanningCategories.includes(category.name)) {
          nonMiscForwardPlanningTotal += item.adjustedTotal ?? item.total
        }
        
        if (category.name === childNeedsWantsCategory && item.needWant === "need") {
          extracurricularNeedsTotal += item.adjustedTotal ?? item.total
        }
      }
    }

    const miscCurrentSituation = (miscPercentage / 100) * nonMiscCurrentTotal
    const miscForwardPlanning = (miscPercentage / 100) * (extracurricularNeedsTotal + nonMiscForwardPlanningTotal)

    let grandCurrentSituationTotal = nonMiscCurrentTotal + miscCurrentSituation
    let grandForwardPlanningTotal = nonMiscForwardPlanningTotal + extracurricularNeedsTotal + miscForwardPlanning
    let grandWantTotal = 0

    // Second pass: build category data
    for (const category of categories) {
      const items = await db.items.where("categoryId").equals(category.id!).toArray()
      const itemsWithCost = items.filter((item) => item.cost > 0 || item.total > 0)
      
      if (category.isPercentageBased) {
        categoriesWithItems.push({
          category,
          items: [],
          currentSituationTotal: miscCurrentSituation,
          forwardPlanningTotal: miscForwardPlanning,
          wantTotal: 0,
          potentialSavings: miscCurrentSituation - miscForwardPlanning,
        })
      } else {
        const currentSituationTotal = itemsWithCost.reduce((sum, item) => sum + item.total, 0)
        
        let forwardPlanningTotal = 0
        if (childForwardPlanningCategories.includes(category.name)) {
          forwardPlanningTotal = itemsWithCost.reduce((sum, item) => sum + (item.adjustedTotal ?? item.total), 0)
        } else if (category.name === childNeedsWantsCategory) {
          forwardPlanningTotal = itemsWithCost
            .filter((item) => item.needWant === "need")
            .reduce((sum, item) => sum + (item.adjustedTotal ?? item.total), 0)
        } else {
          forwardPlanningTotal = currentSituationTotal
        }
        
        const wantTotal = category.name === childNeedsWantsCategory
          ? itemsWithCost
              .filter((item) => item.needWant === "want")
              .reduce((sum, item) => sum + (item.adjustedTotal ?? item.total), 0)
          : 0
        
        grandWantTotal += wantTotal

        categoriesWithItems.push({
          category,
          items: itemsWithCost,
          currentSituationTotal,
          forwardPlanningTotal,
          wantTotal,
          potentialSavings: currentSituationTotal - forwardPlanningTotal,
        })
      }
    }

    return {
      child,
      categories: categoriesWithItems,
      currentSituationTotal: grandCurrentSituationTotal,
      forwardPlanningTotal: grandForwardPlanningTotal,
      wantTotal: grandWantTotal,
      potentialSavings: grandCurrentSituationTotal - grandForwardPlanningTotal,
    }
  }

  async function loadAdultSummary(adult: Adult): Promise<AdultSummary> {
    const categories = await db.adultCategories.where("adultId").equals(adult.id!).sortBy("order")
    const categoriesWithItems: CategoryWithItems[] = []
    
    const miscCategory = categories.find((c) => c.isPercentageBased)
    const miscPercentage = miscCategory?.percentageValue ?? 15

    let nonMiscCurrentTotal = 0
    let nonMiscForwardPlanningTotal = 0
    let fitnessNeedsTotal = 0

    for (const category of categories) {
      if (category.isPercentageBased) continue
      
      const items = await db.adultItems.where("categoryId").equals(category.id!).toArray()
      const itemsWithCost = items.filter((item) => item.cost > 0 || item.total > 0)
      
      for (const item of itemsWithCost) {
        nonMiscCurrentTotal += item.total
        
        if (adultForwardPlanningCategories.includes(category.name)) {
          nonMiscForwardPlanningTotal += item.adjustedTotal ?? item.total
        }
        
        if (category.name === adultNeedsWantsCategory && item.needWant === "need") {
          fitnessNeedsTotal += item.adjustedTotal ?? item.total
        }
      }
    }

    const miscCurrentSituation = (miscPercentage / 100) * nonMiscCurrentTotal
    const miscForwardPlanning = (miscPercentage / 100) * (fitnessNeedsTotal + nonMiscForwardPlanningTotal)

    let grandCurrentSituationTotal = nonMiscCurrentTotal + miscCurrentSituation
    let grandForwardPlanningTotal = nonMiscForwardPlanningTotal + fitnessNeedsTotal + miscForwardPlanning
    let grandWantTotal = 0

    for (const category of categories) {
      const items = await db.adultItems.where("categoryId").equals(category.id!).toArray()
      const itemsWithCost = items.filter((item) => item.cost > 0 || item.total > 0)
      
      if (category.isPercentageBased) {
        categoriesWithItems.push({
          category,
          items: [],
          currentSituationTotal: miscCurrentSituation,
          forwardPlanningTotal: miscForwardPlanning,
          wantTotal: 0,
          potentialSavings: miscCurrentSituation - miscForwardPlanning,
        })
      } else {
        const currentSituationTotal = itemsWithCost.reduce((sum, item) => sum + item.total, 0)
        
        let forwardPlanningTotal = 0
        if (adultForwardPlanningCategories.includes(category.name)) {
          forwardPlanningTotal = itemsWithCost.reduce((sum, item) => sum + (item.adjustedTotal ?? item.total), 0)
        } else if (category.name === adultNeedsWantsCategory) {
          forwardPlanningTotal = itemsWithCost
            .filter((item) => item.needWant === "need")
            .reduce((sum, item) => sum + (item.adjustedTotal ?? item.total), 0)
        } else {
          forwardPlanningTotal = currentSituationTotal
        }
        
        const wantTotal = category.name === adultNeedsWantsCategory
          ? itemsWithCost
              .filter((item) => item.needWant === "want")
              .reduce((sum, item) => sum + (item.adjustedTotal ?? item.total), 0)
          : 0
        
        grandWantTotal += wantTotal

        categoriesWithItems.push({
          category,
          items: itemsWithCost,
          currentSituationTotal,
          forwardPlanningTotal,
          wantTotal,
          potentialSavings: currentSituationTotal - forwardPlanningTotal,
        })
      }
    }

    return {
      adult,
      categories: categoriesWithItems,
      currentSituationTotal: grandCurrentSituationTotal,
      forwardPlanningTotal: grandForwardPlanningTotal,
      wantTotal: grandWantTotal,
      potentialSavings: grandCurrentSituationTotal - grandForwardPlanningTotal,
    }
  }

  async function loadHouseholdSummary(household: Household): Promise<HouseholdSummary> {
    const categories = await db.householdCategories.where("householdId").equals(household.id!).sortBy("order")
    const categoriesWithItems: CategoryWithItems[] = []
    
    const miscCategory = categories.find((c) => c.isPercentageBased)
    const miscPercentage = miscCategory?.percentageValue ?? 15

    let nonMiscCurrentTotal = 0
    let nonMiscForwardPlanningTotal = 0
    let subscriptionsNeedsTotal = 0

    for (const category of categories) {
      if (category.isPercentageBased) continue
      
      const items = await db.householdItems.where("categoryId").equals(category.id!).toArray()
      const itemsWithCost = items.filter((item) => item.cost > 0 || item.total > 0)
      
      for (const item of itemsWithCost) {
        nonMiscCurrentTotal += item.total
        
        if (householdForwardPlanningCategories.includes(category.name)) {
          nonMiscForwardPlanningTotal += item.adjustedTotal ?? item.total
        }
        
        if (category.name === householdNeedsWantsCategory && item.needWant === "need") {
          subscriptionsNeedsTotal += item.adjustedTotal ?? item.total
        }
      }
    }

    const miscCurrentSituation = (miscPercentage / 100) * nonMiscCurrentTotal
    const miscForwardPlanning = (miscPercentage / 100) * (subscriptionsNeedsTotal + nonMiscForwardPlanningTotal)

    let grandCurrentSituationTotal = nonMiscCurrentTotal + miscCurrentSituation
    let grandForwardPlanningTotal = nonMiscForwardPlanningTotal + subscriptionsNeedsTotal + miscForwardPlanning
    let grandWantTotal = 0

    for (const category of categories) {
      const items = await db.householdItems.where("categoryId").equals(category.id!).toArray()
      const itemsWithCost = items.filter((item) => item.cost > 0 || item.total > 0)
      
      if (category.isPercentageBased) {
        categoriesWithItems.push({
          category,
          items: [],
          currentSituationTotal: miscCurrentSituation,
          forwardPlanningTotal: miscForwardPlanning,
          wantTotal: 0,
          potentialSavings: miscCurrentSituation - miscForwardPlanning,
        })
      } else {
        const currentSituationTotal = itemsWithCost.reduce((sum, item) => sum + item.total, 0)
        
        let forwardPlanningTotal = 0
        if (householdForwardPlanningCategories.includes(category.name)) {
          forwardPlanningTotal = itemsWithCost.reduce((sum, item) => sum + (item.adjustedTotal ?? item.total), 0)
        } else if (category.name === householdNeedsWantsCategory) {
          forwardPlanningTotal = itemsWithCost
            .filter((item) => item.needWant === "need")
            .reduce((sum, item) => sum + (item.adjustedTotal ?? item.total), 0)
        } else {
          forwardPlanningTotal = currentSituationTotal
        }
        
        const wantTotal = category.name === householdNeedsWantsCategory
          ? itemsWithCost
              .filter((item) => item.needWant === "want")
              .reduce((sum, item) => sum + (item.adjustedTotal ?? item.total), 0)
          : 0
        
        grandWantTotal += wantTotal

        categoriesWithItems.push({
          category,
          items: itemsWithCost,
          currentSituationTotal,
          forwardPlanningTotal,
          wantTotal,
          potentialSavings: currentSituationTotal - forwardPlanningTotal,
        })
      }
    }

    return {
      household,
      categories: categoriesWithItems,
      currentSituationTotal: grandCurrentSituationTotal,
      forwardPlanningTotal: grandForwardPlanningTotal,
      wantTotal: grandWantTotal,
      potentialSavings: grandCurrentSituationTotal - grandForwardPlanningTotal,
    }
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

  function getFrequencyLabel(frequency: string): string {
    switch (frequency) {
      case "weekly":
        return "Weekly"
      case "bi-monthly":
        return "Bi-Monthly"
      case "monthly":
        return "Monthly"
      case "quarterly":
        return "Quarterly"
      case "term":
        return "Per Term"
      case "annual":
        return "Annual"
      default:
        return ""
    }
  }

  function handlePrint() {
    window.print()
  }

  function handleExport() {
    let csvContent = "data:text/csv;charset=utf-8,"
    csvContent += `${APP_CONFIG.APP_NAME} - Budget Summary\n`
    csvContent += `Generated: ${new Date().toLocaleDateString()}\n\n`

    // Children
    for (const summary of childrenSummaries) {
      csvContent += `\nChild: ${summary.child.name}\n`
      csvContent += "Category,Item,Current Situation,Forward Planning,Potential Savings\n"
      
      for (const categoryData of summary.categories) {
        if (categoryData.category.isPercentageBased) {
          csvContent += `"${categoryData.category.name}",,${categoryData.currentSituationTotal.toFixed(2)},${categoryData.forwardPlanningTotal.toFixed(2)},${categoryData.potentialSavings.toFixed(2)}\n`
        } else {
          for (const item of categoryData.items) {
            csvContent += `"${categoryData.category.name}","${item.name}",${item.total.toFixed(2)},${(item.adjustedTotal ?? item.total).toFixed(2)},${(item.total - (item.adjustedTotal ?? item.total)).toFixed(2)}\n`
          }
        }
      }
      csvContent += `"Total",,${summary.currentSituationTotal.toFixed(2)},${summary.forwardPlanningTotal.toFixed(2)},${summary.potentialSavings.toFixed(2)}\n`
    }

    // Adults
    for (const summary of adultsSummaries) {
      csvContent += `\nAdult: ${summary.adult.name}\n`
      csvContent += "Category,Item,Current Situation,Forward Planning,Potential Savings\n"
      
      for (const categoryData of summary.categories) {
        if (categoryData.category.isPercentageBased) {
          csvContent += `"${categoryData.category.name}",,${categoryData.currentSituationTotal.toFixed(2)},${categoryData.forwardPlanningTotal.toFixed(2)},${categoryData.potentialSavings.toFixed(2)}\n`
        } else {
          for (const item of categoryData.items) {
            csvContent += `"${categoryData.category.name}","${item.name}",${item.total.toFixed(2)},${(item.adjustedTotal ?? item.total).toFixed(2)},${(item.total - (item.adjustedTotal ?? item.total)).toFixed(2)}\n`
          }
        }
      }
      csvContent += `"Total",,${summary.currentSituationTotal.toFixed(2)},${summary.forwardPlanningTotal.toFixed(2)},${summary.potentialSavings.toFixed(2)}\n`
    }

    // Household
    if (householdSummary) {
      csvContent += `\nHousehold: ${householdSummary.household.name}\n`
      csvContent += "Category,Item,Current Situation,Forward Planning,Potential Savings\n"
      
      for (const categoryData of householdSummary.categories) {
        if (categoryData.category.isPercentageBased) {
          csvContent += `"${categoryData.category.name}",,${categoryData.currentSituationTotal.toFixed(2)},${categoryData.forwardPlanningTotal.toFixed(2)},${categoryData.potentialSavings.toFixed(2)}\n`
        } else {
          for (const item of categoryData.items) {
            csvContent += `"${categoryData.category.name}","${item.name}",${item.total.toFixed(2)},${(item.adjustedTotal ?? item.total).toFixed(2)},${(item.total - (item.adjustedTotal ?? item.total)).toFixed(2)}\n`
          }
        }
      }
      csvContent += `"Total",,${householdSummary.currentSituationTotal.toFixed(2)},${householdSummary.forwardPlanningTotal.toFixed(2)},${householdSummary.potentialSavings.toFixed(2)}\n`
    }

    const encodedUri = encodeURI(csvContent)
    const link = document.createElement("a")
    link.setAttribute("href", encodedUri)
    link.setAttribute("download", `family-budget-summary-${new Date().toISOString().split('T')[0]}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  // Calculate grand totals
  const totalChildrenSavings = childrenSummaries.reduce((sum, s) => sum + s.potentialSavings, 0)
  const totalAdultsSavings = adultsSummaries.reduce((sum, s) => sum + s.potentialSavings, 0)
  const totalHouseholdSavings = householdSummary?.potentialSavings ?? 0
  const grandTotalSavings = totalChildrenSavings + totalAdultsSavings + totalHouseholdSavings

  const totalChildrenCurrent = childrenSummaries.reduce((sum, s) => sum + s.currentSituationTotal, 0)
  const totalAdultsCurrent = adultsSummaries.reduce((sum, s) => sum + s.currentSituationTotal, 0)
  const totalHouseholdCurrent = householdSummary?.currentSituationTotal ?? 0

  const totalChildrenForward = childrenSummaries.reduce((sum, s) => sum + s.forwardPlanningTotal, 0)
  const totalAdultsForward = adultsSummaries.reduce((sum, s) => sum + s.forwardPlanningTotal, 0)
  const totalHouseholdForward = householdSummary?.forwardPlanningTotal ?? 0

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">Loading summary...</p>
      </div>
    )
  }

  const hasNoData = childrenSummaries.length === 0 && adultsSummaries.length === 0 && !householdSummary

  if (hasNoData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-secondary/5 to-accent/5">
        <div className="mx-auto max-w-4xl px-4 py-8">
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <div className="mb-4 rounded-full bg-primary/10 p-4">
                <AlertCircle className="h-8 w-8 text-primary" />
              </div>
              <h3 className="mb-2 text-xl font-semibold">No Data Available</h3>
              <p className="text-muted-foreground">Add children, adults, or household data to generate a budget summary</p>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  // Render category table for any entity type
  function renderCategoryTable(
    categoryData: CategoryWithItems,
    needsWantsCategory: string
  ) {
    const isNeedsWantsCategory = categoryData.category.name === needsWantsCategory
    const hasChanges = categoryData.potentialSavings !== 0 || categoryData.wantTotal > 0

    if (categoryData.category.isPercentageBased) {
      return (
        <div className="p-4 bg-muted/30 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">{categoryData.category.name}</p>
              <p className="text-sm text-muted-foreground">
                Calculated as {(categoryData.category as Category).percentageValue}% of expenses
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Potential Savings</p>
              <p className={`font-semibold ${categoryData.potentialSavings > 0 ? "text-green-600" : ""}`}>
                {formatCurrency(categoryData.potentialSavings)}
              </p>
            </div>
          </div>
        </div>
      )
    }

    if (categoryData.items.length === 0) return null

    return (
      <div className="overflow-hidden rounded-lg border">
        <div className="bg-muted/50 px-4 py-3 flex items-center justify-between">
          <div>
            <h4 className="font-medium">{categoryData.category.name}</h4>
            <p className="text-sm text-muted-foreground">{categoryData.category.description}</p>
          </div>
          {hasChanges && (
            <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
              Modified
            </Badge>
          )}
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[40%]">Item</TableHead>
              <TableHead className="w-[20%] text-right">Current Situation</TableHead>
              <TableHead className="w-[20%] text-right">
                {isNeedsWantsCategory ? "Needs" : "Forward Planning"}
              </TableHead>
              <TableHead className="w-[20%] text-right">Potential Savings</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {categoryData.items.map((item) => {
              const isWant = isNeedsWantsCategory && item.needWant === "want"
              const isNeed = item.needWant === "need" || !isNeedsWantsCategory
              const itemForwardPlanning = item.adjustedTotal ?? item.total
              // For Needs/Wants categories: Wants go to Potential Savings, not Forward Planning
              // Potential Savings = items marked as Wants (full amount) + any adjustedTotal differences for Needs
              const itemSavings = isNeedsWantsCategory
                ? (isWant ? item.total : item.total - itemForwardPlanning)
                : item.total - itemForwardPlanning
              // Only highlight if there's actual savings OR if it's a want in a needs/wants category
              const hasItemChange = itemSavings > 0

              return (
                <TableRow 
                  key={item.id} 
                  className={hasItemChange ? "bg-amber-50" : ""}
                >
                  <TableCell className="w-[40%]">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{item.name}</span>
                      {isWant && (
                        <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200 text-xs">
                          Want
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {formatCurrency(item.cost)} {getFrequencyLabel(item.frequency)} x {item.quantity}
                    </p>
                  </TableCell>
                  <TableCell className="w-[20%] text-right">{formatCurrency(item.total)}</TableCell>
                  <TableCell className="w-[20%] text-right">
                    {isNeedsWantsCategory 
                      ? (isNeed && !isWant ? formatCurrency(itemForwardPlanning) : "-")
                      : formatCurrency(itemForwardPlanning)
                    }
                  </TableCell>
                  <TableCell className={`w-[20%] text-right font-semibold ${itemSavings > 0 ? "text-green-600" : ""}`}>
                    {formatCurrency(itemSavings)}
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-secondary/5 to-accent/5 pb-24">
      <div className="mx-auto max-w-6xl px-4 py-8">
        <div className="print:hidden">
          <PageHeader />
        </div>

        {/* Header */}
        <div className="mb-6 print:hidden">
          <h1 className="mb-3 font-serif text-xl font-bold text-foreground">Summary</h1>
          <p className="text-sm leading-relaxed text-muted-foreground">
            This page brings together a detailed breakdown of your family&apos;s yearly expenses across children, adults, and household. Any category you adjusted during forward planning appears highlighted so you can easily see what&apos;s different from your original plan.
          </p>
        </div>

        {/* Controls */}
        <div className="mb-6 flex flex-wrap items-center justify-end gap-4 print:hidden">
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleExport} className="gap-2 bg-transparent">
              <Download className="h-4 w-4" />
              Export CSV
            </Button>
            <Button onClick={handlePrint} className="gap-2">
              <Printer className="h-4 w-4" />
              Print
            </Button>
          </div>
        </div>

        {/* Grand Totals Summary at Top */}
        <div className="mb-8">
          <Card className="border-primary/20 bg-gradient-to-br from-primary/10 to-secondary/10 shadow-lg print:shadow-none">
            <CardHeader>
              <CardTitle className="font-serif text-2xl text-primary">{APP_CONFIG.APP_NAME}</CardTitle>
              <p className="text-sm text-muted-foreground">Generated {new Date().toLocaleDateString()}</p>
            </CardHeader>
            <CardContent>
              {/* Potential Savings by Category */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-4">Potential Savings Summary</h3>
                <div className="grid gap-4 md:grid-cols-4">
                  <Card className="border-green-200 bg-gradient-to-br from-green-50 to-green-100">
                    <CardContent className="p-4">
                      <p className="text-sm font-medium text-green-700">Total Family Savings</p>
                      <p className="mt-1 text-2xl font-bold text-green-900">{formatCurrency(grandTotalSavings)}</p>
                      <p className="mt-1 text-xs text-green-600">{formatCurrency(grandTotalSavings / 12)}/month</p>
                    </CardContent>
                  </Card>
                  <Card className="border-blue-200 bg-gradient-to-br from-blue-50 to-blue-100">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 mb-1">
                        <Users className="h-4 w-4 text-blue-600" />
                        <p className="text-sm font-medium text-blue-700">Children</p>
                      </div>
                      <p className="text-xl font-bold text-blue-900">{formatCurrency(totalChildrenSavings)}</p>
                    </CardContent>
                  </Card>
                  <Card className="border-purple-200 bg-gradient-to-br from-purple-50 to-purple-100">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 mb-1">
                        <User className="h-4 w-4 text-purple-600" />
                        <p className="text-sm font-medium text-purple-700">Adults</p>
                      </div>
                      <p className="text-xl font-bold text-purple-900">{formatCurrency(totalAdultsSavings)}</p>
                    </CardContent>
                  </Card>
                  <Card className="border-amber-200 bg-gradient-to-br from-amber-50 to-amber-100">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 mb-1">
                        <Home className="h-4 w-4 text-amber-600" />
                        <p className="text-sm font-medium text-amber-700">Household</p>
                      </div>
                      <p className="text-xl font-bold text-amber-900">{formatCurrency(totalHouseholdSavings)}</p>
                    </CardContent>
                  </Card>
                </div>
              </div>

              {/* Current vs Forward Planning Overview */}
              <div className="grid gap-4 md:grid-cols-3">
                <div className="rounded-lg border p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Users className="h-4 w-4 text-blue-600" />
                    <span className="font-medium">Children ({childrenSummaries.length})</span>
                  </div>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Current:</span>
                      <span>{formatCurrency(totalChildrenCurrent)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Forward:</span>
                      <span>{formatCurrency(totalChildrenForward)}</span>
                    </div>
                  </div>
                </div>
                <div className="rounded-lg border p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <User className="h-4 w-4 text-purple-600" />
                    <span className="font-medium">Adults ({adultsSummaries.length})</span>
                  </div>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Current:</span>
                      <span>{formatCurrency(totalAdultsCurrent)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Forward:</span>
                      <span>{formatCurrency(totalAdultsForward)}</span>
                    </div>
                  </div>
                </div>
                <div className="rounded-lg border p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Home className="h-4 w-4 text-amber-600" />
                    <span className="font-medium">Household</span>
                  </div>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Current:</span>
                      <span>{formatCurrency(totalHouseholdCurrent)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Forward:</span>
                      <span>{formatCurrency(totalHouseholdForward)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Children Section */}
        {childrenSummaries.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <Users className="h-5 w-5 text-blue-600" />
              Children
            </h2>
            <div className="space-y-4">
              {childrenSummaries.map((summary) => {
                const sectionId = `child-${summary.child.id}`
                const isOpen = openSections.has(sectionId)
                
                return (
                  <Collapsible
                    key={summary.child.id}
                    open={isOpen}
                    onOpenChange={() => toggleSection(sectionId)}
                  >
                    <Card>
                      <CollapsibleTrigger asChild>
                        <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              {isOpen ? <ChevronDown className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
                              <div>
                                <CardTitle className="text-lg">{summary.child.name}</CardTitle>
                                <p className="text-sm text-muted-foreground">
                                  Age {summary.child.age} - {summary.child.schoolLevel}
                                </p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-sm text-muted-foreground">Potential Savings</p>
                              <p className={`text-xl font-bold ${summary.potentialSavings > 0 ? "text-green-600" : ""}`}>
                                {formatCurrency(summary.potentialSavings)}
                              </p>
                            </div>
                          </div>
                        </CardHeader>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <CardContent className="space-y-4">
                          {summary.categories.map((categoryData) => (
                            <div key={categoryData.category.id}>
                              {renderCategoryTable(categoryData, childNeedsWantsCategory)}
                            </div>
                          ))}
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
        {adultsSummaries.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <User className="h-5 w-5 text-purple-600" />
              Adults
            </h2>
            <div className="space-y-4">
              {adultsSummaries.map((summary) => {
                const sectionId = `adult-${summary.adult.id}`
                const isOpen = openSections.has(sectionId)
                
                return (
                  <Collapsible
                    key={summary.adult.id}
                    open={isOpen}
                    onOpenChange={() => toggleSection(sectionId)}
                  >
                    <Card>
                      <CollapsibleTrigger asChild>
                        <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              {isOpen ? <ChevronDown className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
                              <div>
                                <CardTitle className="text-lg">{summary.adult.name}</CardTitle>
                                <p className="text-sm text-muted-foreground">
                                  Age {summary.adult.age}
                                </p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-sm text-muted-foreground">Potential Savings</p>
                              <p className={`text-xl font-bold ${summary.potentialSavings > 0 ? "text-green-600" : ""}`}>
                                {formatCurrency(summary.potentialSavings)}
                              </p>
                            </div>
                          </div>
                        </CardHeader>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <CardContent className="space-y-4">
                          {summary.categories.map((categoryData) => (
                            <div key={categoryData.category.id}>
                              {renderCategoryTable(categoryData, adultNeedsWantsCategory)}
                            </div>
                          ))}
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
        {householdSummary && (
          <div className="mb-8">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <Home className="h-5 w-5 text-amber-600" />
              Household
            </h2>
            <div className="space-y-4">
              {(() => {
                const sectionId = `household-${householdSummary.household.id}`
                const isOpen = openSections.has(sectionId)
                
                return (
                  <Collapsible
                    open={isOpen}
                    onOpenChange={() => toggleSection(sectionId)}
                  >
                    <Card>
                      <CollapsibleTrigger asChild>
                        <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              {isOpen ? <ChevronDown className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
                              <div>
                                <CardTitle className="text-lg">{householdSummary.household.name}</CardTitle>
                                <p className="text-sm text-muted-foreground">
                                  {householdSummary.household.housingType} - {householdSummary.household.members} members
                                </p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-sm text-muted-foreground">Potential Savings</p>
                              <p className={`text-xl font-bold ${householdSummary.potentialSavings > 0 ? "text-green-600" : ""}`}>
                                {formatCurrency(householdSummary.potentialSavings)}
                              </p>
                            </div>
                          </div>
                        </CardHeader>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <CardContent className="space-y-4">
                          {householdSummary.categories.map((categoryData) => (
                            <div key={categoryData.category.id}>
                              {renderCategoryTable(categoryData, householdNeedsWantsCategory)}
                            </div>
                          ))}
                        </CardContent>
                      </CollapsibleContent>
                    </Card>
                  </Collapsible>
                )
              })()}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
