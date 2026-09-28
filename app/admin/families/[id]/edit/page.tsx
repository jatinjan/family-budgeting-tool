"use client"

import { use, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowLeft, Baby, Home, Loader2, Lock, Pencil, Plus, Trash2, Users } from "lucide-react"
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
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { toast } from "@/hooks/use-toast"
import { useCoachLease } from "@/hooks/use-coach-lease"
import { useFamilyBudget, type FamilyBudget } from "@/hooks/use-family-budget"
import { endReasonMessage } from "@/lib/coach-lease"
import {
  LeaseEndedError,
  StaleRowError,
  addItem,
  createEntity,
  deleteEntity,
  deleteItem,
  updateCategoryPercentage,
  updateEntity,
  updateItem,
  type CoachEntityType,
  type ItemInput,
} from "@/lib/coach-budget-writer"
import { formatCurrency } from "@/lib/utils/formatters"
import { mapHousingTypeFromCloud, mapSchoolLevelFromCloud } from "@/lib/sync-field-map"
import type { Child, ExpenseItem, Household } from "@/types/database"
import { BRAND, CategoryBlock, EntityDialog, ItemDialog, type EntityRow } from "./coach-editor-parts"

type EntityDialogState = { type: CoachEntityType; initial: EntityRow | null } | null
type ItemDialogState = { categoryId: string; initial: ExpenseItem | null } | null
type ConfirmState = { title: string; description: string; action: () => Promise<unknown> } | null

function minutesLeft(expiresAt: string | null, now: number): number | null {
  if (!expiresAt) return null
  return Math.max(0, Math.ceil((Date.parse(expiresAt) - now) / 60_000))
}

function entitySummary(type: CoachEntityType, entity: EntityRow): string {
  if (type === "household") {
    const household = entity as Household
    const housing = mapHousingTypeFromCloud(household.housing_type)
    return [housing, `${household.members} member${household.members === 1 ? "" : "s"}`].filter(Boolean).join(" · ")
  }
  const parts = [entity && "age" in entity && entity.age != null ? `Age ${entity.age}` : "Age not set"]
  if (type === "child") parts.push(mapSchoolLevelFromCloud((entity as Child).school_level) || "School level not set")
  return parts.join(" · ")
}

