'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ArrowLeft, RefreshCw } from 'lucide-react'
import { formatRelativeTime, formatCurrency } from '@/lib/utils/formatters'
import { budgetSummaryFromFamily } from '@/lib/consultation-totals'
import type { FamilyBudget } from '@/hooks/use-family-budget'
import { BRAND } from '../consultation-ui'
import { OnboardingBadge } from './onboarding-badge'

export function ConsultationBanner({
  userId,
  data,
  loading,
  live,
  onRefresh,
}: {
  userId: string
  data: FamilyBudget
  loading: boolean
  live: boolean
  onRefresh: () => void
}) {
  const displayName = data.profile.family_name || data.profile.email
  const summary = budgetSummaryFromFamily(data)
  const hasFinancialData = summary.grandTotal > 0

  return (
    <div
      className="border-b bg-white"
      style={{ borderColor: `${BRAND.teal}30` }}
    >
      <div className="mx-auto max-w-6xl px-4 py-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="text-sm font-medium" style={{ color: BRAND.deepTeal }}>
              Viewing {displayName} — Consultation (read-only)
            </p>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <OnboardingBadge status={data.profile.onboarding_status} />
              <span className="inline-flex items-center gap-1.5 text-xs text-gray-500">
                <span
                  className={`h-1.5 w-1.5 rounded-full ${live ? 'animate-pulse bg-emerald-500' : 'bg-gray-300'}`}
                  aria-hidden
                />
                {live ? 'Live' : 'Offline'}
                <span aria-hidden>·</span>
                Last updated{' '}
                {data.lastUpdatedAt ? formatRelativeTime(data.lastUpdatedAt) : '—'}
              </span>
            </div>
            <div className="mt-2 flex flex-wrap items-baseline gap-x-4 gap-y-1">
              <p className="text-lg font-bold" style={{ color: BRAND.deepTeal }}>
                {formatCurrency(summary.grandTotal)}
                <span className="ml-1 text-xs font-normal text-gray-500">annual</span>
              </p>
              <p className="text-sm text-gray-600">
                {formatCurrency(summary.fortnightly)}
                <span className="ml-1 text-xs text-gray-500">/ fortnight</span>
              </p>
              <p className="text-xs text-gray-500">
                Children {formatCurrency(summary.children.total)} · Adults{' '}
                {formatCurrency(summary.adults.total)} · Household{' '}
                {formatCurrency(summary.household.total)}
              </p>
              {!hasFinancialData && (
                <p className="text-xs text-amber-700">
                  No financial data synced yet. Open Dashboard after the family enters costs.
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={onRefresh}
              disabled={loading}
              className="gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button variant="ghost" size="sm" asChild className="gap-2">
              <Link href={`/admin/families/${userId}`}>
                <ArrowLeft className="h-4 w-4" />
                Back to briefing
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
