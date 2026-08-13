'use client'

import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { AlertCircle, Home, User, Users } from 'lucide-react'
import { useConsultation } from '@/contexts/ConsultationContext'
import {
  calculateEntityPlanningTotals,
  categoriesForEntity,
  itemsForCategory,
} from '@/lib/consultation-totals'
import { forwardPlanningNames, needsWantsName } from '@/lib/planning-categories'
import { formatCurrency } from '@/lib/utils/formatters'
import type { Category, ExpenseItem } from '@/types/database'
import { BRAND } from '../consultation-ui'

export default function ConsultationPlanningPage() {
  const { data } = useConsultation()

  const childViews = data.children.map((child) => {
    const categories = categoriesForEntity(data.categories, 'child', child.id)
    return {
      name: child.name,
      categories,
      items: data.expenseItems,
      totals: calculateEntityPlanningTotals(categories, data.expenseItems, 'child'),
      entityType: 'child' as const,
    }
  })
  const adultViews = data.adults.map((adult) => {
    const categories = categoriesForEntity(data.categories, 'adult', adult.id)
    return {
      name: adult.name,
      categories,
      items: data.expenseItems,
      totals: calculateEntityPlanningTotals(categories, data.expenseItems, 'adult'),
      entityType: 'adult' as const,
    }
  })
  const householdView = data.household
    ? (() => {
        const categories = categoriesForEntity(data.categories, 'household', data.household.id)
        return {
          name: data.household.name || 'Household',
          categories,
          items: data.expenseItems,
          totals: calculateEntityPlanningTotals(categories, data.expenseItems, 'household'),
          entityType: 'household' as const,
        }
      })()
    : null

  const allViews = [...childViews, ...adultViews, ...(householdView ? [householdView] : [])]
  const grandCurrent = allViews.reduce((sum, view) => sum + view.totals.currentSituationTotal, 0)
  const grandForward = allViews.reduce((sum, view) => sum + view.totals.forwardPlanningTotal, 0)
  const grandSavings = grandCurrent - grandForward

  if (allViews.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <AlertCircle className="mb-4 h-8 w-8 text-gray-400" />
          <h3 className="mb-2 text-lg font-semibold" style={{ color: BRAND.charcoal }}>
            No planning data yet
          </h3>
          <p className="text-sm text-gray-500">
            Add children, adults, or household data to start planning.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="mb-1 font-[Nunito] text-xl font-bold" style={{ color: BRAND.deepTeal }}>
          Planning
        </h1>
        <p className="text-sm text-gray-500">
          Current situation vs forward plan. Need/want and adjustments are display-only.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <TotalCard label="Current situation" value={grandCurrent} color={BRAND.deepTeal} />
        <TotalCard label="Forward plan" value={grandForward} color="#7c3aed" />
        <TotalCard label="Potential savings" value={grandSavings} color={BRAND.teal} />
      </div>

      {childViews.map((view) => (
        <EntityPlanningCard key={view.name} title={view.name} icon={Users} view={view} />
      ))}
      {adultViews.map((view) => (
        <EntityPlanningCard key={view.name} title={view.name} icon={User} view={view} />
      ))}
      {householdView && (
        <EntityPlanningCard title={householdView.name} icon={Home} view={householdView} />
      )}
    </div>
  )
}

function TotalCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-xs uppercase tracking-wide text-gray-500">{label}</p>
        <p className="text-2xl font-bold" style={{ color }}>{formatCurrency(value)}</p>
      </CardContent>
    </Card>
  )
}

function EntityPlanningCard({
  title,
  icon: Icon,
  view,
}: {
  title: string
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>
  view: {
    entityType: 'child' | 'adult' | 'household'
    categories: Category[]
    items: ExpenseItem[]
    totals: ReturnType<typeof calculateEntityPlanningTotals>
  }
}) {
  const forwardNames = forwardPlanningNames(view.entityType)
  const needsName = needsWantsName(view.entityType)

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Icon className="h-5 w-5" style={{ color: BRAND.teal }} />
          <CardTitle>{title}</CardTitle>
        </div>
        <CardDescription>
          Current {formatCurrency(view.totals.currentSituationTotal)} · Plan{' '}
          {formatCurrency(view.totals.forwardPlanningTotal)} · Savings{' '}
          {formatCurrency(view.totals.potentialSavings)}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {view.categories.map((category) => {
          const items = itemsForCategory(view.items, category.id).filter((item) => item.cost > 0)
          const isForward = forwardNames.includes(category.name)
          const isNeeds = category.name === needsName
          const isMisc = category.is_percentage_based

          if (!isMisc && items.length === 0) return null

          if (isMisc) {
            return (
              <div key={category.id} className="rounded-lg border border-dashed p-3">
                <p className="font-medium" style={{ color: BRAND.charcoal }}>{category.name}</p>
                <p className="text-xs text-gray-500">{view.totals.miscPercentage}% of expenses</p>
                <div className="mt-2 grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-xs text-gray-500">Current</p>
                    <p className="font-semibold">{formatCurrency(view.totals.miscCurrentSituation)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Forward</p>
                    <p className="font-semibold">{formatCurrency(view.totals.miscForwardPlanning)}</p>
                  </div>
                </div>
              </div>
            )
          }

          return (
            <div key={category.id} className="rounded-lg border p-3">
              <p className="mb-2 font-medium" style={{ color: BRAND.charcoal }}>{category.name}</p>
              <div className="space-y-2">
                {items.map((item) => (
                  <div key={item.id} className="flex items-center justify-between gap-3 text-sm">
                    <div className="min-w-0">
                      <p className="truncate">{item.name}</p>
                      <p className="text-xs text-gray-500">{formatCurrency(item.total)} annual</p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      {isNeeds && item.need_want && (
                        <Badge
                          className="border-transparent text-xs"
                          style={{
                            backgroundColor: item.need_want === 'need' ? `${BRAND.teal}20` : `${BRAND.sand}30`,
                            color: item.need_want === 'need' ? BRAND.deepTeal : '#8a6837',
                          }}
                        >
                          {item.need_want === 'need' ? 'Need' : 'Want'}
                        </Badge>
                      )}
                      {isForward && (
                        <span className="text-sm font-medium">
                          {formatCurrency(item.adjusted_total ?? item.total)}
                        </span>
                      )}
                      {isNeeds && (
                        <span className="text-sm font-medium">
                          {formatCurrency(item.adjusted_total ?? item.total)}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}
