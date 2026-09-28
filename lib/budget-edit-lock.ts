import { db } from '@/lib/db'
import { supabase } from '@/lib/supabase'
import { isRealtimeEnabled } from '@/lib/realtime'
import type { BudgetEditLeaseMode, BudgetEditLeaseStatus } from '@/types/database'

const LOCK_SETTING_KEY = '__budget_edit_lock'

export interface FamilyEditState {
  locked: boolean
  leaseId: string | null
  mode: BudgetEditLeaseMode | null
  status: BudgetEditLeaseStatus | null
  coachName: string | null
  expiresAt: string | null
  requestExpiresAt: string | null
}

export const UNLOCKED_STATE: FamilyEditState = {
  locked: false,
  leaseId: null,
  mode: null,
  status: null,
  coachName: null,
  expiresAt: null,
  requestExpiresAt: null,
}

interface RawEditState {
  locked?: boolean
  lease_id?: string
  mode?: BudgetEditLeaseMode
  status?: BudgetEditLeaseStatus
  coach_name?: string
  expires_at?: string | null
  request_expires_at?: string | null
}

export class EditStateUnavailable extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'EditStateUnavailable'
  }
}

function isMissingFunction(error: { code?: string; message?: string }): boolean {
  return error.code === 'PGRST202' || /could not find the function/i.test(error.message || '')
}

/**
 * Server truth for this family's edit lease. Throws EditStateUnavailable on
 * network/server errors so callers keep the last known state instead of
 * unlocking on a failed check.
 */
export async function fetchMyEditState(): Promise<FamilyEditState> {
  const { data, error } = await supabase.rpc('get_my_edit_state')
  if (error) {
    // Migration not applied yet: the feature is off and nothing can lock.
    if (isMissingFunction(error)) return UNLOCKED_STATE
    throw new EditStateUnavailable(error.message)
  }
  const raw = (data ?? {}) as RawEditState
  if (!raw.lease_id) return UNLOCKED_STATE
  return {
    locked: Boolean(raw.locked),
    leaseId: raw.lease_id,
    mode: raw.mode ?? null,
    status: raw.status ?? null,
    coachName: raw.coach_name ?? null,
    expiresAt: raw.expires_at ?? null,
    requestExpiresAt: raw.request_expires_at ?? null,
  }
}

export async function claimFamilyBudget(): Promise<void> {
  const { error } = await supabase.rpc('claim_family_budget')
  if (error && !isMissingFunction(error)) throw new Error(error.message)
}

export async function respondToAssist(leaseId: string, accept: boolean): Promise<void> {
  const { error } = await supabase.rpc('family_respond_assist', {
    p_lease: leaseId,
    p_accept: accept,
  })
  if (error) {
    throw new Error(
      error.message.includes('REQUEST_NOT_FOUND')
        ? 'That request has expired. Ask your coach to send it again.'
        : error.message,
    )
  }
}

export async function takeBackEditing(leaseId: string): Promise<void> {
  const { error } = await supabase.rpc('end_edit_lease', { p_lease: leaseId })
  if (error && !error.message.includes('LEASE_NOT_FOUND')) throw new Error(error.message)
}

/** Remembered so an offline reload stays locked until the server says otherwise. */
export async function readPersistedLock(userId: string): Promise<FamilyEditState | null> {
  const row = await db.settings.get(LOCK_SETTING_KEY)
  if (!row?.value) return null
  try {
    const parsed = JSON.parse(row.value) as { userId: string; state: FamilyEditState }
    return parsed.userId === userId && parsed.state.locked ? parsed.state : null
  } catch {
    return null
  }
}

export async function persistLock(userId: string, state: FamilyEditState | null): Promise<void> {
  if (state?.locked) {
    await db.settings.put({ key: LOCK_SETTING_KEY, value: JSON.stringify({ userId, state }) })
  } else {
    await db.settings.delete(LOCK_SETTING_KEY)
  }
}

export function subscribeToMyEditLeases(userId: string, onChange: () => void): () => void {
  if (!userId || !isRealtimeEnabled()) return () => {}
  const channel = supabase
    .channel(`edit-lease:${userId}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'budget_edit_leases', filter: `user_id=eq.${userId}` },
      () => onChange(),
    )
    .subscribe()
  return () => {
    void supabase.removeChannel(channel)
  }
}
