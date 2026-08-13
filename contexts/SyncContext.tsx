"use client"

import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react'
import type { GlobalSyncState, SyncContextType, SyncResult } from '@/types/sync'
import { 
  getSyncState, 
  setSyncState, 
  subscribeSyncState,
  pushToCloud, 
  pullFromCloud, 
  retryFailedSync,
  initOfflineDetection,
  getPendingCount,
  getLastSyncTime,
  fullSync,
  attachSyncWriteHooks,
} from '@/lib/sync'
import { subscribeToFamilyBudget } from '@/lib/realtime'
import { useAuth } from '@/contexts/AuthContext'

const SyncContext = createContext<SyncContextType | undefined>(undefined)

export function SyncProvider({ children }: { children: React.ReactNode }) {
  const [syncState, setSyncStateLocal] = useState<GlobalSyncState>('LOCAL_ONLY')
  const [isOnline, setIsOnline] = useState(true)
  const [pendingCount, setPendingCount] = useState(0)
  const [lastSynced, setLastSynced] = useState<Date | null>(null)
  const { user } = useAuth()
  const initialSyncDone = useRef(false)

  useEffect(() => {
    setIsOnline(navigator.onLine)
  }, [])

  useEffect(() => {
    const unsubscribe = subscribeSyncState((state) => {
      setSyncStateLocal(state)
    })

    return unsubscribe
  }, [])

  useEffect(() => {
    const cleanup = initOfflineDetection(
      () => setIsOnline(true),
      () => setIsOnline(false)
    )

    return cleanup
  }, [])

  useEffect(() => {
    const updatePendingCount = async () => {
      const count = await getPendingCount()
      setPendingCount(count)
    }

    updatePendingCount()

    const interval = setInterval(updatePendingCount, 5000)
    return () => clearInterval(interval)
  }, [syncState])

  useEffect(() => {
    const updateLastSynced = async () => {
      const time = await getLastSyncTime()
      setLastSynced(time)
    }

    if (syncState === 'SYNCED') {
      updateLastSynced()
    }
  }, [syncState])

  useEffect(() => {
    attachSyncWriteHooks()
  }, [])

  useEffect(() => {
    if (user && !initialSyncDone.current) {
      initialSyncDone.current = true
      setSyncState('PENDING')
      fullSync().catch(console.error)
    } else if (!user) {
      initialSyncDone.current = false
      setSyncState('LOCAL_ONLY')
    }
  }, [user])

  useEffect(() => {
    if (!user) return

    let pullTimer: ReturnType<typeof setTimeout> | null = null
    const unsubscribe = subscribeToFamilyBudget(user.id, () => {
      if (pullTimer) clearTimeout(pullTimer)
      pullTimer = setTimeout(() => {
        if (getSyncState() === 'SYNCING') return
        void getPendingCount().then((count) => {
          if (count > 0) return
          void pullFromCloud({ silent: true })
        })
      }, 250)
    })

    return () => {
      if (pullTimer) clearTimeout(pullTimer)
      unsubscribe()
    }
  }, [user])
  const triggerSync = useCallback(async (): Promise<SyncResult> => {
    if (!user) {
      return { success: false, error: 'Not authenticated' }
    }

    if (!isOnline) {
      return { success: false, error: 'You are offline' }
    }

    return pushToCloud()
  }, [user, isOnline])

  const retryFailed = useCallback(async (): Promise<SyncResult> => {
    if (!user) {
      return { success: false, error: 'Not authenticated' }
    }

    if (!isOnline) {
      return { success: false, error: 'You are offline' }
    }

    return retryFailedSync()
  }, [user, isOnline])

  const pullFromCloudFn = useCallback(async (): Promise<SyncResult> => {
    if (!user) {
      return { success: false, error: 'Not authenticated' }
    }

    if (!isOnline) {
      return { success: false, error: 'You are offline' }
    }

    return pullFromCloud()
  }, [user, isOnline])

  return (
    <SyncContext.Provider value={{
      syncState,
      isOnline,
      pendingCount,
      lastSynced,
      triggerSync,
      retryFailed,
      pullFromCloud: pullFromCloudFn,
    }}>
      {children}
    </SyncContext.Provider>
  )
}

export function useSyncContext() {
  const context = useContext(SyncContext)
  if (context === undefined) {
    throw new Error('useSyncContext must be used within a SyncProvider')
  }
  return context
}
