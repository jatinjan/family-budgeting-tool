'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Home } from 'lucide-react'
import { useConsultation } from '@/contexts/ConsultationContext'
import { BRAND, HOUSING_TYPE_LABELS } from '../consultation-ui'

export default function ConsultationHouseholdPage() {
  const { userId, data } = useConsultation()
  const household = data.household

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="mb-1 font-[Nunito] text-xl font-bold" style={{ color: BRAND.deepTeal }}>
            Household
          </h1>
          <p className="text-sm text-gray-500">Housing and household details entered so far.</p>
        </div>
        <Button asChild style={{ backgroundColor: BRAND.deepTeal }}>
          <Link href={`/admin/families/${userId}/view/household/categories`}>
            View categories
          </Link>
        </Button>
      </div>

      {!household ? (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center text-sm text-gray-500">
            Household profile is not set up yet. Financial totals are on Dashboard,
            Planning, and Summary. Category costs are under View categories once a
            household exists.
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Home className="h-5 w-5" style={{ color: BRAND.deepTeal }} />
              <CardTitle>{household.name || 'Household'}</CardTitle>
            </div>
            <CardDescription>
              {household.housing_type
                ? HOUSING_TYPE_LABELS[household.housing_type] || household.housing_type
                : 'Housing type not specified'}
              {` · ${household.members} member${household.members !== 1 ? 's' : ''}`}
            </CardDescription>
          </CardHeader>
        </Card>
      )}
    </div>
  )
}
