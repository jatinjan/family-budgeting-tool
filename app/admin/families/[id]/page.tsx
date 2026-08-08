"use client"

import { use, useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { supabase } from "@/lib/supabase"
import { formatDateShort, formatRelativeTime, formatCurrency } from "@/lib/utils/formatters"
import { calculateAnnualTotal, type Frequency } from "@/lib/utils/calculations"
import type { Profile, Child, Adult, Household, Category, ExpenseItem } from "@/types/database"
import {
  ArrowLeft,
  Star,
  Users,
  Baby,
  Home,
  Calendar,
  Clock,
  DollarSign,
  PiggyBank,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  AlertCircle,
  RefreshCw,
} from "lucide-react"

const BRAND = {
  teal: "#63A8A3",
  deepTeal: "#2F6B66",
  sand: "#EBC79A",
  charcoal: "#4A4A4A",
}

type OnboardingStatus = 'signed_up' | 'profile_complete' | 'budget_started' | 'plan_complete'

const ONBOARDING_LABELS: Record<OnboardingStatus, string> = {
  signed_up: 'Just Registered',
  profile_complete: 'Profile Complete',
  budget_started: 'Budget In Progress',
  plan_complete: 'Plan Complete',
}

const SCHOOL_LEVEL_LABELS: Record<string, string> = {
  preschool: 'Preschool',
  primary: 'Primary School',
  secondary: 'Secondary School',
  tertiary: 'Tertiary',
}

const HOUSING_TYPE_LABELS: Record<string, string> = {
  rent: 'Renting',
  own_mortgage: 'Own with Mortgage',
  own_outright: 'Own Outright',
  other: 'Other',
}

interface EntityBudget {
  entityId: string
  entityName: string
  entityType: 'child' | 'adult' | 'household'
  totalAnnual: number
  categories: CategoryBudget[]
}

interface CategoryBudget {
  categoryId: string
  name: string
  annualTotal: number
  itemCount: number
  completedItemCount: number
  items: ItemBudget[]
}

interface ItemBudget {
  name: string
  cost: number
  frequency: string
  quantity: number
  annualTotal: number
  needWant: 'need' | 'want' | null
}

interface FamilyData {
  profile: Profile
  children: Child[]
  adults: Adult[]
  household: Household | null
  categories: Category[]
  expenseItems: ExpenseItem[]
}

function onboardingStatusBadge(status: string) {
  const label = ONBOARDING_LABELS[status as OnboardingStatus] || status

  switch (status) {
    case "plan_complete":
      return (
        <Badge
          className="border-transparent"
          style={{ backgroundColor: `${BRAND.teal}20`, color: BRAND.deepTeal }}
        >
          <CheckCircle2 className="h-3 w-3 mr-1" />
          {label}
        </Badge>
      )
    case "budget_started":
      return (
        <Badge className="border-transparent bg-amber-100 text-amber-700">
          <Clock className="h-3 w-3 mr-1" />
          {label}
        </Badge>
      )
    case "profile_complete":
      return (
        <Badge className="border-transparent bg-sky-100 text-sky-700">
          {label}
        </Badge>
      )
    case "signed_up":
      return (
        <Badge className="border-transparent bg-gray-100 text-gray-600">
          <AlertCircle className="h-3 w-3 mr-1" />
          {label}
        </Badge>
      )
    default:
      return null
  }
}

function needWantBadge(needWant: "need" | "want" | null) {
  if (!needWant) return null
  if (needWant === "need") {
    return (
      <Badge
        className="border-transparent text-xs"
        style={{ backgroundColor: `${BRAND.teal}20`, color: BRAND.deepTeal }}
      >
        Need
      </Badge>
    )
  }
  return (
    <Badge
      className="border-transparent text-xs"
      style={{ backgroundColor: `${BRAND.sand}30`, color: "#8a6837" }}
    >
      Want
    </Badge>
  )
}

function CategorySection({
  category,
  entityColor,
}: {
  category: CategoryBudget
  entityColor: string
}) {
  const [isOpen, setIsOpen] = useState(false)
  const isEmpty = category.annualTotal === 0

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <button
          className={`w-full flex items-center justify-between p-3 rounded-lg transition-colors ${
            isEmpty ? "bg-gray-50 text-gray-400" : "bg-white hover:bg-gray-50"
          }`}
        >
          <div className="flex items-center gap-3">
            {isOpen ? (
              <ChevronDown className="h-4 w-4 text-gray-400" />
            ) : (
              <ChevronRight className="h-4 w-4 text-gray-400" />
            )}
            <span
              className={`font-medium ${isEmpty ? "text-gray-400" : ""}`}
              style={{ color: isEmpty ? undefined : BRAND.charcoal }}
            >
              {category.name}
            </span>
            {isEmpty && (
              <span className="text-xs text-gray-400">(not started)</span>
            )}
          </div>
          <div className="flex items-center gap-4">
            <span className="text-xs text-gray-500">
              {category.completedItemCount}/{category.itemCount} items
            </span>
            <span
              className={`font-semibold ${isEmpty ? "text-gray-400" : ""}`}
              style={{ color: isEmpty ? undefined : entityColor }}
            >
              {formatCurrency(category.annualTotal)}
            </span>
          </div>
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        {category.items.length > 0 ? (
          <div className="mt-2 ml-7 rounded-lg border border-gray-100 overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50/50 hover:bg-gray-50/50">
                  <TableHead className="text-xs" style={{ color: BRAND.charcoal }}>
                    Item
                  </TableHead>
                  <TableHead className="text-xs text-right" style={{ color: BRAND.charcoal }}>
                    Cost
                  </TableHead>
                  <TableHead className="text-xs" style={{ color: BRAND.charcoal }}>
                    Frequency
                  </TableHead>
                  <TableHead className="text-xs text-right" style={{ color: BRAND.charcoal }}>
                    Annual
                  </TableHead>
                  <TableHead className="text-xs" style={{ color: BRAND.charcoal }}>
                    Type
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {category.items.map((item, idx) => (
                  <TableRow key={idx} className="hover:bg-gray-50/50">
                    <TableCell className="text-sm" style={{ color: BRAND.charcoal }}>
                      {item.name}
                    </TableCell>
                    <TableCell className="text-sm text-right text-gray-500">
                      {formatCurrency(item.cost)}
                    </TableCell>
                    <TableCell className="text-sm text-gray-500 capitalize">
                      {item.frequency}
                    </TableCell>
                    <TableCell
                      className="text-sm text-right font-medium"
                      style={{ color: BRAND.charcoal }}
                    >
                      {formatCurrency(item.annualTotal)}
                    </TableCell>
                    <TableCell>{needWantBadge(item.needWant)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="mt-2 ml-7 p-4 rounded-lg bg-gray-50 text-center text-sm text-gray-400">
            No items entered yet
          </div>
        )}
      </CollapsibleContent>
    </Collapsible>
  )
}

function EntityBudgetSection({
  entity,
  icon: Icon,
  color,
  defaultOpen = false,
}: {
  entity: EntityBudget
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>
  color: string
  defaultOpen?: boolean
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen)

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <button className="w-full flex items-center justify-between p-4 rounded-xl bg-white border border-gray-200 hover:border-gray-300 transition-colors">
          <div className="flex items-center gap-3">
            <div
              className="flex h-10 w-10 items-center justify-center rounded-lg"
              style={{ backgroundColor: `${color}15` }}
            >
              <Icon className="h-5 w-5" style={{ color }} />
            </div>
            <div className="text-left">
              <h3 className="font-semibold" style={{ color: BRAND.charcoal }}>
                {entity.entityName}
              </h3>
              <p className="text-xs text-gray-500">
                {entity.categories.length} categories
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-lg font-bold" style={{ color }}>
                {formatCurrency(entity.totalAnnual)}
              </p>
              <p className="text-xs text-gray-500">per year</p>
            </div>
            {isOpen ? (
              <ChevronDown className="h-5 w-5 text-gray-400" />
            ) : (
              <ChevronRight className="h-5 w-5 text-gray-400" />
            )}
          </div>
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="mt-3 space-y-2 pl-2">
          {entity.categories.map((cat, idx) => (
            <CategorySection key={idx} category={cat} entityColor={color} />
          ))}
        </div>
      </CollapsibleContent>
    </Collapsible>
  )
}

function buildEntityBudget(
  entityId: string,
  entityName: string,
  entityType: 'child' | 'adult' | 'household',
  categories: Category[],
  expenseItems: ExpenseItem[]
): EntityBudget {
  const entityCategories = categories.filter(
    cat => cat.entity_id === entityId && cat.entity_type === entityType
  )

  const categoryBudgets: CategoryBudget[] = entityCategories.map(cat => {
    const items = expenseItems.filter(item => item.category_id === cat.id)
    const itemBudgets: ItemBudget[] = items.map(item => {
      const annualTotal = calculateAnnualTotal(
        item.cost,
        item.frequency as Frequency,
        item.quantity
      )
      return {
        name: item.name,
        cost: item.cost,
        frequency: item.frequency,
        quantity: item.quantity,
        annualTotal,
        needWant: item.need_want as 'need' | 'want' | null,
      }
    })

    const annualTotal = itemBudgets.reduce((sum, item) => sum + item.annualTotal, 0)
    const completedItemCount = items.filter(item => item.cost > 0).length

    return {
      categoryId: cat.id,
      name: cat.name,
      annualTotal,
      itemCount: items.length,
      completedItemCount,
      items: itemBudgets,
    }
  })

  const totalAnnual = categoryBudgets.reduce((sum, cat) => sum + cat.annualTotal, 0)

  return {
    entityId,
    entityName,
    entityType,
    totalAnnual,
    categories: categoryBudgets,
  }
}

export default function FamilyDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const router = useRouter()

  const [familyData, setFamilyData] = useState<FamilyData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchFamilyData = useCallback(async () => {
    setLoading(true)
    try {
      const [
        profileRes,
        childrenRes,
        adultsRes,
        householdRes,
        categoriesRes,
        itemsRes,
      ] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', id).single(),
        supabase.from('children').select('*').eq('user_id', id).order('name'),
        supabase.from('adults').select('*').eq('user_id', id).order('name'),
        supabase.from('households').select('*').eq('user_id', id).maybeSingle(),
        supabase.from('categories').select('*').eq('user_id', id),
        supabase.from('expense_items').select('*').eq('user_id', id),
      ])

      if (profileRes.error) throw profileRes.error

      setFamilyData({
        profile: profileRes.data,
        children: childrenRes.data || [],
        adults: adultsRes.data || [],
        household: householdRes.data || null,
        categories: categoriesRes.data || [],
        expenseItems: itemsRes.data || [],
      })
      setError(null)
    } catch (err) {
      console.error('Error fetching family data:', err)
      setError('Failed to load family data')
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    fetchFamilyData()
  }, [fetchFamilyData])

  if (loading) {
    return (
      <div
        className="min-h-screen"
        style={{
          background: `linear-gradient(180deg, ${BRAND.teal}08 0%, ${BRAND.sand}0a 100%)`,
        }}
      >
        <div className="mx-auto max-w-4xl px-4 py-8">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push("/admin")}
            className="mb-4 gap-2 -ml-2"
            style={{ color: BRAND.charcoal }}
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Families
          </Button>
          <div className="space-y-4">
            <Skeleton className="h-12 w-2/3" />
            <Skeleton className="h-6 w-1/3" />
            <Skeleton className="h-48 w-full" />
          </div>
        </div>
      </div>
    )
  }

  if (error || !familyData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="pt-6 text-center">
            <AlertCircle className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <h2 className="text-lg font-semibold mb-2" style={{ color: BRAND.charcoal }}>
              {error || 'Family not found'}
            </h2>
            <p className="text-gray-500 mb-4">
              Unable to load family data. Please try again.
            </p>
            <div className="flex gap-2 justify-center">
              <Button
                variant="outline"
                onClick={() => router.push("/admin")}
                className="gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Admin
              </Button>
              <Button onClick={fetchFamilyData} className="gap-2" style={{ backgroundColor: BRAND.deepTeal }}>
                <RefreshCw className="h-4 w-4" />
                Retry
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  const { profile, children, adults, household, categories, expenseItems } = familyData

  const childBudgets = children.map(child =>
    buildEntityBudget(child.id, child.name, 'child', categories, expenseItems)
  )

  const adultBudgets = adults.map(adult =>
    buildEntityBudget(adult.id, adult.name, 'adult', categories, expenseItems)
  )

  const householdBudget = household
    ? buildEntityBudget(household.id, household.name || 'Household', 'household', categories, expenseItems)
    : null

  const totalAnnual =
    childBudgets.reduce((sum, b) => sum + b.totalAnnual, 0) +
    adultBudgets.reduce((sum, b) => sum + b.totalAnnual, 0) +
    (householdBudget?.totalAnnual || 0)

  const fortnightlyAmount = Math.round(totalAnnual / 26)

  const allCategoryBudgets = [
    ...childBudgets.flatMap(b => b.categories),
    ...adultBudgets.flatMap(b => b.categories),
    ...(householdBudget?.categories || []),
  ]
  const categoriesTotal = allCategoryBudgets.length
  const categoriesCompleted = allCategoryBudgets.filter(c => c.annualTotal > 0).length

  const hasBudgetData = totalAnnual > 0 || categories.length > 0

  return (
    <div
      className="min-h-screen"
      style={{
        background: `linear-gradient(180deg, ${BRAND.teal}08 0%, ${BRAND.sand}0a 100%)`,
      }}
    >
      <div className="mx-auto max-w-4xl px-4 py-8">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push("/admin")}
          className="mb-4 gap-2 -ml-2"
          style={{ color: BRAND.charcoal }}
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Families
        </Button>

        <div className="mb-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h1
                className="font-[Nunito] text-2xl font-bold mb-2"
                style={{ color: BRAND.deepTeal }}
              >
                {profile.family_name || 'Unnamed Family'}
              </h1>
              <p className="text-gray-500 mb-3">{profile.email}</p>
              <div className="flex flex-wrap items-center gap-2">
                {profile.promo_code_used && (
                  <Badge
                    className="gap-1 border-transparent font-mono"
                    style={{ backgroundColor: `${BRAND.sand}40`, color: "#8a6837" }}
                  >
                    <Star className="h-3 w-3" />
                    {profile.promo_code_used}
                  </Badge>
                )}
                {onboardingStatusBadge(profile.onboarding_status)}
              </div>
            </div>
            <div className="text-sm text-gray-500 sm:text-right">
              <div className="flex items-center gap-1.5 sm:justify-end">
                <Calendar className="h-4 w-4" />
                Signed up {formatDateShort(profile.signed_up_at)}
              </div>
              <div className="flex items-center gap-1.5 mt-1 sm:justify-end">
                <Clock className="h-4 w-4" />
                Last active {formatRelativeTime(profile.last_active_at)}
              </div>
            </div>
          </div>
        </div>

        <Card className="mb-6 border-gray-200 shadow-sm">
          <CardHeader>
            <CardTitle
              className="font-[Nunito] text-lg font-semibold"
              style={{ color: BRAND.deepTeal }}
            >
              Family Profile
            </CardTitle>
            <CardDescription>Family members and housing information</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-6 sm:grid-cols-2">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Users className="h-4 w-4" style={{ color: BRAND.teal }} />
                  <span className="text-sm font-medium" style={{ color: BRAND.charcoal }}>
                    Adults ({adults.length})
                  </span>
                </div>
                <div className="space-y-1">
                  {adults.length > 0 ? (
                    adults.map((adult) => (
                      <div key={adult.id} className="text-sm text-gray-600">
                        {adult.name}{adult.age ? `, ${adult.age}` : ''}
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-gray-400">No adults added</p>
                  )}
                </div>
              </div>

              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Baby className="h-4 w-4" style={{ color: BRAND.sand }} />
                  <span className="text-sm font-medium" style={{ color: BRAND.charcoal }}>
                    Children ({children.length})
                  </span>
                </div>
                <div className="space-y-1">
                  {children.length > 0 ? (
                    children.map((child) => (
                      <div key={child.id} className="text-sm text-gray-600">
                        {child.name}{child.age ? `, ${child.age}` : ''}{child.school_level ? ` — ${SCHOOL_LEVEL_LABELS[child.school_level] || child.school_level}` : ''}
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-gray-400">No children added</p>
                  )}
                </div>
              </div>

              {household && (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Home className="h-4 w-4" style={{ color: BRAND.deepTeal }} />
                    <span className="text-sm font-medium" style={{ color: BRAND.charcoal }}>
                      Housing
                    </span>
                  </div>
                  <p className="text-sm text-gray-600">
                    {household.housing_type ? HOUSING_TYPE_LABELS[household.housing_type] || household.housing_type : 'Not specified'}
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {hasBudgetData && (
          <>
            <div className="grid gap-4 sm:grid-cols-3 mb-6">
              <Card className="border-gray-200 shadow-sm">
                <CardContent className="flex items-center gap-4 p-4">
                  <div
                    className="flex h-12 w-12 items-center justify-center rounded-xl"
                    style={{ backgroundColor: `${BRAND.deepTeal}15` }}
                  >
                    <DollarSign className="h-6 w-6" style={{ color: BRAND.deepTeal }} />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wide">
                      Total Annual Plan
                    </p>
                    <p
                      className="text-2xl font-bold"
                      style={{ color: BRAND.deepTeal }}
                    >
                      {formatCurrency(totalAnnual)}
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-gray-200 shadow-sm">
                <CardContent className="flex items-center gap-4 p-4">
                  <div
                    className="flex h-12 w-12 items-center justify-center rounded-xl"
                    style={{ backgroundColor: `${BRAND.sand}25` }}
                  >
                    <PiggyBank className="h-6 w-6" style={{ color: "#8a6837" }} />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wide">
                      Per Fortnight
                    </p>
                    <p className="text-2xl font-bold" style={{ color: "#8a6837" }}>
                      {formatCurrency(fortnightlyAmount)}
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-gray-200 shadow-sm">
                <CardContent className="flex items-center gap-4 p-4">
                  <div
                    className="flex h-12 w-12 items-center justify-center rounded-xl"
                    style={{ backgroundColor: `${BRAND.teal}15` }}
                  >
                    <CheckCircle2 className="h-6 w-6" style={{ color: BRAND.teal }} />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wide">
                      Categories Done
                    </p>
                    <p className="text-2xl font-bold" style={{ color: BRAND.teal }}>
                      {categoriesCompleted}
                      <span className="text-base font-normal text-gray-400">
                        {" "}
                        / {categoriesTotal}
                      </span>
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {categoriesTotal > 0 && categoriesCompleted < categoriesTotal * 0.5 && (
              <Card
                className="mb-6 border-transparent"
                style={{ backgroundColor: `${BRAND.sand}20` }}
              >
                <CardContent className="flex items-center gap-3 py-3">
                  <AlertCircle className="h-5 w-5 shrink-0" style={{ color: "#8a6837" }} />
                  <p className="text-sm" style={{ color: "#8a6837" }}>
                    <strong>Coaching opportunity:</strong> This family has only completed{" "}
                    {Math.round((categoriesCompleted / categoriesTotal) * 100)}%
                    of their budget. Consider reaching out to offer support.
                  </p>
                </CardContent>
              </Card>
            )}

            <Card className="border-gray-200 shadow-sm">
              <CardHeader>
                <CardTitle
                  className="font-[Nunito] text-lg font-semibold"
                  style={{ color: BRAND.deepTeal }}
                >
                  Budget Breakdown
                </CardTitle>
                <CardDescription>
                  Expand each section to see category and item details
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {childBudgets.length > 0 && (
                  <div>
                    <h3
                      className="text-sm font-semibold uppercase tracking-wide mb-3"
                      style={{ color: BRAND.charcoal }}
                    >
                      Children
                    </h3>
                    <div className="space-y-3">
                      {childBudgets.map((child, idx) => (
                        <EntityBudgetSection
                          key={child.entityId}
                          entity={child}
                          icon={Baby}
                          color={BRAND.sand}
                          defaultOpen={idx === 0}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {adultBudgets.length > 0 && (
                  <div>
                    <h3
                      className="text-sm font-semibold uppercase tracking-wide mb-3"
                      style={{ color: BRAND.charcoal }}
                    >
                      Adults
                    </h3>
                    <div className="space-y-3">
                      {adultBudgets.map((adult) => (
                        <EntityBudgetSection
                          key={adult.entityId}
                          entity={adult}
                          icon={Users}
                          color={BRAND.teal}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {householdBudget && (
                  <div>
                    <h3
                      className="text-sm font-semibold uppercase tracking-wide mb-3"
                      style={{ color: BRAND.charcoal }}
                    >
                      Household
                    </h3>
                    <EntityBudgetSection
                      entity={householdBudget}
                      icon={Home}
                      color={BRAND.deepTeal}
                    />
                  </div>
                )}

                {!householdBudget && household && (
                  <div>
                    <h3
                      className="text-sm font-semibold uppercase tracking-wide mb-3"
                      style={{ color: BRAND.charcoal }}
                    >
                      Household
                    </h3>
                    <div className="p-6 rounded-xl bg-gray-50 text-center">
                      <Home className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                      <p className="text-sm text-gray-400">
                        Household budget not yet created
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}

        {!hasBudgetData && (
          <Card className="border-gray-200 shadow-sm">
            <CardContent className="py-12 text-center">
              <DollarSign className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <h3 className="text-lg font-semibold mb-2" style={{ color: BRAND.charcoal }}>
                No budget data yet
              </h3>
              <p className="text-gray-500 mb-4">
                This family has signed up but hasn't started entering their budget.
              </p>
              <Badge
                className="border-transparent"
                style={{ backgroundColor: `${BRAND.sand}30`, color: "#8a6837" }}
              >
                <AlertCircle className="h-3 w-3 mr-1" />
                Coaching opportunity
              </Badge>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
