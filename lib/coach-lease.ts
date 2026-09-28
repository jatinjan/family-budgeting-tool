import { supabase } from '@/lib/supabase'
import { isRealtimeEnabled } from '@/lib/realtime'
import type { BudgetEditLease } from '@/types/database'

export type CoachLeaseState = 'none' | 'requested' | 'active'

const ERROR_MESSAGES: Record<string, string> = {
  NOT_ADMIN: 'Admin access required.',
  CANNOT_EDIT_SELF: 'You cannot open your own account here.',
  FAMILY_NOT_FOUND: 'Family not found.',
  FAMILY_ALREADY_CLAIMED: 'This family has signed in. Ask to help instead.',
  FAMILY_NOT_CLAIMED: 'This family has not signed in yet. Use Edit budget instead.',
  LEASE_HELD: 'Another coach is already working with this family.',
  LEASE_NOT_FOUND: 'That editing session has already ended.',
  NOT_LEASE_PARTY: 'This editing session belongs to someone else.',
}

export function friendlyLeaseError(message: string): string {
  const code = Object.keys(ERROR_MESSAGES).find((key) => message.includes(key))
  if (code) return ERROR_MESSAGES[code]
  if (/could not find the function/i.test(message)) {
    return 'Coach editing is not set up in the database yet. Run the coach edit migration.'
  }
  return message
}

/** Effective state from the server clock fields; status alone can be stale. */
export function leaseState(lease: BudgetEditLease | null, now = Date.now()): CoachLeaseState {
  if (!lease) return 'none'
  if (lease.status === 'requested') {
    return lease.request_expires_at && Date.parse(lease.request_expires_at) > now
      ? 'requested'
      : 'none'
  }
  if (lease.status === 'active') {
    return !lease.expires_at || Date.parse(lease.expires_at) > now ? 'active' : 'none'
  }
  return 'none'
}

export async function fetchLatestLease(familyId: string): Promise<BudgetEditLease | null> {
  const { data, error } = await supabase
    .from('budget_edit_leases')
    .select('*')
    .eq('user_id', familyId)
    .order('requested_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error) {
    if (/relation .* does not exist|could not find/i.test(error.message)) return null
    throw new Error(error.message)
  }
  return (data as BudgetEditLease | null) ?? null
}

async function callLeaseRpc(
  name: 'coach_start_setup' | 'coach_request_assist',
  familyId: string,
): Promise<BudgetEditLease> {
  const { data, error } = await supabase.rpc(name, { p_family: familyId })
  if (error) throw new Error(friendlyLeaseError(error.message))
  return data as BudgetEditLease
}

export function startSetupLease(familyId: string): Promise<BudgetEditLease> {
  return callLeaseRpc('coach_start_setup', familyId)
}

export function requestAssistLease(familyId: string): Promise<BudgetEditLease> {
  return callLeaseRpc('coach_request_assist', familyId)
}

export async function endLease(leaseId: string): Promise<void> {
  const { error } = await supabase.rpc('end_edit_lease', { p_lease: leaseId })
  if (error && !error.message.includes('LEASE_NOT_FOUND')) {
    throw new Error(friendlyLeaseError(error.message))
  }
}

export function subscribeToFamilyLease(familyId: string, onChange: () => void): () => void {
  if (!familyId || !isRealtimeEnabled()) return () => {}
  const channel = supabase
    .channel(`coach-lease:${familyId}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'budget_edit_leases', filter: `user_id=eq.${familyId}` },
      () => onChange(),
    )
    .subscribe()
  return () => {
    void supabase.removeChannel(channel)
  }
}

export function endReasonMessage(lease: BudgetEditLease | null): string {
  switch (lease?.end_reason) {
    case 'coach_done':
      return 'You finished editing.'
    case 'family_took_back':
      return 'The family took back editing.'
    case 'claimed':
      return 'The family signed in and took over their budget.'
    case 'declined':
      return 'The family said not now.'
    case 'cancelled':
      return 'You cancelled the request.'
    case 'expired':
      return 'The editing session timed out.'
    default:
      if (lease && leaseState(lease) === 'none') return 'The editing session timed out.'
      return 'Editing is not active.'
  }
}
