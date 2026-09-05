"use client"

import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import type {
  GlobalSyncState,
  LegacyOwnershipAction,
  OwnershipState,
  SyncContextType,
  SyncResult,
} from '@/types/sync'
import {
  attachSyncWriteHooks,
  bootstrapOwnerFromCache,
  getActiveOwnerUserId,
  getDataRevision,
  getLastSyncTime,
  getOwnershipState,
  getPendingCount,
  getSyncState,
  initOfflineDetection,
  reconcileBudget,
  resetSyncForSignedOut,
  resolveLegacyOwnership,
  subscribeDataRevision,
  subscribeOwnershipState,
  subscribeSyncState,
} from '@/lib/sync'
import { subscribeToFamilyBudget } from '@/lib/realtime'
import { useAuth } from '@/contexts/AuthContext'
import { SyncOwnershipGate } from '@/components/sync-ownership-gate'

const SyncContext = createContext<SyncContextType | undefined>(undefined)

export function SyncProvider({ children }: { children: React.ReactNode }) {
  const [syncState, setSyncStateLocal] = useState<GlobalSyncState>(() => getSyncState())
  const [ownershipState, setOwnershipStateLocal] = useState<OwnershipState>(() =>
    getOwnershipState(),
  )
  const [dataRevision, setDataRevision] = useState(() => getDataRevision())
  const [isOnline, setIsOnline] = useState(true)
  const [pendingCount, setPendingCount] = useState(0)
  const [lastSynced, setLastSynced] = useState<Date | null>(null)
  const { user, loading: authLoading } = useAuth()
  const initialSyncUser = useRef<string | null>(null)

  useEffect(() => {
    setIsOnline(navigator.onLine)
    attachSyncWriteHooks()
  }, [])

  useEffect(() => {
    const unsubscribeState = subscribeSyncState(setSyncStateLocal)
    const unsubscribeOwnership = subscribeOwnershipState(setOwnershipStateLocal)
    const unsubscribeRevision = subscribeDataRevision(setDataRevision)
    return () => {
      unsubscribeState()
      unsubscribeOwnership()
      unsubscribeRevision()
    }
  }, [])

  useEffect(() => {
    const cleanup = initOfflineDetection(
      () => {
        setIsOnline(true)
        if (user) void reconcileBudget('reconnect')
      },
      () => setIsOnline(false),
    )
    return cleanup
  }, [user])

  useEffect(() => {
    const updatePendingCount = async () => setPendingCount(await getPendingCount())
    void updatePendingCount()
    const interval = setInterval(() => void updatePendingCount(), 5000)
    return () => clearInterval(interval)
  }, [syncState, dataRevision])

  useEffect(() => {
    if (syncState === 'SYNCED') {
      void getLastSyncTime().then(setLastSynced)
    }
  }, [syncState])

  useEffect(() => {
    if (!user) {
      initialSyncUser.current = null
      resetSyncForSignedOut()
      return
    }
    if (initialSyncUser.current === user.id) return
    initialSyncUser.current = user.id
    void (async () => {
      await bootstrapOwnerFromCache(user.id)
      if (navigator.onLine) {
        await reconcileBudget('login')
      }
    })()
  }, [user])

  useEffect(() => {
    if (!user) return
    let timer: ReturnType<typeof setTimeout> | null = null
    const unsubscribe = subscribeToFamilyBudget(user.id, () => {
      if (timer) clearTimeout(timer)
      timer = setTimeout(() => void reconcileBudget('realtime'), 250)
    })
    return () => {
      if (timer) clearTimeout(timer)
      unsubscribe()
    }
  }, [user])

  const triggerSync = useCallback(async (): Promise<SyncResult> => {
    if (!user) return { success: false, error: 'Not authenticated' }
    if (!isOnline) return { success: false, error: 'You are offline', state: 'PENDING' }
    return reconcileBudget('manual')
  }, [user, isOnline])

  const retryFailed = useCallback(async (): Promise<SyncResult> => {
    if (!user) return { success: false, error: 'Not authenticated' }
    if (!isOnline) return { success: false, error: 'You are offline', state: 'PENDING' }
    return reconcileBudget('retry')
  }, [user, isOnline])

  const pullFromCloud = useCallback(async (): Promise<SyncResult> => {
    if (!user) return { success: false, error: 'Not authenticated' }
    if (!isOnline) return { success: false, error: 'You are offline', state: 'PENDING' }
    return reconcileBudget('manual')
  }, [user, isOnline])

  const resolveOwnership = useCallback(
    async (action: LegacyOwnershipAction): Promise<SyncResult> => {
      if (!user) return { success: false, error: 'Not authenticated' }
      return resolveLegacyOwnership(action)
    },
    [user],
  )

  const value: SyncContextType = {
    syncState,
    isOnline,
    pendingCount,
    lastSynced,
    dataRevision,
    ownershipState,
    triggerSync,
    retryFailed,
    pullFromCloud,
    resolveLegacyOwnership: resolveOwnership,
  }

  const ownerReady =
    Boolean(user) &&
    ownershipState === 'READY' &&
    getActiveOwnerUserId() === user?.id

  return (
    <SyncContext.Provider value={value}>
      {authLoading || (user && !ownerReady) ? (
        <SyncOwnershipGate
          recoveryRequired={!authLoading && ownershipState === 'RECOVERY_REQUIRED'}
          onResolve={resolveOwnership}
          syncFailed={syncState === 'FAILED'}
          isOnline={isOnline}
          onRetry={retryFailed}
        />
      ) : (
        children
      )}
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
