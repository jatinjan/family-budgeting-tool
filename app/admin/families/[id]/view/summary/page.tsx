'use client'

import { Fragment, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardTitle } from '@/components/ui/card'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { AlertCircle, ChevronDown, ChevronRight, Home, User, Users } from 'lucide-react'
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

export default function ConsultationSummaryPage() {
  const { data } = useConsultation()
  const [open, setOpen] = useState<Set<string>>(new Set())

  const childViews = data.children.map((child) => {
    const categories = categoriesForEntity(data.categories, 'child', child.id)
    return {
      id: child.id,
      name: child.name,
      icon: Users,
      categories,
      totals: calculateEntityPlanningTotals(categories, data.expenseItems, 'child'),
      entityType: 'child' as const,
    }
  })
  const adultViews = data.adults.map((adult) => {
    const categories = categoriesForEntity(data.categories, 'adult', adult.id)
    return {
      id: adult.id,
      name: adult.name,
      icon: User,
      categories,
      totals: calculateEntityPlanningTotals(categories, data.expenseItems, 'adult'),
      entityType: 'adult' as const,
    }
  })
  const householdView = data.household
    ? {
        id: data.household.id,
        name: data.household.name || 'Household',
        icon: Home,
        categories: categoriesForEntity(data.categories, 'household', data.household.id),
        totals: calculateEntityPlanningTotals(
          categoriesForEntity(data.categories, 'household', data.household.id),
          data.expenseItems,
          'household'
        ),
        entityType: 'household' as const,
      }
    : null

  const sections = [...childViews, ...adultViews, ...(householdView ? [householdView] : [])]
  const grandCurrent = sections.reduce((sum, section) => sum + section.totals.currentSituationTotal, 0)
  const grandForward = sections.reduce((sum, section) => sum + section.totals.forwardPlanningTotal, 0)
  const grandSavings = grandCurrent - grandForward

  function toggle(id: string) {
    setOpen((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  if (sections.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <AlertCircle className="mb-4 h-8 w-8 text-gray-400" />
          <h3 className="mb-2 text-lg font-semibold" style={{ color: BRAND.charcoal }}>
            No summary data yet
          </h3>
          <p className="text-sm text-gray-500">
            This family has not added household members or budget categories.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="mb-1 font-[Nunito] text-xl font-bold" style={{ color: BRAND.deepTeal }}>
          Summary
        </h1>
        <p className="text-sm text-gray-500">
          Current situation vs forward plan vs potential savings.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs uppercase tracking-wide text-gray-500">Current situation</p>
            <p className="text-2xl font-bold" style={{ color: BRAND.deepTeal }}>{formatCurrency(grandCurrent)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs uppercase tracking-wide text-gray-500">Forward plan</p>
            <p className="text-2xl font-bold text-purple-600">{formatCurrency(grandForward)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs uppercase tracking-wide text-gray-500">Potential savings</p>
            <p className="text-2xl font-bold" style={{ color: BRAND.teal }}>{formatCurrency(grandSavings)}</p>
          </CardContent>
        </Card>
      </div>

      {sections.map((section) => {
        const isOpen = open.has(section.id)
        const Icon = section.icon
        return (
          <Collapsible key={section.id} open={isOpen} onOpenChange={() => toggle(section.id)}>
            <Card>
              <CollapsibleTrigger asChild>
                <button className="flex w-full items-center justify-between p-4 text-left">
                  <div className="flex items-center gap-3">
                    {isOpen ? <ChevronDown className="h-4 w-4 text-gray-400" /> : <ChevronRight className="h-4 w-4 text-gray-400" />}
                    <Icon className="h-5 w-5" style={{ color: BRAND.teal }} />
                    <div>
                      <CardTitle className="text-base">{section.name}</CardTitle>
                      <p className="text-xs text-gray-500">
                        Current {formatCurrency(section.totals.currentSituationTotal)} · Plan{' '}
                        {formatCurrency(section.totals.forwardPlanningTotal)}
                      </p>
                    </div>
                  </div>
                  <span className="text-sm font-semibold" style={{ color: BRAND.teal }}>
                    {formatCurrency(section.totals.potentialSavings)} saved
                  </span>
                </button>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent className="pt-0">
                  <SummaryTable
                    categories={section.categories}
                    items={data.expenseItems}
                    entityType={section.entityType}
                    totals={section.totals}
                  />
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>
        )
      })}
    </div>
  )
}

function categoryForwardTotal(
  category: Category,
  categoryItems: ExpenseItem[],
  entityType: 'child' | 'adult' | 'household',
  totals: ReturnType<typeof calculateEntityPlanningTotals>
): number {
  if (category.is_percentage_based) return totals.miscForwardPlanning
  const forwardNames = forwardPlanningNames(entityType)
  const needsName = needsWantsName(entityType)

  return categoryItems.reduce((sum, item) => {
    if (category.name === needsName) {
      return item.need_want === 'need' ? sum + (item.adjusted_total ?? item.total) : sum
    }
    if (forwardNames.includes(category.name)) {
      return sum + (item.adjusted_total ?? item.total)
    }
    return sum + item.total
  }, 0)
}

function SummaryTable({
  categories,
  items,
  entityType,
  totals,
}: {
  categories: Category[]
  items: ExpenseItem[]
  entityType: 'child' | 'adult' | 'household'
  totals: ReturnType<typeof calculateEntityPlanningTotals>
}) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Category / item</TableHead>
          <TableHead className="text-right">Current</TableHead>
          <TableHead className="text-right">Forward</TableHead>
          <TableHead>Type</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {categories.map((category) => {
          const categoryItems = itemsForCategory(items, category.id)
          const current = category.is_percentage_based
            ? totals.miscCurrentSituation
            : categoryItems.reduce((sum, item) => sum + item.total, 0)
          const forward = categoryForwardTotal(category, categoryItems, entityType, totals)

          return (
            <Fragment key={category.id}>
              <TableRow className="bg-gray-50/80">
                <TableCell className="font-medium">{category.name}</TableCell>
                <TableCell className="text-right">{formatCurrency(current)}</TableCell>
                <TableCell className="text-right">{formatCurrency(forward)}</TableCell>
                <TableCell />
              </TableRow>
              {!category.is_percentage_based && categoryItems.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="pl-6 text-gray-600">{item.name}</TableCell>
                  <TableCell className="text-right text-gray-600">{formatCurrency(item.total)}</TableCell>
                  <TableCell className="text-right text-gray-600">
                    {formatCurrency(item.adjusted_total ?? item.total)}
                  </TableCell>
                  <TableCell>
                    {item.need_want ? (
                      <Badge
                        className="border-transparent text-xs"
                        style={{
                          backgroundColor: item.need_want === 'need' ? `${BRAND.teal}20` : `${BRAND.sand}30`,
                          color: item.need_want === 'need' ? BRAND.deepTeal : '#8a6837',
                        }}
                      >
                        {item.need_want === 'need' ? 'Need' : 'Want'}
                      </Badge>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </Fragment>
          )
        })}
      </TableBody>
    </Table>
  )
}
