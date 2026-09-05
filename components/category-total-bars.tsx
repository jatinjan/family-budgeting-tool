"use client"

import { useEffect, useMemo, useState, type ReactNode } from "react"
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { formatCurrency } from "@/lib/config"

export type CategoryTotalBar = {
  category: string
  total: number
  people?: { name: string; amount: number }[]
  color?: string
}

const OTHER_LABEL = "Other"
const MAX_ROWS = 8
const HEAD_COUNT = 7

export function aggregateCategoryTotals(
  entities: { name: string; categories: { name: string; value: number; color?: string }[] }[]
): CategoryTotalBar[] {
  const map = new Map<string, CategoryTotalBar>()

  for (const entity of entities) {
    for (const category of entity.categories) {
      if (category.value <= 0) continue
      const existing = map.get(category.name)
      if (!existing) {
        map.set(category.name, {
          category: category.name,
          total: category.value,
          people: [{ name: entity.name, amount: category.value }],
          color: category.color,
        })
        continue
      }
      existing.total += category.value
      existing.people = [...(existing.people ?? []), { name: entity.name, amount: category.value }]
    }
  }

  return Array.from(map.values())
    .filter((row) => row.total > 0)
    .sort((a, b) => b.total - a.total)
}

export function collapseCategoryBars(bars: CategoryTotalBar[]): CategoryTotalBar[] {
  if (bars.length <= MAX_ROWS) return bars
  const head = bars.slice(0, HEAD_COUNT)
  const tail = bars.slice(HEAD_COUNT)
  return [
    ...head,
    {
      category: OTHER_LABEL,
      total: tail.reduce((sum, row) => sum + row.total, 0),
      people: tail.map((row) => ({ name: row.category, amount: row.total })),
    },
  ]
}

function formatMoneyTick(value: number, max: number): string {
  if (value === 0) return "$0"
  if (max < 5000) {
    return `$${Math.round(value).toLocaleString("en-AU")}`
  }
  const thousands = value / 1000
  return `$${thousands >= 10 ? thousands.toFixed(0) : thousands.toFixed(1)}k`
}

function wrapCategoryLabel(label: string, maxChars: number): string[] {
  if (label.length <= maxChars) return [label]
  const words = label.split(" ")
  const lines = ["", ""]
  for (const word of words) {
    const index = lines[0]!.length + word.length + 1 <= maxChars || lines[0] === "" ? 0 : 1
    lines[index] = lines[index] ? `${lines[index]} ${word}` : word
  }
  return lines.filter(Boolean).slice(0, 2)
}

function CategoryTick({
  x = 0,
  y = 0,
  payload,
  maxChars,
}: {
  x?: number
  y?: number
  payload?: { value?: string }
  maxChars: number
}) {
  const lines = wrapCategoryLabel(payload?.value ?? "", maxChars)
  const lineHeight = 12
  const startY = y - ((lines.length - 1) * lineHeight) / 2 + 4

  return (
    <text x={x} y={startY} textAnchor="end" fill="hsl(var(--muted-foreground))" fontSize={11}>
      {lines.map((line, index) => (
        <tspan key={`${line}-${index}`} x={x} dy={index === 0 ? 0 : lineHeight}>
          {line}
        </tspan>
      ))}
    </text>
  )
}

type CategoryTotalBarsProps = {
  title: ReactNode
  description: string
  caption: string
  bars: CategoryTotalBar[]
  barColor: string
  useCategoryColors?: boolean
}

export function CategoryTotalBars({
  title,
  description,
  caption,
  bars,
  barColor,
  useCategoryColors = false,
}: CategoryTotalBarsProps) {
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const media = window.matchMedia("(max-width: 767px)")
    const apply = () => setIsMobile(media.matches)
    apply()
    media.addEventListener("change", apply)
    return () => media.removeEventListener("change", apply)
  }, [])

  const rows = useMemo(() => collapseCategoryBars(bars), [bars])
  if (rows.length === 0) return null

  const max = Math.max(...rows.map((row) => row.total))
  const labelWidth = isMobile ? 120 : 168
  const maxChars = isMobile ? 16 : 22
  const height = isMobile
    ? Math.max(240, 32 * rows.length + 40)
    : Math.max(280, 36 * rows.length + 48)
  const axisTicks = [0, max / 2, max]

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
        <p className="text-xs text-muted-foreground">{caption}</p>
      </CardHeader>
      <CardContent className="overflow-x-hidden px-2 sm:px-6">
        <ResponsiveContainer width="100%" height={height}>
          <BarChart
            data={rows}
            layout="vertical"
            margin={{ top: 8, right: 12, left: 4, bottom: 8 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
            <XAxis
              type="number"
              tick={{ fill: "hsl(var(--muted-foreground))", fontSize: isMobile ? 10 : 11 }}
              tickFormatter={(value: number) => formatMoneyTick(value, max)}
              ticks={axisTicks}
              domain={[0, max]}
              interval={0}
            />
            <YAxis
              type="category"
              dataKey="category"
              width={labelWidth}
              interval={0}
              reversed
              tick={(props) => <CategoryTick {...props} maxChars={maxChars} />}
              tickLine={false}
            />
            <Tooltip
              cursor={{ fill: "hsl(var(--muted) / 0.35)" }}
              content={({ active, payload }) => {
                if (!active || !payload?.[0]) return null
                const row = payload[0].payload as CategoryTotalBar
                const showPeople =
                  row.category === OTHER_LABEL
                    ? (row.people?.length ?? 0) > 0
                    : (row.people?.length ?? 0) > 1
                return (
                  <div className="rounded-md border bg-card px-3 py-2 text-sm shadow-sm">
                    <p className="font-medium">{row.category}</p>
                    <p className="text-muted-foreground">{formatCurrency(row.total)}</p>
                    {showPeople ? (
                      <ul className="mt-2 space-y-0.5 text-xs text-muted-foreground">
                        {row.people!.map((person) => (
                          <li key={`${person.name}-${person.amount}`}>
                            {person.name} {formatCurrency(person.amount)}
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </div>
                )
              }}
            />
            <Bar dataKey="total" radius={[0, 6, 6, 0]} maxBarSize={22}>
              {rows.map((row) => (
                <Cell
                  key={row.category}
                  fill={
                    row.category === OTHER_LABEL || !useCategoryColors
                      ? barColor
                      : row.color || barColor
                  }
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
