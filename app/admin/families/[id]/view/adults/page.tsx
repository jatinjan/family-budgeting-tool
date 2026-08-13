'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { User } from 'lucide-react'
import { useConsultation } from '@/contexts/ConsultationContext'
import { BRAND } from '../consultation-ui'

export default function ConsultationAdultsPage() {
  const { userId, data } = useConsultation()

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="mb-1 font-[Nunito] text-xl font-bold" style={{ color: BRAND.deepTeal }}>
            Adults
          </h1>
          <p className="text-sm text-gray-500">Family members entered so far.</p>
        </div>
        <Button asChild style={{ backgroundColor: BRAND.deepTeal }}>
          <Link href={`/admin/families/${userId}/view/adults/categories`}>
            View categories
          </Link>
        </Button>
      </div>

      {data.adults.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center text-sm text-gray-500">
            No adults added yet.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {data.adults.map((adult) => (
            <Card key={adult.id}>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <User className="h-5 w-5" style={{ color: BRAND.teal }} />
                  <CardTitle>{adult.name}</CardTitle>
                </div>
                <CardDescription>
                  {adult.age != null ? `Age ${adult.age}` : 'Age not set'}
                </CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
