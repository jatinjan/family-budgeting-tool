"use client"

import { AuthProvider } from '@/contexts/AuthContext'
import { SyncProvider } from '@/contexts/SyncContext'
import { BudgetEditLockProvider } from '@/contexts/BudgetEditLockContext'

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <SyncProvider>
        <BudgetEditLockProvider>
          {children}
        </BudgetEditLockProvider>
      </SyncProvider>
    </AuthProvider>
  )
}
