"use client"

import { AuthProvider } from '@/contexts/AuthContext'
import { SyncProvider } from '@/contexts/SyncContext'
import { BudgetEditLockProvider } from '@/contexts/BudgetEditLockContext'
import { AuthRecoveryRedirect } from '@/components/auth-recovery-redirect'

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <AuthRecoveryRedirect />
      <SyncProvider>
        <BudgetEditLockProvider>
          {children}
        </BudgetEditLockProvider>
      </SyncProvider>
    </AuthProvider>
  )
}
