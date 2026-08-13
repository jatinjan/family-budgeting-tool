import { supabase } from '@/lib/supabase'

const BUDGET_TABLES = ['households', 'adults', 'children', 'categories', 'expense_items'] as const

export function isRealtimeEnabled(): boolean {
  return process.env.NEXT_PUBLIC_ENABLE_REALTIME !== 'false'
}

/**
 * Subscribe to a family's cloud budget rows. Realtime respects RLS:
 * the family sees their own rows; admins see them via existing SELECT policies.
 */
export function subscribeToFamilyBudget(
  userId: string,
  onChange: () => void,
  onStatus?: (live: boolean) => void,
): () => void {
  if (!userId || !isRealtimeEnabled()) {
    onStatus?.(false)
    return () => {}
  }

  const channel = supabase.channel(`family-budget:${userId}`)

  for (const table of BUDGET_TABLES) {
    channel.on(
      'postgres_changes',
      { event: '*', schema: 'public', table, filter: `user_id=eq.${userId}` },
      () => onChange(),
    )
  }

  channel.on(
    'postgres_changes',
    { event: '*', schema: 'public', table: 'profiles', filter: `id=eq.${userId}` },
    () => onChange(),
  )

  channel.subscribe((status) => {
    onStatus?.(status === 'SUBSCRIBED')
  })

  return () => {
    void supabase.removeChannel(channel)
  }
}
