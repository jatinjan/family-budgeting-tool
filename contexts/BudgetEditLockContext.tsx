"use client"

import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { toast } from '@/hooks/use-toast'
import {
  UNLOCKED_STATE,
  fetchMyEditState,
  persistLock,
  readPersistedLock,
  respondToAssist,
  subscribeToMyEditLeases,
  takeBackEditing,
  type FamilyEditState,
} from '@/lib/budget-edit-lock'
import {
  getOwnershipState,
  getPendingCount,
  isBudgetEditLocked,
  queueSync,
  reconcileBudget,
  setBudgetEditLocked,
} from '@/lib/sync'

export type BudgetEditPhase = 'unlocked' | 'requested' | 'locked' | 'unlocking'

export interface BudgetEditLockValue {
  phase: BudgetEditPhase
  edit: FamilyEditState
  /** True when locked and the last server check or cloud pull failed. */
  waitingForConnection: boolean
  busy: boolean
  error: string | null
  accept: () => Promise<void>
  decline: () => Promise<void>
  takeBack: () => Promise<void>
}

const BudgetEditLockContext = createContext<BudgetEditLockValue | undefined>(undefined)

const POLL_MS = 60_000

function isLockedError(reason: unknown): boolean {
  const candidate = reason as { name?: string; inner?: { name?: string } } | null
  return candidate?.name === 'BudgetLockedError' || candidate?.inner?.name === 'BudgetLockedError'
}

