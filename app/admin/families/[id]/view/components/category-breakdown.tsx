'use client'

import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { useConsultation } from '@/contexts/ConsultationContext'
import { categoriesForEntity, itemsForCategory } from '@/lib/consultation-totals'
import { calculateAnnualTotal, FREQUENCY_LABELS, type Frequency } from '@/lib/utils/calculations'
import { formatCurrency } from '@/lib/utils/formatters'
import type { Category, ExpenseItem } from '@/types/database'
import { BRAND } from '../consultation-ui'

function itemAnnual(item: ExpenseItem): number {
  if (item.total) return item.total
  const frequency = item.frequency as Frequency
  if (FREQUENCY_LABELS[frequency]) {
    return calculateAnnualTotal(item.cost, frequency, item.quantity)
  }
  return 0
}

function frequencyLabel(frequency: string): string {
  return FREQUENCY_LABELS[frequency as Frequency] || frequency
}

function NeedWantBadge({ value }: { value: 'need' | 'want' | null }) {
  if (!value) return <span className="text-gray-400">—</span>
  return (
    <Badge
      className="border-transparent text-xs"
      style={{
        backgroundColor: value === 'need' ? `${BRAND.teal}20` : `${BRAND.sand}30`,
        color: value === 'need' ? BRAND.deepTeal : '#8a6837',
      }}
    >
      {value === 'need' ? 'Need' : 'Want'}
    </Badge>
  )
}

function CategoryBlock({ category, items }: { category: Category; items: ExpenseItem[] }) {
  const [isOpen, setIsOpen] = useState(false)
  const annualTotal = category.is_percentage_based
    ? 0
    : items.reduce((sum, item) => sum + itemAnnual(item), 0)
  const completed = items.filter((item) => item.cost > 0).length
  const isEmpty = !category.is_percentage_based && annualTotal === 0

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <button
          className={`flex w-full items-center justify-between rounded-lg p-3 ${
            isEmpty ? 'bg-gray-50 text-gray-400' : 'bg-white hover:bg-gray-50'
          }`}
        >
          <div className="flex items-center gap-3">
            {isOpen ? <ChevronDown className="h-4 w-4 text-gray-400" /> : <ChevronRight className="h-4 w-4 text-gray-400" />}
            <span className="font-medium" style={{ color: isEmpty ? undefined : BRAND.charcoal }}>
              {category.name}
            </span>
            {isEmpty && <span className="text-xs text-gray-400">(not started)</span>}
          </div>
          <div className="flex items-center gap-4">
            <span className="text-xs text-gray-500">
              {completed}/{items.length} items
            </span>
            {!category.is_percentage_based && (
              <span className="font-semibold" style={{ color: isEmpty ? undefined : BRAND.deepTeal }}>
                {formatCurrency(annualTotal)}
              </span>
            )}
          </div>
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        {items.length > 0 ? (
          <div className="ml-7 mt-2 overflow-hidden rounded-lg border border-gray-100">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50/50 hover:bg-gray-50/50">
                  <TableHead className="text-xs">Item</TableHead>
                  <TableHead className="text-right text-xs">Cost</TableHead>
                  <TableHead className="text-xs">Frequency</TableHead>
                  <TableHead className="text-right text-xs">Qty</TableHead>
                  <TableHead className="text-right text-xs">Annual</TableHead>
                  <TableHead className="text-xs">Type</TableHead>
                  <TableHead className="text-right text-xs">Adjusted</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="text-sm">{item.name}</TableCell>
                    <TableCell className="text-right text-sm text-gray-500">{formatCurrency(item.cost)}</TableCell>
                    <TableCell className="text-sm text-gray-500">{frequencyLabel(item.frequency)}</TableCell>
                    <TableCell className="text-right text-sm text-gray-500">{item.quantity}</TableCell>
                    <TableCell className="text-right text-sm font-medium">{formatCurrency(itemAnnual(item))}</TableCell>
                    <TableCell><NeedWantBadge value={item.need_want} /></TableCell>
                    <TableCell className="text-right text-sm text-gray-500">
                      {item.adjusted_total != null ? formatCurrency(item.adjusted_total) : '—'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="ml-7 mt-2 rounded-lg bg-gray-50 p-4 text-center text-sm text-gray-400">
            No items entered yet
          </div>
        )}
      </CollapsibleContent>
    </Collapsible>
  )
}

export function CategoryBreakdown({
  entityType,
}: {
  entityType: 'child' | 'adult' | 'household'
}) {
  const { data } = useConsultation()

  const entities =
    entityType === 'child'
      ? data.children.map((child) => ({ id: child.id, name: child.name }))
      : entityType === 'adult'
        ? data.adults.map((adult) => ({ id: adult.id, name: adult.name }))
        : data.household
          ? [{ id: data.household.id, name: data.household.name || 'Household' }]
          : []

  if (entities.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-12 text-center text-sm text-gray-500">
          {entityType === 'child' && 'No children added yet.'}
          {entityType === 'adult' && 'No adults added yet.'}
          {entityType === 'household' && 'Household not set up yet.'}
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {entities.map((entity) => {
        const categories = categoriesForEntity(data.categories, entityType, entity.id)
        return (
          <Card key={entity.id}>
            <CardHeader>
              <CardTitle>{entity.name}</CardTitle>
              <CardDescription>
                {categories.length} categories — empty categories stay visible
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {categories.length === 0 ? (
                <p className="py-6 text-center text-sm text-gray-400">No categories yet</p>
              ) : (
                categories.map((category) => (
                  <CategoryBlock
                    key={category.id}
                    category={category}
                    items={itemsForCategory(data.expenseItems, category.id)}
                  />
                ))
              )}
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
