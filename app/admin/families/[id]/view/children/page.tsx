'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Baby } from 'lucide-react'
import { useConsultation } from '@/contexts/ConsultationContext'
import { BRAND, SCHOOL_LEVEL_LABELS } from '../consultation-ui'

export default function ConsultationChildrenPage() {
  const { userId, data } = useConsultation()

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="mb-1 font-[Nunito] text-xl font-bold" style={{ color: BRAND.deepTeal }}>
            Children
          </h1>
          <p className="text-sm text-gray-500">Family members entered so far.</p>
        </div>
        <Button asChild style={{ backgroundColor: BRAND.deepTeal }}>
          <Link href={`/admin/families/${userId}/view/children/categories`}>
            View categories
          </Link>
        </Button>
      </div>

      {data.children.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center text-sm text-gray-500">
            No children added yet.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {data.children.map((child) => (
            <Card key={child.id}>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Baby className="h-5 w-5" style={{ color: BRAND.sand }} />
                  <CardTitle>{child.name}</CardTitle>
                </div>
                <CardDescription>
                  {child.age != null ? `Age ${child.age}` : 'Age not set'}
                  {child.school_level
                    ? ` · ${SCHOOL_LEVEL_LABELS[child.school_level] || child.school_level}`
                    : ''}
                </CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
