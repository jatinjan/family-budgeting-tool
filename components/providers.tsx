"use client"

import { AuthProvider } from '@/contexts/AuthContext'
import { SyncProvider } from '@/contexts/SyncContext'

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <SyncProvider>
        {children}
      </SyncProvider>
    </AuthProvider>
  )
}
