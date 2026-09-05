import type { SyncTrigger } from '@/types/sync'

export interface SyncPlan {
  pullBefore: true
  push: boolean
  pullAfter: boolean
}

export function getSyncPlan(trigger: SyncTrigger): SyncPlan

export function classifyPendingVersion(input: {
  pendingOperation?: 'CREATE' | 'UPDATE' | null
  expectedUpdatedAt?: string | null
  remoteUpdatedAt?: string | null
}): 'HYDRATE_CREATE' | 'PRESERVE_PENDING' | 'CONFLICT'
