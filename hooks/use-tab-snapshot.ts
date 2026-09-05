'use client'

/**
 * In-memory last-render snapshot for customer tab pages that remount on navigation.
 * Used only by Dashboard / Planning / Summary (see docs/specs/tab-switch-loading.md).
 */
const snapshots = new Map<string, unknown>()

export function peekTabSnapshot<T>(key: string): T | undefined {
  return snapshots.get(key) as T | undefined
}

export function rememberTabSnapshot<T>(key: string, value: T): void {
  snapshots.set(key, value)
}

export function useTabSnapshot<T>(key: string): {
  snapshot: T | undefined
  remember: (value: T) => void
} {
  return {
    snapshot: peekTabSnapshot<T>(key),
    remember: (value: T) => rememberTabSnapshot(key, value),
  }
}
