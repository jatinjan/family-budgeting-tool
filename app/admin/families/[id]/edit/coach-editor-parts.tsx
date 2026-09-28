"use client"

import { useEffect, useState } from "react"
import { Loader2, Pencil, Plus, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { formatCurrency } from "@/lib/utils/formatters"
import { mapHousingTypeFromCloud, mapSchoolLevelFromCloud } from "@/lib/sync-field-map"
import type { BudgetFrequency } from "@/lib/budget-templates"
import type { CoachEntityType, ItemInput } from "@/lib/coach-budget-writer"
import type { Adult, Category, Child, ExpenseItem, Household } from "@/types/database"

export const BRAND = {
  teal: "#63A8A3",
  deepTeal: "#2F6B66",
  sand: "#EBC79A",
  charcoal: "#4A4A4A",
}

const SCHOOL_LEVELS = ["Preschool", "Primary School", "Secondary School", "High School", "University"]
const HOUSING_TYPES = [
  "House - Owned",
  "House - Rented",
  "Apartment - Owned",
  "Apartment - Rented",
  "Townhouse - Owned",
  "Townhouse - Rented",
  "Other",
]

const FREQUENCIES: { value: BudgetFrequency; label: string; quantity: number }[] = [
  { value: "weekly", label: "Weekly", quantity: 52 },
  { value: "fortnightly", label: "Fortnightly", quantity: 26 },
  { value: "monthly", label: "Monthly", quantity: 12 },
  { value: "bi-monthly", label: "Bi-Monthly", quantity: 6 },
  { value: "quarterly", label: "Quarterly", quantity: 4 },
  { value: "term", label: "Per Term", quantity: 4 },
  { value: "annual", label: "Annual", quantity: 1 },
]

const ENTITY_LABEL: Record<CoachEntityType, string> = {
  child: "child",
  adult: "adult",
  household: "household",
}

export type EntityRow = Child | Adult | Household

/* ------------------------------------------------------------------ */
/* Entity dialog                                                       */
/* ------------------------------------------------------------------ */

export function EntityDialog({
  type,
  open,
  initial,
  onOpenChange,
  onSubmit,
}: {
  type: CoachEntityType
  open: boolean
  initial: EntityRow | null
  onOpenChange: (open: boolean) => void
  onSubmit: (fields: Record<string, unknown>) => Promise<boolean>
}) {
  const [name, setName] = useState("")
  const [age, setAge] = useState("")
  const [schoolLevel, setSchoolLevel] = useState("")
  const [housingType, setHousingType] = useState("")
  const [members, setMembers] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    const row = initial as Partial<Child & Household> | null
    setName(row?.name ?? "")
    setAge(row?.age != null ? String(row.age) : "")
    setSchoolLevel(mapSchoolLevelFromCloud(row?.school_level))
    setHousingType(mapHousingTypeFromCloud(row?.housing_type))
    setMembers(row?.members != null ? String(row.members) : "")
    setError(null)
  }, [open, initial])

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (!name.trim()) return setError("Enter a name.")
    const fields: Record<string, unknown> = { name: name.trim() }
    if (type !== "household") {
      const parsedAge = Number.parseInt(age)
      if (age && (Number.isNaN(parsedAge) || parsedAge < 0 || parsedAge > 120)) {
        return setError("Enter an age between 0 and 120.")
      }
      fields.age = age ? parsedAge : null
    }
    if (type === "child") fields.school_level = schoolLevel || null
    if (type === "household") {
      const parsedMembers = Number.parseInt(members)
      if (Number.isNaN(parsedMembers) || parsedMembers < 1) return setError("Enter at least 1 member.")
      fields.housing_type = housingType || null
      fields.members = parsedMembers
    }
    setSaving(true)
    const ok = await onSubmit(fields)
    setSaving(false)
    if (ok) onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <DialogHeader>
            <DialogTitle>{initial ? `Edit ${ENTITY_LABEL[type]}` : `Add ${ENTITY_LABEL[type]}`}</DialogTitle>
            {!initial ? (
              <DialogDescription>Default categories are added so the family sees the usual budget.</DialogDescription>
            ) : null}
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="entity-name">{type === "household" ? "Household name" : "Name"}</Label>
            <Input id="entity-name" value={name} onChange={(event) => setName(event.target.value)} />
          </div>
          {type !== "household" ? (
            <div className="space-y-2">
              <Label htmlFor="entity-age">Age (leave blank if unknown)</Label>
              <Input
                id="entity-age"
                type="number"
                min={0}
                max={120}
                value={age}
                onChange={(event) => setAge(event.target.value)}
              />
            </div>
          ) : null}
          {type === "child" ? (
            <div className="space-y-2">
              <Label>School level</Label>
              <Select value={schoolLevel} onValueChange={setSchoolLevel}>
                <SelectTrigger>
                  <SelectValue placeholder="Select school level" />
                </SelectTrigger>
                <SelectContent>
                  {[...new Set([...SCHOOL_LEVELS, ...(schoolLevel ? [schoolLevel] : [])])].map((level) => (
                    <SelectItem key={level} value={level}>
                      {level}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : null}
          {type === "household" ? (
            <>
              <div className="space-y-2">
                <Label>Housing type</Label>
                <Select value={housingType} onValueChange={setHousingType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select housing type" />
                  </SelectTrigger>
                  <SelectContent>
                    {[...new Set([...HOUSING_TYPES, ...(housingType ? [housingType] : [])])].map((option) => (
                      <SelectItem key={option} value={option}>
                        {option}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="entity-members">Number of members</Label>
                <Input
                  id="entity-members"
                  type="number"
                  min={1}
                  value={members}
                  onChange={(event) => setMembers(event.target.value)}
                />
              </div>
            </>
          ) : null}
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving} className="gap-2" style={{ backgroundColor: BRAND.deepTeal }}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Save
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

/* ------------------------------------------------------------------ */
/* Item dialog                                                         */
/* ------------------------------------------------------------------ */

export function ItemDialog({
  open,
  initial,
  onOpenChange,
  onSubmit,
}: {
  open: boolean
  initial: ExpenseItem | null
  onOpenChange: (open: boolean) => void
  onSubmit: (input: ItemInput) => Promise<boolean>
}) {
  const [name, setName] = useState("")
  const [cost, setCost] = useState("")
  const [frequency, setFrequency] = useState<BudgetFrequency>("monthly")
  const [quantity, setQuantity] = useState("12")
  const [needWant, setNeedWant] = useState<"need" | "want" | "none">("none")
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    setName(initial?.name ?? "")
    setCost(initial ? String(initial.cost) : "")
    setFrequency((initial?.frequency as BudgetFrequency) ?? "monthly")
    setQuantity(initial ? String(initial.quantity) : "12")
    setNeedWant(initial?.need_want ?? "none")
    setError(null)
  }, [open, initial])

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    const parsedCost = Number.parseFloat(cost)
    const parsedQuantity = Number.parseInt(quantity)
    if (!name.trim()) return setError("Enter an item name.")
    if (Number.isNaN(parsedCost) || parsedCost < 0) return setError("Enter a cost of 0 or more.")
    if (Number.isNaN(parsedQuantity) || parsedQuantity < 0) return setError("Enter how many times a year.")
    setSaving(true)
    const ok = await onSubmit({
      name,
      cost: Math.round(parsedCost * 100) / 100,
      frequency,
      quantity: parsedQuantity,
      needWant: needWant === "none" ? null : needWant,
    })
    setSaving(false)
    if (ok) onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <DialogHeader>
            <DialogTitle>{initial ? "Edit item" : "Add item"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="item-name">Item</Label>
            <Input id="item-name" value={name} onChange={(event) => setName(event.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="item-cost">Cost each time ($)</Label>
              <Input
                id="item-cost"
                type="number"
                min={0}
                step="0.01"
                value={cost}
                onChange={(event) => setCost(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>How often</Label>
              <Select
                value={frequency}
                onValueChange={(value) => {
                  const next = value as BudgetFrequency
                  setFrequency(next)
                  setQuantity(String(FREQUENCIES.find((option) => option.value === next)?.quantity ?? 1))
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FREQUENCIES.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="item-quantity">Times per year</Label>
              <Input
                id="item-quantity"
                type="number"
                min={0}
                value={quantity}
                onChange={(event) => setQuantity(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Need or want</Label>
              <Select value={needWant} onValueChange={(value) => setNeedWant(value as typeof needWant)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Not set</SelectItem>
                  <SelectItem value="need">Need</SelectItem>
                  <SelectItem value="want">Want</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <p className="text-sm text-muted-foreground">
            Annual total:{" "}
            {formatCurrency((Number.parseFloat(cost) || 0) * (Number.parseInt(quantity) || 0))}
          </p>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving} className="gap-2" style={{ backgroundColor: BRAND.deepTeal }}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Save
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

/* ------------------------------------------------------------------ */
/* Category block                                                      */
/* ------------------------------------------------------------------ */

export function CategoryBlock({
  category,
  items,
  otherCategoriesTotal,
  canEdit,
  onAddItem,
  onEditItem,
  onDeleteItem,
  onSavePercentage,
}: {
  category: Category
  items: ExpenseItem[]
  otherCategoriesTotal: number
  canEdit: boolean
  onAddItem: () => void
  onEditItem: (item: ExpenseItem) => void
  onDeleteItem: (item: ExpenseItem) => void
  onSavePercentage: (value: number) => Promise<boolean>
}) {
  const [percentage, setPercentage] = useState(String(category.percentage_value ?? 15))
  const [savingPercentage, setSavingPercentage] = useState(false)

  useEffect(() => {
    setPercentage(String(category.percentage_value ?? 15))
  }, [category.percentage_value])

  if (category.is_percentage_based) {
    const value = Number.parseFloat(percentage)
    const dirty = !Number.isNaN(value) && value !== category.percentage_value
    return (
      <div className="rounded-lg border bg-white p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="font-medium" style={{ color: BRAND.charcoal }}>
              {category.name}
            </p>
            <p className="text-xs text-muted-foreground">
              {category.percentage_value}% of other expenses ·{" "}
              {formatCurrency(((category.percentage_value || 0) / 100) * otherCategoriesTotal)} / year
            </p>
          </div>
          {canEdit ? (
            <div className="flex items-center gap-2">
              <Input
                aria-label={`${category.name} percentage`}
                type="number"
                min={0}
                max={100}
                className="w-24"
                value={percentage}
                onChange={(event) => setPercentage(event.target.value)}
              />
              <span className="text-sm text-muted-foreground">%</span>
              <Button
                size="sm"
                disabled={!dirty || savingPercentage || value < 0 || value > 100}
                onClick={async () => {
                  setSavingPercentage(true)
                  await onSavePercentage(value)
                  setSavingPercentage(false)
                }}
                style={{ backgroundColor: BRAND.deepTeal }}
              >
                Save
              </Button>
            </div>
          ) : null}
        </div>
      </div>
    )
  }

  const total = items.reduce((sum, item) => sum + (item.total || 0), 0)

  return (
    <div className="rounded-lg border bg-white">
      <div className="flex items-center justify-between gap-3 border-b px-4 py-3">
        <div>
          <p className="font-medium" style={{ color: BRAND.charcoal }}>
            {category.name}
          </p>
          <p className="text-xs text-muted-foreground">{formatCurrency(total)} / year</p>
        </div>
        {canEdit ? (
          <Button size="sm" variant="outline" className="gap-1" onClick={onAddItem}>
            <Plus className="h-4 w-4" />
            Add item
          </Button>
        ) : null}
      </div>
      {items.length === 0 ? (
        <p className="px-4 py-3 text-sm text-muted-foreground">No items yet.</p>
      ) : (
        <ul className="divide-y">
          {items.map((item) => {
            const frequency = FREQUENCIES.find((option) => option.value === item.frequency)?.label ?? item.frequency
            return (
              <li key={item.id} className="flex items-center justify-between gap-3 px-4 py-2 text-sm">
                <div className="min-w-0">
                  <p className="truncate" style={{ color: BRAND.charcoal }}>
                    {item.name}
                    {item.need_want ? (
                      <span className="ml-2 rounded bg-gray-100 px-1.5 py-0.5 text-xs capitalize text-gray-600">
                        {item.need_want}
                      </span>
                    ) : null}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatCurrency(item.cost)} · {frequency} × {item.quantity}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <span className="mr-2 font-medium tabular-nums">{formatCurrency(item.total || 0)}</span>
                  {canEdit ? (
                    <>
                      <Button size="icon" variant="ghost" aria-label={`Edit ${item.name}`} onClick={() => onEditItem(item)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        aria-label={`Delete ${item.name}`}
                        onClick={() => onDeleteItem(item)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </>
                  ) : null}
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
