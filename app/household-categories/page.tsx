"use client"

import type React from "react"

import { useState, useEffect, Suspense, useCallback } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  db,
  calculateAnnualCost,
  calculateMiscellaneousTotal,
  type Household,
  type HouseholdCategory,
  type HouseholdExpenseItem,
  type BudgetFrequency,
} from "@/lib/db"
import { formatCurrency } from "@/lib/config"
import { syncToAdmin } from "@/lib/admin-sync"
import { PageHeader } from "@/components/page-header"
import { useReloadOnSync } from "@/hooks/use-reload-on-sync"
import { ChevronLeft, Plus, Edit2, Trash2 } from "lucide-react"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

function HouseholdCategoriesPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const householdId = searchParams.get("householdId")

  const [household, setHousehold] = useState<Household | null>(null)
  const [categories, setCategories] = useState<HouseholdCategory[]>([])
  const [items, setItems] = useState<Record<number, HouseholdExpenseItem[]>>({})
  const [isItemDialogOpen, setIsItemDialogOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<HouseholdExpenseItem | null>(null)
  const [currentCategoryId, setCurrentCategoryId] = useState<number | null>(null)
  const [deleteItem, setDeleteItem] = useState<HouseholdExpenseItem | null>(null)
  const [editingMiscPercentage, setEditingMiscPercentage] = useState<{ categoryId: number; percentage: string } | null>(
    null,
  )
  const [editingItemCost, setEditingItemCost] = useState<{ itemId: number; cost: string } | null>(null)
  const [itemFormData, setItemFormData] = useState({
    name: "",
    cost: "",
    frequency: "monthly" as BudgetFrequency,
    quantity: "1",
  })

  useEffect(() => {
    if (householdId) {
      loadData(Number.parseInt(householdId))
    }
  }, [householdId])
  useReloadOnSync(() => {
    if (householdId) void loadData(Number.parseInt(householdId))
  })

  // Sync to admin panel whenever data changes (debounced)
  useEffect(() => {
    if (!household) return
    const timer = setTimeout(() => {
      syncToAdmin()
    }, 1000) // Debounce 1 second
    return () => clearTimeout(timer)
  }, [household, items])

  async function loadData(id: number) {
    const householdData = await db.households.get(id)
    setHousehold(householdData || null)

    const categoriesData = await db.householdCategories.where("householdId").equals(id).sortBy("order")
    setCategories(categoriesData)

    const itemsData: Record<number, HouseholdExpenseItem[]> = {}
    for (const category of categoriesData) {
      if (category.id) {
        const categoryItems = await db.householdItems.where("categoryId").equals(category.id).toArray()
        itemsData[category.id] = categoryItems
      }
    }
    setItems(itemsData)
  }

  function openAddItemDialog(categoryId: number) {
    setCurrentCategoryId(categoryId)
    setEditingItem(null)
    setItemFormData({ name: "", cost: "", frequency: "monthly", quantity: "12" })
    setIsItemDialogOpen(true)
  }

  function openEditItemDialog(item: HouseholdExpenseItem, categoryId: number) {
    setCurrentCategoryId(categoryId)
    setEditingItem(item)
    setItemFormData({
      name: item.name,
      cost: item.cost.toString(),
      frequency: item.frequency,
      quantity: item.quantity.toString(),
    })
    setIsItemDialogOpen(true)
  }

  async function handleItemSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!currentCategoryId || !itemFormData.name || !itemFormData.cost) {
      return
    }

    const cost = Number.parseFloat(itemFormData.cost)
    const quantity = Number.parseInt(itemFormData.quantity)
    const total = calculateAnnualCost(cost, itemFormData.frequency, quantity)

    const itemData = {
      categoryId: currentCategoryId,
      name: itemFormData.name,
      cost,
      frequency: itemFormData.frequency,
      quantity,
      total,
    }

    if (editingItem?.id) {
      await db.householdItems.update(editingItem.id, itemData)
    } else {
      await db.householdItems.add(itemData)
    }

    if (householdId) {
      await loadData(Number.parseInt(householdId))
    }
    setIsItemDialogOpen(false)
  }

  async function confirmDeleteItem() {
    const item = deleteItem
    if (!item?.id) return

    await db.householdItems.delete(item.id)

    if (householdId) {
      await loadData(Number.parseInt(householdId))
    }
    setDeleteItem(null)
  }

  async function handleMiscPercentageUpdate(categoryId: number, percentage: number) {
    await db.householdCategories.update(categoryId, { percentageValue: percentage })
    if (householdId) {
      await loadData(Number.parseInt(householdId))
    }
    setEditingMiscPercentage(null)
  }

  async function handleInlineCostUpdate(item: HouseholdExpenseItem, newCost: number) {
    if (!item.id) return
    const total = calculateAnnualCost(newCost, item.frequency, item.quantity)
    await db.householdItems.update(item.id, { cost: newCost, total })
    if (householdId) {
      await loadData(Number.parseInt(householdId))
    }
    setEditingItemCost(null)
  }

  function getCategoryTotal(categoryId: number): number {
    const categoryItems = items[categoryId] || []
    const itemsTotal = categoryItems.reduce((sum, item) => sum + item.total, 0)

    const category = categories.find((c) => c.id === categoryId)
    if (category?.isPercentageBased && category.percentageValue) {
      const otherCategoriesTotal = categories.reduce((sum, cat) => {
        if (cat.id !== categoryId && cat.id) {
          return sum + (items[cat.id] || []).reduce((s, item) => s + item.total, 0)
        }
        return sum
      }, 0)
      return calculateMiscellaneousTotal(category.percentageValue, otherCategoriesTotal)
    }

    return itemsTotal
  }

  function getGrandTotal(): number {
    return categories.reduce((sum, category) => {
      if (category.id) {
        return sum + getCategoryTotal(category.id)
      }
      return sum
    }, 0)
  }

  function getFrequencyLabel(frequency: string): string {
    switch (frequency) {
      case "weekly":
        return "per week"
      case "fortnightly":
        return "per fortnight"
      case "bi-monthly":
        return "bi-monthly"
      case "monthly":
        return "per month"
      case "quarterly":
        return "quarterly"
      case "term":
        return "per term"
      case "annual":
        return "per year"
      default:
        return ""
    }
  }

  if (!household) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-secondary/5 to-accent/5">
      <div className="mx-auto max-w-4xl px-4 py-8">
        <PageHeader />

        {/* Header */}
        <div className="mb-6">
          <Button variant="ghost" onClick={() => router.push("/household")} className="mb-4 gap-2">
            <ChevronLeft className="h-4 w-4" />
            Back to Household
          </Button>
          <h1 className="mb-2 font-serif text-3xl font-bold text-primary">{household.name} Budget</h1>
          <p className="text-muted-foreground">
            {household.housingType} - {household.members} members
          </p>
        </div>

        {/* Grand Total Card */}
        <Card className="mb-6 border-primary/20 bg-gradient-to-br from-primary/10 to-secondary/10 shadow-lg">
          <CardContent className="p-6">
            <div className="text-center">
              <p className="mb-2 text-sm font-medium text-muted-foreground">Estimated Annual Cost</p>
              <p className="font-serif text-4xl font-bold text-primary">{formatCurrency(getGrandTotal())}</p>
              <p className="mt-2 text-sm text-muted-foreground">{formatCurrency(getGrandTotal() / 12)} per month</p>
            </div>
          </CardContent>
        </Card>

        {/* Categories Accordion */}
        <Accordion type="multiple" defaultValue={categories.map((c) => `category-${c.id}`)} className="space-y-4">
          {categories.map((category) => {
            const categoryItems = items[category.id!] || []
            const categoryTotal = getCategoryTotal(category.id!)

            return (
              <AccordionItem
                key={category.id}
                value={`category-${category.id}`}
                className="overflow-hidden rounded-lg border bg-card shadow-sm"
              >
                <AccordionTrigger className="px-6 py-4 hover:no-underline">
                  <div className="flex w-full items-center justify-between pr-4 text-left">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold">{category.name}</h3>
                      <p className="text-sm text-muted-foreground">{category.description}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-primary">{formatCurrency(categoryTotal)}</p>
                      {category.isPercentageBased ? (
                        <p className="text-xs text-muted-foreground">{category.percentageValue}% of other expenses</p>
                      ) : (
                        <p className="text-xs text-muted-foreground">{categoryItems.length} items</p>
                      )}
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-6 pb-4">
                  {category.isPercentageBased ? (
                    <div className="space-y-3">
                      <div className="flex items-end gap-3 rounded-md border bg-background p-4">
                        <div className="flex-1">
                          <Label htmlFor={`misc-percent-${category.id}`} className="text-sm font-medium">
                            Percentage of other expenses
                          </Label>
                          <p className="text-xs text-muted-foreground mt-1">
                            This will be calculated as a percentage of all other category totals
                          </p>
                        </div>
                        {editingMiscPercentage?.categoryId === category.id ? (
                          <div className="flex gap-2">
                            <Input
                              id={`misc-percent-${category.id}`}
                              type="number"
                              min="0"
                              max="100"
                              step="0.1"
                              value={editingMiscPercentage?.percentage ?? ""}
                              onChange={(e) =>
                                setEditingMiscPercentage({ categoryId: category.id!, percentage: e.target.value })
                              }
                              className="w-24"
                            />
                            <span className="text-lg font-bold">%</span>
                            <Button
                              size="sm"
                              onClick={() => {
                                const percentage = Number.parseFloat(editingMiscPercentage?.percentage ?? "")
                                if (!isNaN(percentage)) {
                                  handleMiscPercentageUpdate(category.id!, percentage)
                                }
                              }}
                            >
                              Save
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => setEditingMiscPercentage(null)}>
                              Cancel
                            </Button>
                          </div>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              setEditingMiscPercentage({
                                categoryId: category.id!,
                                percentage: (category.percentageValue || 15).toString(),
                              })
                            }
                          >
                            <Edit2 className="h-4 w-4 mr-2" />
                            Edit
                          </Button>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {categoryItems.map((item) => (
                        <div
                          key={item.id}
                          className="flex items-center justify-between rounded-md border bg-background p-4"
                        >
                          <div className="flex-1">
                            <p className="font-medium">{item.name}</p>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              {editingItemCost?.itemId === item.id ? (
                                <div className="flex items-center gap-2">
                                  <span>$</span>
                                  <Input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={editingItemCost?.cost ?? ""}
                                    onChange={(e) => setEditingItemCost({ itemId: item.id!, cost: e.target.value })}
                                    className="w-24 h-7 text-sm"
                                    autoFocus
                                    onKeyDown={(e) => {
                                      if (e.key === "Enter") {
                                        const newCost = Number.parseFloat(editingItemCost?.cost ?? "")
                                        if (!isNaN(newCost)) {
                                          handleInlineCostUpdate(item, newCost)
                                        }
                                      } else if (e.key === "Escape") {
                                        setEditingItemCost(null)
                                      }
                                    }}
                                  />
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-7 px-2"
                                    onClick={() => {
                                      const newCost = Number.parseFloat(editingItemCost?.cost ?? "")
                                      if (!isNaN(newCost)) {
                                        handleInlineCostUpdate(item, newCost)
                                      }
                                    }}
                                  >
                                    Save
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-7 px-2"
                                    onClick={() => setEditingItemCost(null)}
                                  >
                                    Cancel
                                  </Button>
                                </div>
                              ) : (
                                <span 
                                  className="cursor-pointer hover:text-primary hover:underline"
                                  onClick={() => setEditingItemCost({ itemId: item.id!, cost: item.cost.toString() })}
                                >
                                  {formatCurrency(item.cost)} {getFrequencyLabel(item.frequency)} x {item.quantity}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="text-right">
                              <p className="font-semibold">{formatCurrency(item.total)}</p>
                              <p className="text-xs text-muted-foreground">per year</p>
                            </div>
                            <div className="flex gap-1">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => openEditItemDialog(item, category.id!)}
                                aria-label={`Edit expense item ${item.name}`}
                              >
                                <Edit2 className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => setDeleteItem(item)}
                                aria-label={`Delete expense item ${item.name}`}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}

                      <Button
                        variant="outline"
                        className="w-full gap-2 bg-transparent"
                        onClick={() => openAddItemDialog(category.id!)}
                      >
                        <Plus className="h-4 w-4" />
                        Add Item to {category.name}
                      </Button>
                    </div>
                  )}
                </AccordionContent>
              </AccordionItem>
            )
          })}
        </Accordion>
      </div>

      {/* Add/Edit Item Dialog */}
      <Dialog open={isItemDialogOpen} onOpenChange={setIsItemDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingItem ? "Edit Expense Item" : "Add Expense Item"}</DialogTitle>
            <DialogDescription>Enter the details for this expense item</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleItemSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="itemName">Item Name *</Label>
              <Input
                id="itemName"
                value={itemFormData.name}
                onChange={(e) => setItemFormData({ ...itemFormData, name: e.target.value })}
                placeholder="e.g., Electricity Bill"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="cost">Cost (AUD) *</Label>
              <Input
                id="cost"
                type="number"
                step="0.01"
                min="0"
                value={itemFormData.cost}
                onChange={(e) => setItemFormData({ ...itemFormData, cost: e.target.value })}
                placeholder="e.g., 150"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="frequency">Frequency *</Label>
              <Select
                value={itemFormData.frequency}
                onValueChange={(value: BudgetFrequency) => {
                  const defaultQuantities: Record<BudgetFrequency, string> = {
                    weekly: "52",
                    fortnightly: "26",
                    "bi-monthly": "6",
                    monthly: "12",
                    quarterly: "4",
                    term: "4",
                    annual: "1",
                  }
                  setItemFormData({ 
                    ...itemFormData, 
                    frequency: value,
                    quantity: defaultQuantities[value]
                  })
                }}
              >
                <SelectTrigger id="frequency">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="fortnightly">Fortnightly</SelectItem>
                  <SelectItem value="bi-monthly">Bi-Monthly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="quarterly">Quarterly</SelectItem>
                  <SelectItem value="term">Per Term</SelectItem>
                  <SelectItem value="annual">Annual</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="quantity">Quantity *</Label>
              <Input
                id="quantity"
                type="number"
                min="1"
                value={itemFormData.quantity}
                onChange={(e) => setItemFormData({ ...itemFormData, quantity: e.target.value })}
                placeholder="e.g., 12"
                required
              />
              <p className="text-xs text-muted-foreground">
                {itemFormData.frequency === "weekly" && "Number of weeks (usually 52)"}
                {itemFormData.frequency === "bi-monthly" && "Number of bi-monthly periods (usually 6)"}
                {itemFormData.frequency === "monthly" && "Number of months (usually 12)"}
                {itemFormData.frequency === "quarterly" && "Number of quarters (usually 4)"}
                {itemFormData.frequency === "annual" && "Number of times per year (usually 1)"}
              </p>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsItemDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">{editingItem ? "Update Item" : "Add Item"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Item Dialog */}
      <AlertDialog open={!!deleteItem} onOpenChange={(open) => { if (!open) setDeleteItem(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Expense Item?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{deleteItem?.name}&quot;? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(event) => {
                event.preventDefault()
                void confirmDeleteItem()
              }}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

export default function HouseholdCategoriesPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <p className="text-muted-foreground">Loading...</p>
        </div>
      }
    >
      <HouseholdCategoriesPageContent />
    </Suspense>
  )
}
