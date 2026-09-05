'use client'

import { useEffect, useRef } from 'react'
import { useSyncContext } from '@/contexts/SyncContext'

/**
 * Re-run `reload` once after an atomic local reconciliation.
 */
export function useReloadOnSync(reload: () => void | Promise<void>) {
  const { dataRevision } = useSyncContext()
  const reloadRef = useRef(reload)
  reloadRef.current = reload
  const initialRevision = useRef(dataRevision)

  useEffect(() => {
    if (dataRevision === initialRevision.current) return
    initialRevision.current = dataRevision
    void reloadRef.current()
  }, [dataRevision])
}
