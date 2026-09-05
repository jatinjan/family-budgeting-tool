"use client"

import { useSyncContext } from '@/contexts/SyncContext'

/**
 * Convenience hook for accessing sync state and actions
 */
export function useSync() {
  return useSyncContext()
}

/**
 * Hook for checking online status only
 */
export function useOnlineStatus() {
  const { isOnline } = useSyncContext()
  return isOnline
}

/**
 * Hook for sync state display
 */
export function useSyncStatus() {
  const { syncState, pendingCount, lastSynced } = useSyncContext()
  
  const statusText = (() => {
    switch (syncState) {
      case 'LOCAL_ONLY':
        return 'Sign in to sync'
      case 'SYNCED':
        return pendingCount > 0 ? `${pendingCount} pending` : 'All synced'
      case 'PENDING':
        return `${pendingCount} pending`
      case 'SYNCING':
        return 'Syncing...'
      case 'FAILED':
        return 'Sync failed'
      case 'CONFLICT':
        return 'Conflict detected'
      default:
        return ''
    }
  })()
  
  const statusColor = (() => {
    switch (syncState) {
      case 'SYNCED':
        return 'text-green-600'
      case 'PENDING':
        return 'text-amber-600'
      case 'SYNCING':
        return 'text-blue-600'
      case 'FAILED':
        return 'text-red-600'
      case 'CONFLICT':
        return 'text-orange-600'
      default:
        return 'text-gray-500'
    }
  })()
  
  return {
    syncState,
    pendingCount,
    lastSynced,
    statusText,
    statusColor,
    isSyncing: syncState === 'SYNCING',
    hasPending: pendingCount > 0,
    hasFailed: syncState === 'FAILED',
    hasConflict: syncState === 'CONFLICT',
    isLocalOnly: syncState === 'LOCAL_ONLY',
  }
}