export default function CoachEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: familyId } = use(params)
  const router = useRouter()
  const budget = useFamilyBudget(familyId)
  const lease = useCoachLease(familyId)
  const [entityDialog, setEntityDialog] = useState<EntityDialogState>(null)
  const [itemDialog, setItemDialog] = useState<ItemDialogState>(null)
  const [confirm, setConfirm] = useState<ConfirmState>(null)
  const [confirming, setConfirming] = useState(false)

  const canEdit = lease.canEdit

  async function write(work: () => Promise<unknown>, success?: string): Promise<boolean> {
    try {
      await work()
      if (success) toast({ title: success })
      await budget.refresh({ silent: true })
      return true
    } catch (error) {
      if (error instanceof LeaseEndedError) {
        await lease.refresh()
      } else if (error instanceof StaleRowError) {
        await budget.refresh({ silent: true })
      }
      toast({
        title: "Not saved",
        description: error instanceof Error ? error.message : "Something went wrong.",
        variant: "destructive",
      })
      return false
    }
  }

  async function handleDone() {
    await lease.end()
    router.push(`/admin/families/${familyId}`)
  }

  if ((budget.loading && !budget.data) || lease.loading) {
    return (
      <div className="mx-auto max-w-5xl space-y-4 px-4 py-8">
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  if (!budget.data) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center">
        <p className="mb-4 text-gray-600">{budget.error || "Family not found"}</p>
        <Button variant="outline" asChild>
          <Link href="/admin">Back to Admin</Link>
        </Button>
      </div>
    )
  }

  const data = budget.data
  const familyName = data.profile.family_name || data.profile.email
  const left = minutesLeft(lease.lease?.expires_at ?? null, lease.now)

  return (
    <div
      className="min-h-screen"
      style={{ background: `linear-gradient(180deg, ${BRAND.teal}08 0%, ${BRAND.sand}0a 100%)` }}
    >
      <div className="sticky top-0 z-20 border-b bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" asChild aria-label="Back to family">
              <Link href={`/admin/families/${familyId}`}>
                <ArrowLeft className="h-4 w-4" />
              </Link>
            </Button>
            <div>
              <h1 className="font-[Nunito] text-lg font-semibold" style={{ color: BRAND.charcoal }}>
                Editing {familyName}&apos;s budget
              </h1>
              <p className="text-xs text-muted-foreground">
                {canEdit
                  ? lease.lease?.mode === "assist"
                    ? `Family's app is view-only · ${left ?? "?"} min left`
                    : "Setting up before the family signs in"
                  : "Read-only"}
                {budget.live ? " · Live" : ""}
              </p>
            </div>
          </div>
          {canEdit ? (
            <Button onClick={handleDone} disabled={lease.busy} className="gap-2" style={{ backgroundColor: BRAND.deepTeal }}>
              {lease.busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Done
            </Button>
          ) : null}
        </div>
      </div>

      <div className="mx-auto max-w-5xl space-y-6 px-4 py-6">
        {!canEdit ? (
          <Card className="border-amber-200 bg-amber-50">
            <CardContent className="flex flex-wrap items-center justify-between gap-3 pt-6">
              <div className="flex items-center gap-3">
                <Lock className="h-5 w-5 text-amber-700" />
                <div>
                  <p className="font-medium text-amber-900">
                    {lease.heldByOther ? "Another coach is working with this family." : endReasonMessage(lease.lease)}
                  </p>
                  <p className="text-sm text-amber-800">You can look, but changes are turned off.</p>
                </div>
              </div>
              <Button variant="outline" asChild>
                <Link href={`/admin/families/${familyId}`}>Back to family</Link>
              </Button>
            </CardContent>
          </Card>
        ) : null}

        <Tabs defaultValue="household">
          <TabsList>
            <TabsTrigger value="household" className="gap-1">
              <Home className="h-4 w-4" /> Household
            </TabsTrigger>
            <TabsTrigger value="adults" className="gap-1">
              <Users className="h-4 w-4" /> Adults ({data.adults.length})
            </TabsTrigger>
            <TabsTrigger value="children" className="gap-1">
              <Baby className="h-4 w-4" /> Children ({data.children.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="household" className="space-y-4">
            {data.household ? (
              <EntitySection
                type="household"
                entity={data.household}
                data={data}
                canEdit={canEdit}
                onEdit={() => setEntityDialog({ type: "household", initial: data.household })}
                onDelete={null}
                onAddItem={(categoryId) => setItemDialog({ categoryId, initial: null })}
                onEditItem={(item) => setItemDialog({ categoryId: item.category_id, initial: item })}
                onDeleteItem={(item) =>
                  setConfirm({
                    title: `Delete ${item.name}?`,
                    description: "This removes the item from the family's budget.",
                    action: () => write(() => deleteItem(familyId, item), "Item deleted"),
                  })
                }
                onSavePercentage={(category, value) =>
                  write(() => updateCategoryPercentage(familyId, category.id, category.updated_at, value), "Saved")
                }
              />
            ) : (
              <EmptyState
                label="No household yet."
                canEdit={canEdit}
                action="Add household"
                onAdd={() => setEntityDialog({ type: "household", initial: null })}
              />
            )}
          </TabsContent>

          {(["adult", "child"] as const).map((type) => {
            const rows = type === "adult" ? data.adults : data.children
            return (
              <TabsContent key={type} value={type === "adult" ? "adults" : "children"} className="space-y-4">
                {canEdit ? (
                  <div className="flex justify-end">
                    <Button
                      variant="outline"
                      className="gap-1"
                      onClick={() => setEntityDialog({ type, initial: null })}
                    >
                      <Plus className="h-4 w-4" />
                      Add {type}
                    </Button>
                  </div>
                ) : null}
                {rows.length === 0 ? (
                  <EmptyState label={`No ${type === "adult" ? "adults" : "children"} yet.`} canEdit={false} />
                ) : (
                  rows.map((entity) => (
                    <EntitySection
                      key={entity.id}
                      type={type}
                      entity={entity}
                      data={data}
                      canEdit={canEdit}
                      onEdit={() => setEntityDialog({ type, initial: entity })}
                      onDelete={() =>
                        setConfirm({
                          title: `Delete ${entity.name}?`,
                          description: `This removes ${entity.name} and all of their budget items.`,
                          action: () => write(() => deleteEntity(familyId, type, entity.id), `${entity.name} deleted`),
                        })
                      }
                      onAddItem={(categoryId) => setItemDialog({ categoryId, initial: null })}
                      onEditItem={(item) => setItemDialog({ categoryId: item.category_id, initial: item })}
                      onDeleteItem={(item) =>
                        setConfirm({
                          title: `Delete ${item.name}?`,
                          description: "This removes the item from the family's budget.",
                          action: () => write(() => deleteItem(familyId, item), "Item deleted"),
                        })
                      }
                      onSavePercentage={(category, value) =>
                        write(
                          () => updateCategoryPercentage(familyId, category.id, category.updated_at, value),
                          "Saved",
                        )
                      }
                    />
                  ))
                )}
              </TabsContent>
            )
          })}
        </Tabs>
      </div>

      {entityDialog ? (
        <EntityDialog
          type={entityDialog.type}
          open
          initial={entityDialog.initial}
          onOpenChange={(open) => (!open ? setEntityDialog(null) : undefined)}
          onSubmit={(fields) => {
            const current = entityDialog.initial
            return current
              ? write(
                  () => updateEntity(familyId, entityDialog.type, current.id, current.updated_at, fields),
                  "Saved",
                )
              : write(() => createEntity(familyId, entityDialog.type, fields), "Added")
          }}
        />
      ) : null}

      {itemDialog ? (
        <ItemDialog
          open
          initial={itemDialog.initial}
          onOpenChange={(open) => (!open ? setItemDialog(null) : undefined)}
          onSubmit={(input: ItemInput) => {
            const current = itemDialog.initial
            return current
              ? write(() => updateItem(familyId, current, input), "Saved")
              : write(() => addItem(familyId, itemDialog.categoryId, input), "Item added")
          }}
        />
      ) : null}

      <AlertDialog open={Boolean(confirm)} onOpenChange={(open) => (!open ? setConfirm(null) : undefined)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{confirm?.title}</AlertDialogTitle>
            <AlertDialogDescription>{confirm?.description}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={confirming}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={confirming}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={async (event) => {
                event.preventDefault()
                if (!confirm) return
                setConfirming(true)
                await confirm.action()
                setConfirming(false)
                setConfirm(null)
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

function EmptyState({
  label,
  canEdit,
  action,
  onAdd,
}: {
  label: string
  canEdit: boolean
  action?: string
  onAdd?: () => void
}) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
        <p className="text-sm text-muted-foreground">{label}</p>
        {canEdit && action && onAdd ? (
          <Button onClick={onAdd} className="gap-1" style={{ backgroundColor: BRAND.deepTeal }}>
            <Plus className="h-4 w-4" />
            {action}
          </Button>
        ) : null}
      </CardContent>
    </Card>
  )
}

function EntitySection({
  type,
  entity,
  data,
  canEdit,
  onEdit,
  onDelete,
  onAddItem,
  onEditItem,
  onDeleteItem,
  onSavePercentage,
}: {
  type: CoachEntityType
  entity: EntityRow
  data: FamilyBudget
  canEdit: boolean
  onEdit: () => void
  onDelete: (() => void) | null
  onAddItem: (categoryId: string) => void
  onEditItem: (item: ExpenseItem) => void
  onDeleteItem: (item: ExpenseItem) => void
  onSavePercentage: (category: FamilyBudget["categories"][number], value: number) => Promise<boolean>
}) {
  const categories = useMemo(
    () =>
      data.categories
        .filter((category) => category.entity_type === type && category.entity_id === entity.id)
        .sort((a, b) => a.sort_order - b.sort_order),
    [data.categories, type, entity.id],
  )
  const itemsByCategory = useMemo(() => {
    const map = new Map<string, ExpenseItem[]>()
    for (const item of data.expenseItems) {
      const list = map.get(item.category_id) ?? []
      list.push(item)
      map.set(item.category_id, list)
    }
    return map
  }, [data.expenseItems])

  const fixedTotal = categories
    .filter((category) => !category.is_percentage_based)
    .reduce(
      (sum, category) =>
        sum + (itemsByCategory.get(category.id) ?? []).reduce((inner, item) => inner + (item.total || 0), 0),
      0,
    )
  const percentageTotal = categories
    .filter((category) => category.is_percentage_based)
    .reduce((sum, category) => sum + ((category.percentage_value || 0) / 100) * fixedTotal, 0)

  return (
    <Card>
      <CardContent className="space-y-4 pt-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold" style={{ color: BRAND.charcoal }}>
              {entity.name}
            </h2>
            <p className="text-sm text-muted-foreground">
              {entitySummary(type, entity)} · {formatCurrency(fixedTotal + percentageTotal)} / year
            </p>
          </div>
          {canEdit ? (
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="gap-1" onClick={onEdit}>
                <Pencil className="h-4 w-4" />
                Edit details
              </Button>
              {onDelete ? (
                <Button variant="outline" size="sm" className="gap-1 text-destructive" onClick={onDelete}>
                  <Trash2 className="h-4 w-4" />
                  Delete
                </Button>
              ) : null}
            </div>
          ) : null}
        </div>
        {categories.length === 0 ? (
          <p className="text-sm text-muted-foreground">No categories.</p>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {categories.map((category) => (
              <CategoryBlock
                key={category.id}
                category={category}
                items={itemsByCategory.get(category.id) ?? []}
                otherCategoriesTotal={fixedTotal}
                canEdit={canEdit}
                onAddItem={() => onAddItem(category.id)}
                onEditItem={onEditItem}
                onDeleteItem={onDeleteItem}
                onSavePercentage={(value) => onSavePercentage(category, value)}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
