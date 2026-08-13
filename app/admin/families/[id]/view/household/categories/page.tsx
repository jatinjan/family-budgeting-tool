'use client'

import { CategoryBreakdown } from '../../components/category-breakdown'
import { BRAND } from '../../consultation-ui'

export default function ConsultationHouseholdCategoriesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="mb-1 font-[Nunito] text-xl font-bold" style={{ color: BRAND.deepTeal }}>
          Household categories
        </h1>
        <p className="text-sm text-gray-500">
          Entered items and not-started categories. Display only.
        </p>
      </div>
      <CategoryBreakdown entityType="household" />
    </div>
  )
}
