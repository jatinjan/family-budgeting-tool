'use client'

import { useEffect, useRef } from 'react'
import { useSyncContext } from '@/contexts/SyncContext'

/**
 * Re-run `reload` when a cloud sync cycle finishes so list pages
 * don't stay empty after login pull (docs/specs/sync-layer.md).
 */
export function useReloadOnSync(reload: () => void | Promise<void>) {
  const { syncState } = useSyncContext()
  const reloadRef = useRef(reload)
  reloadRef.current = reload
  const prevRef = useRef(syncState)

  useEffect(() => {
    const prev = prevRef.current
    prevRef.current = syncState
    if (prev === 'SYNCING' && syncState !== 'SYNCING') {
      void reloadRef.current()
    }
  }, [syncState])
}
