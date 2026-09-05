/**
 * Sync layer type definitions
 */

export type SyncStatus = 'LOCAL_ONLY' | 'SYNCED' | 'PENDING' | 'FAILED';

export type GlobalSyncState = 
  | 'LOCAL_ONLY'
  | 'SYNCED'
  | 'PENDING'
  | 'SYNCING'
  | 'FAILED'
  | 'CONFLICT';

export type SyncTrigger =
  | 'login'
  | 'manual'
  | 'retry'
  | 'reconnect'
  | 'realtime'
  | 'local-write';

export type SyncFailureCode =
  | 'MISSING_PARENT_CLOUD_ID'
  | 'INVALID_CLOUD_PARENT'
  | 'RETRY_EXHAUSTED'
  | 'DELETE_FAILED'
  | 'PUSH_FAILED'
  | 'PULL_FAILED'
  | 'OWNER_MISMATCH'
  | 'RECOVERY_REQUIRED'
  | 'VERSION_CONFLICT';

export interface SyncRowFailure {
  code: SyncFailureCode;
  table: string;
  recordId?: number;
  cloudIdSuffix?: string;
  retryable: boolean;
  message: string;
}

export type OwnershipState = 'UNRESOLVED' | 'READY' | 'RECOVERY_REQUIRED';
export type LegacyOwnershipAction = 'START_WITH_CLOUD_DATA';

export interface SyncMeta {
  syncStatus: SyncStatus;
  lastModified: number;
  lastSynced: number | null;
  syncAttempts: number;
  cloudId: string | null;
  serverUpdatedAt?: string | null;
  pendingOperation?: 'CREATE' | 'UPDATE' | null;
  syncErrorCode?: SyncFailureCode | null;
  syncErrorMessage?: string | null;
}

export interface SyncableRecord extends SyncMeta {
  id?: number;
}

export interface SyncResult {
  success: boolean;
  synced?: number;
  failed?: number;
  error?: string;
  errors?: string[];
  failures?: SyncRowFailure[];
  state?: Exclude<GlobalSyncState, 'SYNCING' | 'LOCAL_ONLY'>;
}

export interface SyncQueueItem {
  id?: number;
  table: string;
  operation: 'INSERT' | 'UPDATE' | 'DELETE';
  recordId: number;
  cloudId: string | null;
  ownerUserId: string;
  expectedUpdatedAt?: string | null;
  timestamp: number;
  attempts: number;
  lastError?: string | null;
}

export interface SyncContextType {
  syncState: GlobalSyncState;
  isOnline: boolean;
  pendingCount: number;
  lastSynced: Date | null;
  dataRevision: number;
  ownershipState: OwnershipState;
  triggerSync: () => Promise<SyncResult>;
  retryFailed: () => Promise<SyncResult>;
  pullFromCloud: () => Promise<SyncResult>;
  resolveLegacyOwnership: (action: LegacyOwnershipAction) => Promise<SyncResult>;
}

export const DEFAULT_SYNC_META: SyncMeta = {
  syncStatus: 'LOCAL_ONLY',
  lastModified: Date.now(),
  lastSynced: null,
  syncAttempts: 0,
  cloudId: null,
  serverUpdatedAt: null,
  pendingOperation: null,
};

export interface CloudRecord {
  id: string;
  user_id: string;
  created_at: string;
  updated_at?: string;
}
