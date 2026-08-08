"use client"

import { WifiOff } from 'lucide-react'
import { useSync } from '@/hooks/use-sync'

export function OfflineBanner() {
  const { isOnline, pendingCount } = useSync()
  
  if (isOnline) return null
  
  return (
    <div className="fixed top-0 inset-x-0 bg-amber-500 text-white text-center py-2 z-50 shadow-md">
      <div className="flex items-center justify-center gap-2 px-4">
        <WifiOff className="h-4 w-4 shrink-0" />
        <span className="text-sm font-medium">
          You&apos;re offline.
          {pendingCount > 0 && (
            <span className="ml-1">
              {pendingCount} {pendingCount === 1 ? 'change' : 'changes'} will sync when connected.
            </span>
          )}
        </span>
      </div>
    </div>
  )
}
