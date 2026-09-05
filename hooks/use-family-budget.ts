'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { subscribeToFamilyBudget } from '@/lib/realtime'
import { fetchCloudBudgetRows } from '@/lib/budget-repository'
import type { Adult, Category, Child, ExpenseItem, Household, Profile } from '@/types/database'

export interface FamilyBudget {
  profile: Profile
  household: Household | null
  children: Child[]
  adults: Adult[]
  categories: Category[]
  expenseItems: ExpenseItem[]
  lastUpdatedAt: string | null
}

export interface UseFamilyBudgetResult {
  data: FamilyBudget | null
  loading: boolean
  error: string | null
  live: boolean
  refresh: (options?: { silent?: boolean }) => Promise<void>
}

export async function fetchFamilyBudget(userId: string): Promise<FamilyBudget> {
  const [profileResult, budget] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', userId).single(),
    fetchCloudBudgetRows(userId),
  ])

  if (profileResult.error || !profileResult.data) {
    throw new Error('Family not found')
  }

  const profile = profileResult.data as Profile
  const household = budget.households[0] ?? null
  const { children, adults, categories, expenseItems } = budget

  const timestamps = [
    household?.updated_at,
    ...children.map((child) => child.updated_at),
    ...adults.map((adult) => adult.updated_at),
    ...categories.map((category) => category.updated_at),
    ...expenseItems.map((item) => item.updated_at),
  ].filter(Boolean) as string[]

  return {
    profile,
    household,
    children,
    adults,
    categories,
    expenseItems,
    lastUpdatedAt: timestamps.sort().at(-1) || profile.last_active_at,
  }
}

export function useFamilyBudget(userId: string): UseFamilyBudgetResult {
  const [data, setData] = useState<FamilyBudget | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [live, setLive] = useState(false)
  const liveRefreshTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const refresh = useCallback(async (options?: { silent?: boolean }) => {
    if (!userId) {
      setData(null)
      setError('Family not found')
      setLoading(false)
      return
    }

    if (!options?.silent) {
      setLoading(true)
    }
    try {
      const budget = await fetchFamilyBudget(userId)
      setData(budget)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load family data')
    } finally {
      if (!options?.silent) {
        setLoading(false)
      }
    }
  }, [userId])

  useEffect(() => {
    void refresh()
  }, [refresh])

  useEffect(() => {
    if (!userId) {
      setLive(false)
      return
    }

    const unsubscribe = subscribeToFamilyBudget(
      userId,
      () => {
        if (liveRefreshTimer.current) {
          clearTimeout(liveRefreshTimer.current)
        }
        liveRefreshTimer.current = setTimeout(() => {
          void refresh({ silent: true })
        }, 200)
      },
      setLive,
    )

    return () => {
      if (liveRefreshTimer.current) {
        clearTimeout(liveRefreshTimer.current)
      }
      unsubscribe()
    }
  }, [userId, refresh])

  return { data, loading, error, live, refresh }
}