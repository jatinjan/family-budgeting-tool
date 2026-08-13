'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { AlertCircle, DollarSign, Home, User, Users } from 'lucide-react'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts'
import { useConsultation } from '@/contexts/ConsultationContext'
import { budgetSummaryFromFamily } from '@/lib/consultation-totals'
import { formatCurrency } from '@/lib/utils/formatters'
import { BRAND } from '../consultation-ui'

const ENTITY_COLORS = {
  children: 'hsl(200, 70%, 60%)',
  adults: 'hsl(340, 75%, 65%)',
  household: 'hsl(180, 27%, 49%)',
}

const CATEGORY_COLORS = [
  'hsl(180, 27%, 49%)',
  'hsl(340, 75%, 65%)',
  'hsl(200, 70%, 60%)',
  'hsl(150, 60%, 50%)',
  'hsl(40, 90%, 60%)',
  'hsl(180, 27%, 62%)',
  'hsl(340, 60%, 75%)',
  'hsl(280, 65%, 60%)',
]

export default function ConsultationDashboardPage() {
  const { data } = useConsultation()
  const summary = budgetSummaryFromFamily(data)
  const [selectedChildId, setSelectedChildId] = useState(data.children[0]?.id ?? '')
  const [selectedAdultId, setSelectedAdultId] = useState(data.adults[0]?.id ?? '')

  const hasAnyEntity = data.children.length > 0 || data.adults.length > 0 || !!data.household

  const overviewData = [
    { name: 'Children', value: summary.children.total, color: ENTITY_COLORS.children },
    { name: 'Adults', value: summary.adults.total, color: ENTITY_COLORS.adults },
    { name: 'Household', value: summary.household.total, color: ENTITY_COLORS.household },
  ].filter((item) => item.value > 0)

  const selectedChild = summary.children.entities.find((entity) => entity.entityId === selectedChildId)
  const selectedAdult = summary.adults.entities.find((entity) => entity.entityId === selectedAdultId)
  const householdEntity = summary.household.entity

  if (!hasAnyEntity) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <AlertCircle className="mb-4 h-8 w-8 text-gray-400" />
          <h3 className="mb-2 text-lg font-semibold" style={{ color: BRAND.charcoal }}>
            No financial data yet
          </h3>
          <p className="text-sm text-gray-500">
            This family has not added household, adult, or child costs. After they
            enter a budget in the family app and it syncs, totals appear here.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="mb-1 font-[Nunito] text-xl font-bold" style={{ color: BRAND.deepTeal }}>
          Budget Dashboard
        </h1>
        <p className="text-sm text-gray-500">
          Same annual totals and entity breakdown the family sees.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <SummaryCard
          title="Total Annual"
          value={summary.grandTotal}
          detail={`${formatCurrency(summary.monthly)} per month`}
          icon={DollarSign}
          color={BRAND.deepTeal}
        />
        <SummaryCard
          title="Children"
          value={summary.children.total}
          detail={`${data.children.length} child${data.children.length !== 1 ? 'ren' : ''}`}
          icon={Users}
          color={ENTITY_COLORS.children}
        />
        <SummaryCard
          title="Adults"
          value={summary.adults.total}
          detail={`${data.adults.length} adult${data.adults.length !== 1 ? 's' : ''}`}
          icon={User}
          color={ENTITY_COLORS.adults}
        />
        <SummaryCard
          title="Household"
          value={summary.household.total}
          detail={data.household?.name || 'Not set up'}
          icon={Home}
          color={ENTITY_COLORS.household}
        />
      </div>

      {overviewData.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Family Spending Overview</CardTitle>
            <CardDescription>Total annual spend across all entities</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center gap-8 lg:flex-row">
              <div className="w-full lg:w-1/2">
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie
                      data={overviewData}
                      cx="50%"
                      cy="50%"
                      labelLine
                      label={({ name, percent }) => `${name}: ${((percent ?? 0) * 100).toFixed(0)}%`}
                      outerRadius={100}
                      innerRadius={40}
                      dataKey="value"
                      paddingAngle={2}
                    >
                      {overviewData.map((entry) => (
                        <Cell key={entry.name} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => formatCurrency(value)} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="w-full space-y-3 lg:w-1/2">
                {overviewData.map((entry) => (
                  <div key={entry.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="h-3 w-3 rounded-full" style={{ backgroundColor: entry.color }} />
                      <span className="text-sm" style={{ color: BRAND.charcoal }}>{entry.name}</span>
                    </div>
                    <span className="text-sm font-semibold">{formatCurrency(entry.value)}</span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-dashed">
          <CardContent className="py-10 text-center text-sm text-gray-500">
            No costs entered yet. Categories will appear here as the family fills them in.
          </CardContent>
        </Card>
      )}

      {data.children.length > 0 && (
        <EntityChartCard
          title="Children"
          entities={data.children.map((child) => ({ id: child.id, name: child.name }))}
          selectedId={selectedChildId}
          onSelect={setSelectedChildId}
          categories={selectedChild?.categories.filter((category) => category.total > 0) || []}
          emptyLabel="This child has no costs entered yet."
        />
      )}

      {data.adults.length > 0 && (
        <EntityChartCard
          title="Adults"
          entities={data.adults.map((adult) => ({ id: adult.id, name: adult.name }))}
          selectedId={selectedAdultId}
          onSelect={setSelectedAdultId}
          categories={selectedAdult?.categories.filter((category) => category.total > 0) || []}
          emptyLabel="This adult has no costs entered yet."
        />
      )}

      {householdEntity && (
        <Card>
          <CardHeader>
            <CardTitle>Household</CardTitle>
            <CardDescription>{householdEntity.entityName}</CardDescription>
          </CardHeader>
          <CardContent>
            <CategoryBarChart
              categories={householdEntity.categories.filter((category) => category.total > 0)}
              emptyLabel="Household has no costs entered yet."
            />
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function SummaryCard({
  title,
  value,
  detail,
  icon: Icon,
  color,
}: {
  title: string
  value: number
  detail: string
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>
  color: string
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4" style={{ color }} />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold" style={{ color }}>{formatCurrency(value)}</div>
        <p className="text-xs text-gray-500">{detail}</p>
      </CardContent>
    </Card>
  )
}

function EntityChartCard({
  title,
  entities,
  selectedId,
  onSelect,
  categories,
  emptyLabel,
}: {
  title: string
  entities: { id: string; name: string }[]
  selectedId: string
  onSelect: (id: string) => void
  categories: { categoryName: string; total: number }[]
  emptyLabel: string
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-4">
        <div>
          <CardTitle>{title}</CardTitle>
          <CardDescription>Category breakdown for the selected person</CardDescription>
        </div>
        {entities.length > 1 && (
          <Select value={selectedId} onValueChange={onSelect}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {entities.map((entity) => (
                <SelectItem key={entity.id} value={entity.id}>
                  {entity.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </CardHeader>
      <CardContent>
        <CategoryBarChart categories={categories} emptyLabel={emptyLabel} />
      </CardContent>
    </Card>
  )
}

function CategoryBarChart({
  categories,
  emptyLabel,
}: {
  categories: { categoryName: string; total: number }[]
  emptyLabel: string
}) {
  if (categories.length === 0) {
    return <p className="py-8 text-center text-sm text-gray-400">{emptyLabel}</p>
  }

  const chartData = categories.map((category, index) => ({
    name: category.categoryName,
    total: category.total,
    fill: CATEGORY_COLORS[index % CATEGORY_COLORS.length],
  }))

  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={chartData} margin={{ top: 8, right: 8, left: 8, bottom: 48 }}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="name" angle={-35} textAnchor="end" interval={0} height={60} fontSize={11} />
        <YAxis tickFormatter={(value) => `$${value}`} fontSize={11} />
        <Tooltip formatter={(value: number) => formatCurrency(value)} />
        <Bar dataKey="total" radius={[4, 4, 0, 0]}>
          {chartData.map((entry) => (
            <Cell key={entry.name} fill={entry.fill} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
