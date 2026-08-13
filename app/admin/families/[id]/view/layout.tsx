'use client'

import { use } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { AlertCircle, ArrowLeft, RefreshCw } from 'lucide-react'
import { useFamilyBudget } from '@/hooks/use-family-budget'
import { ConsultationProvider } from '@/contexts/ConsultationContext'
import { ConsultationBanner } from './components/consultation-banner'
import { ConsultationNav } from './components/consultation-nav'
import { BRAND } from './consultation-ui'

export default function ConsultationLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const result = useFamilyBudget(id)

  if (result.loading && !result.data) {
    return (
      <div
        className="min-h-screen"
        style={{ background: `linear-gradient(180deg, ${BRAND.teal}08 0%, ${BRAND.sand}0a 100%)` }}
      >
        <div className="mx-auto max-w-6xl space-y-4 px-4 py-8">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    )
  }

  if (result.error || !result.data) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <Card className="max-w-md">
          <CardContent className="pt-6 text-center">
            <AlertCircle className="mx-auto mb-4 h-12 w-12 text-gray-400" />
            <h2 className="mb-2 text-lg font-semibold" style={{ color: BRAND.charcoal }}>
              {result.error || 'Family not found'}
            </h2>
            <p className="mb-4 text-gray-500">
              Unable to load this family for consultation.
            </p>
            <div className="flex justify-center gap-2">
              <Button variant="outline" asChild className="gap-2">
                <Link href="/admin">
                  <ArrowLeft className="h-4 w-4" />
                  Back to Admin
                </Link>
              </Button>
              <Button
                onClick={() => void result.refresh()}
                className="gap-2"
                style={{ backgroundColor: BRAND.deepTeal }}
              >
                <RefreshCw className="h-4 w-4" />
                Retry
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <ConsultationProvider value={{ ...result, userId: id }}>
      <div
        className="min-h-screen"
        style={{ background: `linear-gradient(180deg, ${BRAND.teal}08 0%, ${BRAND.sand}0a 100%)` }}
      >
        <ConsultationBanner
          userId={id}
          data={result.data}
          loading={result.loading}
          live={result.live}
          onRefresh={() => void result.refresh()}
        />
        <ConsultationNav userId={id} />
        <div className="mx-auto max-w-6xl px-4 py-6">{children}</div>
      </div>
    </ConsultationProvider>
  )
}
