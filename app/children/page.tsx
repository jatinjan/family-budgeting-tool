"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { db, initializeChildData, type Child } from "@/lib/db"
import { APP_CONFIG } from "@/lib/config"
import { PageHeader } from "@/components/page-header"
import { useReloadOnSync } from "@/hooks/use-reload-on-sync"
import { toast } from "@/hooks/use-toast"
import { Plus, Edit2, Trash2 } from "lucide-react"
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

const schoolLevels = ["Preschool", "Primary School", "Secondary School", "High School", "University"]

export default function HomePage() {
  const router = useRouter()
  const [children, setChildren] = useState<Child[]>([])
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingChild, setEditingChild] = useState<Child | null>(null)
  const [deleteChild, setDeleteChild] = useState<Child | null>(null)
  const [formData, setFormData] = useState({
    name: "",
    age: "",
    schoolLevel: "",
  })

  useEffect(() => {
    loadChildren()
  }, [])
  useReloadOnSync(loadChildren)

  async function loadChildren() {
    const allChildren = await db.children.toArray()
    setChildren(
      allChildren.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    )
  }

  function resetForm() {
    setFormData({ name: "", age: "", schoolLevel: "" })
    setEditingChild(null)
    setIsFormOpen(false)
  }

  function handleEdit(child: Child) {
    setEditingChild(child)
    setFormData({
      name: child.name,
      age: child.age.toString(),
      schoolLevel: child.schoolLevel,
    })
    setIsFormOpen(true)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!formData.name || !formData.age || !formData.schoolLevel) {
      return
    }

    const childData = {
      name: formData.name,
      age: Number.parseInt(formData.age),
      schoolLevel: formData.schoolLevel,
      createdAt: new Date(),
    }

    if (editingChild?.id) {
      // Update existing child
      await db.children.update(editingChild.id, childData)
    } else {
      // Add new child
      const childId = await db.children.add(childData)
      // Initialize default categories and items
      await initializeChildData(childId as number)
    }

    await loadChildren()
    resetForm()
  }

  async function confirmDelete() {
    const child = deleteChild
    if (!child?.id) return

    try {
      const categories = await db.categories.where("childId").equals(child.id).toArray()
      for (const category of categories) {
        if (category.id) {
          await db.items.where("categoryId").equals(category.id).delete()
        }
      }
      await db.categories.where("childId").equals(child.id).delete()
      await db.children.delete(child.id)

      await loadChildren()
      setDeleteChild(null)
      toast({
        title: "Deleted",
        description: `${child.name} and their budget data have been removed.`,
      })
    } catch (error) {
      console.error("Delete child failed", error)
      toast({
        title: "Could not delete",
        description: `Something went wrong removing ${child.name}. Try again.`,
        variant: "destructive",
      })
    }
  }

  function viewChildBudget(childId: number) {
    router.push(`/categories?childId=${childId}`)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-secondary/5 to-accent/5">
      <div className="mx-auto max-w-4xl px-4 py-8">
        {/* Header */}
        <PageHeader />

        {/* Page Description */}
        <div className="mb-8">
          <h1 className="mb-3 font-serif text-xl font-bold text-foreground">Budget</h1>
          <p className="text-sm leading-relaxed text-muted-foreground">
            This page helps you map out the known costs for your child over the year by entering them into clear categories such as education, extracurricular activities, clothing and other essentials. Adding the amounts you already expect to spend gives you a grounded starting point for understanding your family's financial picture.
          </p>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            There's no pressure to be exact. Simply enter what you know today, and you can refine it anytime. This foundation sets you up for thoughtful forward planning, where you'll be able to explore adjustments and see how informed choices can create more balance and ease in the year ahead.
          </p>
        </div>

        {/* Add Child Button */}
        {!isFormOpen && (
          <div className="mb-6">
            <Button onClick={() => setIsFormOpen(true)} size="lg" className="w-full gap-2">
              <Plus className="h-5 w-5" />
              Add a Child
            </Button>
          </div>
        )}

        {/* Child Form */}
        {isFormOpen && (
          <Card className="mb-6 border-primary/20 shadow-lg">
            <CardHeader>
              <CardTitle>{editingChild ? "Edit Child Details" : "Add Child Details"}</CardTitle>
              <CardDescription>Enter your child's information to start tracking their expenses</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Child's Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., Emma"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="age">Age *</Label>
                  <Input
                    id="age"
                    type="number"
                    min="0"
                    max="25"
                    value={formData.age}
                    onChange={(e) => setFormData({ ...formData, age: e.target.value })}
                    placeholder="e.g., 8"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="schoolLevel">School Level *</Label>
                  <Select
                    value={formData.schoolLevel}
                    onValueChange={(value) => setFormData({ ...formData, schoolLevel: value })}
                  >
                    <SelectTrigger id="schoolLevel">
                      <SelectValue placeholder="Select school level" />
                    </SelectTrigger>
                    <SelectContent>
                      {schoolLevels.map((level) => (
                        <SelectItem key={level} value={level}>
                          {level}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex gap-2">
                  <Button type="submit" className="flex-1">
                    {editingChild ? "Update Child" : "Add Child"}
                  </Button>
                  <Button type="button" variant="outline" onClick={resetForm}>
                    Cancel
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Children List */}
        {children.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-2xl font-semibold">Your Children</h2>
            {children.map((child) => (
              <Card key={child.id} className="transition-shadow hover:shadow-md">
                <CardContent className="flex items-center justify-between p-6">
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold text-primary">{child.name}</h3>
                    <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                      <span>Age: {child.age}</span>
                      <span>•</span>
                      <span>{child.schoolLevel}</span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => viewChildBudget(child.id!)} className="gap-2">
                      View Budget
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleEdit(child)}
                      aria-label={`Edit child ${child.name}`}
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setDeleteChild(child)}
                      aria-label={`Delete child ${child.name}`}
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
        {children.length === 0 && !isFormOpen && (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <button 
                type="button"
                onClick={() => setIsFormOpen(true)}
                className="mb-4 rounded-full bg-primary/10 p-4 transition-colors hover:bg-primary/20 cursor-pointer"
              >
                <Plus className="h-8 w-8 text-primary" />
              </button>
              <h3 className="mb-2 text-xl font-semibold">No children added yet</h3>
              <p className="mb-4 text-muted-foreground">
                Start by adding your child's details to begin tracking expenses
              </p>
              <Button onClick={() => setIsFormOpen(true)} className="gap-2">
                <Plus className="h-4 w-4" />
                Add Your First Child
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteChild} onOpenChange={(open) => { if (!open) setDeleteChild(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete {deleteChild?.name}'s profile and all associated budget data. This action
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
    </div>
  )
}
