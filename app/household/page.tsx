"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { db, initializeHouseholdData, type Household } from "@/lib/db"
import { PageHeader } from "@/components/page-header"
import { useReloadOnSync } from "@/hooks/use-reload-on-sync"
import { toast } from "@/hooks/use-toast"
import { clearTabSnapshots } from "@/hooks/use-tab-snapshot"
import { withSyncWrite } from "@/lib/sync"
import { Plus, Edit2, Trash2, RefreshCw } from "lucide-react"
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

const housingTypes = ["House - Owned", "House - Rented", "Apartment - Owned", "Apartment - Rented", "Townhouse - Owned", "Townhouse - Rented", "Other"]

export default function HouseholdPage() {
  const router = useRouter()
  const [households, setHouseholds] = useState<Household[]>([])
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingHousehold, setEditingHousehold] = useState<Household | null>(null)
  const [deleteHousehold, setDeleteHousehold] = useState<Household | null>(null)
  const [resetHousehold, setResetHousehold] = useState<Household | null>(null)
  const [formData, setFormData] = useState({
    name: "",
    housingType: "",
    members: "",
  })

  useEffect(() => {
    loadHouseholds()
  }, [])
  useReloadOnSync(loadHouseholds)

  async function loadHouseholds() {
    const allHouseholds = await db.households.toArray()
    setHouseholds(
      allHouseholds.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    )
  }

  function resetForm() {
    setFormData({ name: "", housingType: "", members: "" })
    setEditingHousehold(null)
    setIsFormOpen(false)
  }

  function handleEdit(household: Household) {
    setEditingHousehold(household)
    setFormData({
      name: household.name,
      housingType: household.housingType,
      members: household.members.toString(),
    })
    setIsFormOpen(true)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!formData.name || !formData.housingType || !formData.members) {
      return
    }

    const householdData = {
      name: formData.name,
      housingType: formData.housingType,
      members: Number.parseInt(formData.members),
      createdAt: new Date(),
    }

    if (editingHousehold?.id) {
      // Update existing household
      await db.households.update(editingHousehold.id, householdData)
    } else {
      // Add new household
      const householdId = await db.households.add(householdData)
      // Initialize default categories and items
      await initializeHouseholdData(householdId as number)
    }

    await loadHouseholds()
    resetForm()
  }

  async function confirmDelete() {
    const household = deleteHousehold
    if (!household?.id) return

    try {
      await withSyncWrite(async () => {
        const categories = await db.householdCategories.where("householdId").equals(household.id).toArray()
        for (const category of categories) {
          if (!category.id) continue
          const items = await db.householdItems.where("categoryId").equals(category.id).toArray()
          for (const item of items) {
            if (item.id) await db.householdItems.delete(item.id)
          }
          await db.householdCategories.delete(category.id)
        }
        await db.households.delete(household.id)
      })
      clearTabSnapshots()

      await loadHouseholds()
      setDeleteHousehold(null)
      toast({
        title: "Deleted",
        description: `${household.name} and its budget data have been removed.`,
      })
    } catch (error) {
      console.error("Delete household failed", error)
      toast({
        title: "Could not delete",
        description: `Something went wrong removing ${household.name}. Try again.`,
        variant: "destructive",
      })
    }
  }

  function viewHouseholdBudget(householdId: number) {
    router.push(`/household-categories?householdId=${householdId}`)
  }

  async function confirmReset() {
    if (!resetHousehold?.id) return

    await withSyncWrite(async () => {
      const categories = await db.householdCategories.where("householdId").equals(resetHousehold.id).toArray()
      for (const category of categories) {
        if (!category.id) continue
        const items = await db.householdItems.where("categoryId").equals(category.id).toArray()
        for (const item of items) {
          if (item.id) await db.householdItems.delete(item.id)
        }
        await db.householdCategories.delete(category.id)
      }
    })
    clearTabSnapshots()

    await initializeHouseholdData(resetHousehold.id)

    setResetHousehold(null)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-secondary/5 to-accent/5">
      <div className="mx-auto max-w-4xl px-4 py-8">
        {/* Header */}
        <PageHeader />

        {/* Page Description */}
        <div className="mb-8">
          <h1 className="mb-3 font-serif text-xl font-bold text-foreground">Household Budget</h1>
          <p className="text-sm leading-relaxed text-muted-foreground">
            This page helps you map out the shared household costs over the year by entering them into clear categories such as housing, utilities, groceries, insurance and other shared essentials.
          </p>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            There&apos;s no pressure to be exact. Simply enter what you know today, and you can refine it anytime. This foundation sets you up for thoughtful forward planning and understanding your family&apos;s complete financial picture.
          </p>
        </div>

        {/* Add Household Button - Only show if no household exists */}
        {!isFormOpen && households.length === 0 && (
          <div className="mb-6">
            <Button onClick={() => setIsFormOpen(true)} size="lg" className="w-full gap-2">
              <Plus className="h-5 w-5" />
              Add Your Household
            </Button>
          </div>
        )}

        {/* Household Form */}
        {isFormOpen && (
          <Card className="mb-6 border-primary/20 shadow-lg">
            <CardHeader>
              <CardTitle>{editingHousehold ? "Edit Household Details" : "Add Household Details"}</CardTitle>
              <CardDescription>Enter your household information to start tracking shared expenses</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Household Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., Main Home"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="housingType">Housing Type *</Label>
                  <Select
                    value={formData.housingType}
                    onValueChange={(value) => setFormData({ ...formData, housingType: value })}
                  >
                    <SelectTrigger id="housingType">
                      <SelectValue placeholder="Select housing type" />
                    </SelectTrigger>
                    <SelectContent>
                      {housingTypes.map((type) => (
                        <SelectItem key={type} value={type}>
                          {type}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="members">Number of Members *</Label>
                  <Input
                    id="members"
                    type="number"
                    min="1"
                    max="20"
                    value={formData.members}
                    onChange={(e) => setFormData({ ...formData, members: e.target.value })}
                    placeholder="e.g., 4"
                    required
                  />
                </div>

                <div className="flex gap-2">
                  <Button type="submit" className="flex-1">
                    {editingHousehold ? "Update Household" : "Add Household"}
                  </Button>
                  <Button type="button" variant="outline" onClick={resetForm}>
                    Cancel
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Household Display */}
        {households.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-2xl font-semibold">Your Household</h2>
            {households.map((household) => (
              <Card key={household.id} className="transition-shadow hover:shadow-md">
                <CardContent className="flex items-center justify-between p-6">
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold text-primary">{household.name}</h3>
                    <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                      <span>{household.housingType}</span>
                      <span>-</span>
                      <span>{household.members} members</span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => viewHouseholdBudget(household.id!)} className="gap-2">
                      View Budget
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setResetHousehold(household)} title="Reset budget categories">
                      <RefreshCw className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleEdit(household)}
                      aria-label={`Edit household ${household.name}`}
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setDeleteHousehold(household)}
                      aria-label={`Delete household ${household.name}`}
                      className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Empty State */}
        {households.length === 0 && !isFormOpen && (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <button 
                type="button"
                onClick={() => setIsFormOpen(true)}
                className="mb-4 rounded-full bg-primary/10 p-4 transition-colors hover:bg-primary/20 cursor-pointer"
              >
                <Plus className="h-8 w-8 text-primary" />
              </button>
              <h3 className="mb-2 text-xl font-semibold">No household added yet</h3>
              <p className="mb-4 text-muted-foreground">
                Start by adding your household details to begin tracking shared expenses
              </p>
              <Button onClick={() => setIsFormOpen(true)} className="gap-2">
                <Plus className="h-4 w-4" />
                Add Your Household
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteHousehold} onOpenChange={(open) => { if (!open) setDeleteHousehold(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete {deleteHousehold?.name} and all associated budget data. This action
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(event) => {
                event.preventDefault()
                void confirmDelete()
              }}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reset Confirmation Dialog */}
      <AlertDialog open={!!resetHousehold} onOpenChange={() => setResetHousehold(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reset Budget Categories?</AlertDialogTitle>
            <AlertDialogDescription>
              This will reset all budget categories and items for {resetHousehold?.name} to the default template. Any custom entries or amounts you&apos;ve added will be lost. This is useful if you want to start fresh with the updated category structure.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmReset}>
              Reset Budget
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
