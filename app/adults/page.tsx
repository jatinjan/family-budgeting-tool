"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

import { db, initializeAdultData, type Adult } from "@/lib/db"
import { PageHeader } from "@/components/page-header"
import { useReloadOnSync } from "@/hooks/use-reload-on-sync"
import { toast } from "@/hooks/use-toast"
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

export default function AdultsPage() {
  const router = useRouter()
  const [adults, setAdults] = useState<Adult[]>([])
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingAdult, setEditingAdult] = useState<Adult | null>(null)
  const [deleteAdult, setDeleteAdult] = useState<Adult | null>(null)
  const [resetAdult, setResetAdult] = useState<Adult | null>(null)
  const [formData, setFormData] = useState({
    name: "",
    age: "",
  })

  useEffect(() => {
    loadAdults()
  }, [])
  useReloadOnSync(loadAdults)

  async function loadAdults() {
    const allAdults = await db.adults.toArray()
    setAdults(
      allAdults.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    )
  }

  function resetForm() {
    setFormData({ name: "", age: "" })
    setEditingAdult(null)
    setIsFormOpen(false)
  }

  function handleEdit(adult: Adult) {
    setEditingAdult(adult)
    setFormData({
      name: adult.name,
      age: adult.age.toString(),
    })
    setIsFormOpen(true)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!formData.name || !formData.age) {
      return
    }

    const adultData = {
      name: formData.name,
      age: Number.parseInt(formData.age),
      createdAt: new Date(),
    }

    if (editingAdult?.id) {
      // Update existing adult
      await db.adults.update(editingAdult.id, adultData)
    } else {
      // Add new adult
      const adultId = await db.adults.add(adultData)
      // Initialize default categories and items
      await initializeAdultData(adultId as number)
    }

    await loadAdults()
    resetForm()
  }

  async function confirmDelete() {
    const adult = deleteAdult
    if (!adult?.id) return

    try {
      const categories = await db.adultCategories.where("adultId").equals(adult.id).toArray()
      for (const category of categories) {
        if (category.id) {
          await db.adultItems.where("categoryId").equals(category.id).delete()
        }
      }
      await db.adultCategories.where("adultId").equals(adult.id).delete()
      await db.adults.delete(adult.id)

      await loadAdults()
      setDeleteAdult(null)
      toast({
        title: "Deleted",
        description: `${adult.name} and their budget data have been removed.`,
      })
    } catch (error) {
      console.error("Delete adult failed", error)
      toast({
        title: "Could not delete",
        description: `Something went wrong removing ${adult.name}. Try again.`,
        variant: "destructive",
      })
    }
  }

  function viewAdultBudget(adultId: number) {
    router.push(`/adult-categories?adultId=${adultId}`)
  }

  async function confirmReset() {
    if (!resetAdult?.id) return

    // Delete all existing categories and items for this adult
    const categories = await db.adultCategories.where("adultId").equals(resetAdult.id).toArray()
    for (const category of categories) {
      if (category.id) {
        await db.adultItems.where("categoryId").equals(category.id).delete()
      }
    }
    await db.adultCategories.where("adultId").equals(resetAdult.id).delete()

    // Reinitialize with the updated default categories
    await initializeAdultData(resetAdult.id)

    setResetAdult(null)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-secondary/5 to-accent/5">
      <div className="mx-auto max-w-4xl px-4 py-8">
        {/* Header */}
        <PageHeader />

        {/* Page Description */}
        <div className="mb-8">
          <h1 className="mb-3 font-serif text-xl font-bold text-foreground">Adult Budget</h1>
          <p className="text-sm leading-relaxed text-muted-foreground">
            This page helps you map out the known costs for each adult in your household over the year by entering them into clear categories such as personal care, subscriptions, hobbies and other essentials.
          </p>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            There&apos;s no pressure to be exact. Simply enter what you know today, and you can refine it anytime. This foundation sets you up for thoughtful forward planning, where you&apos;ll be able to explore adjustments and see how informed choices can create more balance.
          </p>
        </div>

        {/* Add Adult Button */}
        {!isFormOpen && (
          <div className="mb-6">
            <Button onClick={() => setIsFormOpen(true)} size="lg" className="w-full gap-2">
              <Plus className="h-5 w-5" />
              Add an Adult
            </Button>
          </div>
        )}

        {/* Adult Form */}
        {isFormOpen && (
          <Card className="mb-6 border-primary/20 shadow-lg">
            <CardHeader>
              <CardTitle>{editingAdult ? "Edit Adult Details" : "Add Adult Details"}</CardTitle>
              <CardDescription>Enter the adult&apos;s information to start tracking their expenses</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., Sarah"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="age">Age *</Label>
                  <Input
                    id="age"
                    type="number"
                    min="18"
                    max="120"
                    value={formData.age}
                    onChange={(e) => setFormData({ ...formData, age: e.target.value })}
                    placeholder="e.g., 35"
                    required
                  />
                </div>

                <div className="flex gap-2">
                  <Button type="submit" className="flex-1">
                    {editingAdult ? "Update Adult" : "Add Adult"}
                  </Button>
                  <Button type="button" variant="outline" onClick={resetForm}>
                    Cancel
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Adults List */}
        {adults.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-2xl font-semibold">Adults in Household</h2>
            {adults.map((adult) => (
              <Card key={adult.id} className="transition-shadow hover:shadow-md">
                <CardContent className="flex items-center justify-between p-6">
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold text-primary">{adult.name}</h3>
                    <div className="mt-1 text-sm text-muted-foreground">
                      <span>Age: {adult.age}</span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => viewAdultBudget(adult.id!)} className="gap-2">
                      View Budget
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setResetAdult(adult)} title="Reset budget categories">
                      <RefreshCw className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleEdit(adult)}
                      aria-label={`Edit adult ${adult.name}`}
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setDeleteAdult(adult)}
                      aria-label={`Delete adult ${adult.name}`}
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
        {adults.length === 0 && !isFormOpen && (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <button 
                type="button"
                onClick={() => setIsFormOpen(true)}
                className="mb-4 rounded-full bg-primary/10 p-4 transition-colors hover:bg-primary/20 cursor-pointer"
              >
                <Plus className="h-8 w-8 text-primary" />
              </button>
              <h3 className="mb-2 text-xl font-semibold">No adults added yet</h3>
              <p className="mb-4 text-muted-foreground">
                Start by adding adult details to begin tracking personal expenses
              </p>
              <Button onClick={() => setIsFormOpen(true)} className="gap-2">
                <Plus className="h-4 w-4" />
                Add Your First Adult
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteAdult} onOpenChange={(open) => { if (!open) setDeleteAdult(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete {deleteAdult?.name}&apos;s profile and all associated budget data. This action
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
      <AlertDialog open={!!resetAdult} onOpenChange={() => setResetAdult(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reset Budget Categories?</AlertDialogTitle>
            <AlertDialogDescription>
              This will reset all budget categories and items for {resetAdult?.name} to the default template. Any custom entries or amounts you&apos;ve added will be lost. This is useful if you want to start fresh with the updated category structure.
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