export function BudgetEditLockProvider({ children }: { children: React.ReactNode }) {
  const { user, isAdmin } = useAuth()
  const [phase, setPhase] = useState<BudgetEditPhase>('unlocked')
  const [edit, setEdit] = useState<FamilyEditState>(UNLOCKED_STATE)
  const [waitingForConnection, setWaitingForConnection] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const userId = user && !isAdmin ? user.id : null
  const running = useRef<Promise<void> | null>(null)
  const rerun = useRef(false)

  const applyLocked = useCallback(async (uid: string, state: FamilyEditState) => {
    setBudgetEditLocked(true)
    await persistLock(uid, state)
    setEdit(state)
    setPhase('locked')
    setWaitingForConnection(false)
  }, [])

  const runRefresh = useCallback(async (uid: string) => {
    let server: FamilyEditState
    try {
      server = await fetchMyEditState()
    } catch {
      if (isBudgetEditLocked()) setWaitingForConnection(true)
      return
    }

    if (server.locked) {
      await applyLocked(uid, server)
      return
    }

    if (isBudgetEditLocked()) {
      // Pull the coach's rows before this device may edit again.
      setPhase('unlocking')
      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        setWaitingForConnection(true)
        setPhase('locked')
        return
      }
      const result = await reconcileBudget('manual')
      const pullFailed =
        (result.failures ?? []).some((failure) => failure.code === 'PULL_FAILED') ||
        result.error === 'Not authenticated' ||
        getOwnershipState() !== 'READY' ||
        (typeof navigator !== 'undefined' && !navigator.onLine)
      if (pullFailed) {
        setWaitingForConnection(true)
        setPhase('locked')
        return
      }
      setBudgetEditLocked(false)
      await persistLock(uid, null)
      queueSync()
    }

    setWaitingForConnection(false)
    setEdit(server)
    setPhase(server.status === 'requested' ? 'requested' : 'unlocked')
  }, [applyLocked])

  const refresh = useCallback(async () => {
    if (!userId) return
    if (running.current) {
      rerun.current = true
      return running.current
    }
    running.current = (async () => {
      do {
        rerun.current = false
        await runRefresh(userId)
      } while (rerun.current)
    })().finally(() => {
      running.current = null
    })
    return running.current
  }, [userId, runRefresh])

  // Boot: restore a remembered lock, claim coach-created budgets, then ask the server.
  useEffect(() => {
    if (!userId) {
      setBudgetEditLocked(false)
      setPhase('unlocked')
      setEdit(UNLOCKED_STATE)
      setWaitingForConnection(false)
      return
    }
    let cancelled = false
    void (async () => {
      const persisted = await readPersistedLock(userId)
      if (cancelled) return
      if (persisted) {
        setBudgetEditLocked(true)
        setEdit(persisted)
        setPhase('locked')
      }
      await refresh()
    })()
    return () => {
      cancelled = true
    }
  }, [userId, refresh])

  useEffect(() => {
    if (!userId) return
    let timer: ReturnType<typeof setTimeout> | null = null
    const unsubscribe = subscribeToMyEditLeases(userId, () => {
      if (timer) clearTimeout(timer)
      timer = setTimeout(() => void refresh(), 200)
    })
    const onWake = () => {
      if (document.visibilityState === 'visible') void refresh()
    }
    const onOnline = () => void refresh()
    window.addEventListener('online', onOnline)
    document.addEventListener('visibilitychange', onWake)
    return () => {
      if (timer) clearTimeout(timer)
      unsubscribe()
      window.removeEventListener('online', onOnline)
      document.removeEventListener('visibilitychange', onWake)
    }
  }, [userId, refresh])

  // Expiry is enforced by the server clock; these timers only re-check it.
  useEffect(() => {
    if (!userId || phase === 'unlocked') return
    const deadline = phase === 'requested' ? edit.requestExpiresAt : edit.expiresAt
    const timers: ReturnType<typeof setTimeout>[] = []
    if (deadline) {
      const delay = Math.max(0, Date.parse(deadline) - Date.now()) + 1500
      timers.push(setTimeout(() => void refresh(), Math.min(delay, 2_147_000_000)))
    }
    const poll = setInterval(() => void refresh(), POLL_MS)
    return () => {
      timers.forEach(clearTimeout)
      clearInterval(poll)
    }
  }, [userId, phase, edit.expiresAt, edit.requestExpiresAt, refresh])

  useEffect(() => {
    const onRejection = (event: PromiseRejectionEvent) => {
      if (!isLockedError(event.reason)) return
      event.preventDefault()
      toast({
        title: 'Editing is paused',
        description: 'Your coach is filling in your budget. You can edit again when they are done.',
      })
    }
    window.addEventListener('unhandledrejection', onRejection)
    return () => window.removeEventListener('unhandledrejection', onRejection)
  }, [])

  const accept = useCallback(async () => {
    if (!userId || !edit.leaseId) return
    setBusy(true)
    setError(null)
    try {
      if (!navigator.onLine) {
        throw new Error("You're offline. Connect to the internet, then try again.")
      }
      const result = await reconcileBudget('manual')
      const pending = await getPendingCount()
      if (result.state !== 'SYNCED' || pending > 0) {
        throw new Error("We're still saving your changes. Try again in a moment.")
      }
      // Lock locally before the grant so no edit can slip in after the check.
      setBudgetEditLocked(true)
      try {
        await respondToAssist(edit.leaseId, true)
      } catch (grantError) {
        setBudgetEditLocked(false)
        throw grantError
      }
      await refresh()
    } catch (acceptError) {
      setError(acceptError instanceof Error ? acceptError.message : 'Something went wrong.')
    } finally {
      setBusy(false)
    }
  }, [userId, edit.leaseId, refresh])

  const decline = useCallback(async () => {
    if (!edit.leaseId) return
    setBusy(true)
    setError(null)
    try {
      await respondToAssist(edit.leaseId, false)
      await refresh()
    } catch (declineError) {
      setError(declineError instanceof Error ? declineError.message : 'Something went wrong.')
    } finally {
      setBusy(false)
    }
  }, [edit.leaseId, refresh])

  const takeBack = useCallback(async () => {
    if (!edit.leaseId) return
    setBusy(true)
    setError(null)
    try {
      await takeBackEditing(edit.leaseId)
      await refresh()
    } catch (takeBackError) {
      setError(takeBackError instanceof Error ? takeBackError.message : 'Something went wrong.')
    } finally {
      setBusy(false)
    }
  }, [edit.leaseId, refresh])

  return (
    <BudgetEditLockContext.Provider
      value={{ phase, edit, waitingForConnection, busy, error, accept, decline, takeBack }}
    >
      {children}
    </BudgetEditLockContext.Provider>
  )
}

export function useBudgetEditLock(): BudgetEditLockValue {
  const context = useContext(BudgetEditLockContext)
  if (!context) {
    throw new Error('useBudgetEditLock must be used within BudgetEditLockProvider')
  }
  return context
}
