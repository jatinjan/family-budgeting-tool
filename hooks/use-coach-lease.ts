'use client'

import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import {
  endLease,
  fetchLatestLease,
  leaseState,
  requestAssistLease,
  startSetupLease,
  subscribeToFamilyLease,
  type CoachLeaseState,
} from '@/lib/coach-lease'
import type { BudgetEditLease } from '@/types/database'

export interface UseCoachLeaseResult {
  lease: BudgetEditLease | null
  state: CoachLeaseState
  /** Active lease held by the signed-in coach. Only then may she write. */
  canEdit: boolean
  heldByOther: boolean
  loading: boolean
  busy: boolean
  error: string | null
  now: number
  refresh: () => Promise<void>
  startSetup: () => Promise<boolean>
  requestAssist: () => Promise<boolean>
  end: () => Promise<void>
}

export function useCoachLease(familyId: string): UseCoachLeaseResult {
  const { user } = useAuth()
  const [lease, setLease] = useState<BudgetEditLease | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [now, setNow] = useState(() => Date.now())

  const refresh = useCallback(async () => {
    try {
      setLease(await fetchLatestLease(familyId))
      setNow(Date.now())
    } catch (refreshError) {
      setError(refreshError instanceof Error ? refreshError.message : 'Could not load editing status.')
    } finally {
      setLoading(false)
    }
  }, [familyId])

  useEffect(() => {
    void refresh()
    const unsubscribe = subscribeToFamilyLease(familyId, () => void refresh())
    const tick = setInterval(() => setNow(Date.now()), 15_000)
    const poll = setInterval(() => void refresh(), 60_000)
    return () => {
      unsubscribe()
      clearInterval(tick)
      clearInterval(poll)
    }
  }, [familyId, refresh])

  const run = useCallback(
    async (work: () => Promise<unknown>): Promise<boolean> => {
      setBusy(true)
      setError(null)
      try {
        await work()
        await refresh()
        return true
      } catch (runError) {
        setError(runError instanceof Error ? runError.message : 'Something went wrong.')
        await refresh()
        return false
      } finally {
        setBusy(false)
      }
    },
    [refresh],
  )

  const state = leaseState(lease, now)
  const mine = Boolean(lease && user && lease.coach_id === user.id)

  return {
    lease,
    state,
    canEdit: state === 'active' && mine,
    heldByOther: state !== 'none' && !mine,
    loading,
    busy,
    error,
    now,
    refresh,
    startSetup: () => run(() => startSetupLease(familyId)),
    requestAssist: () => run(() => requestAssistLease(familyId)),
    end: async () => {
      if (lease) await run(() => endLease(lease.id))
    },
  }
}
