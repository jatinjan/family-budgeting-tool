'use client'

import { createContext, useContext } from 'react'
import type { FamilyBudget, UseFamilyBudgetResult } from '@/hooks/use-family-budget'

export interface ConsultationContextValue extends UseFamilyBudgetResult {
  userId: string
}

const ConsultationContext = createContext<ConsultationContextValue | undefined>(undefined)

export function ConsultationProvider({
  value,
  children,
}: {
  value: ConsultationContextValue
  children: React.ReactNode
}) {
  return (
    <ConsultationContext.Provider value={value}>
      {children}
    </ConsultationContext.Provider>
  )
}

export function useConsultation(): ConsultationContextValue & { data: FamilyBudget } {
  const context = useContext(ConsultationContext)
  if (!context) {
    throw new Error('useConsultation must be used within ConsultationProvider')
  }
  if (!context.data) {
    throw new Error('Consultation data is not available')
  }
  return { ...context, data: context.data }
}
