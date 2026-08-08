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

export interface SyncMeta {
  syncStatus: SyncStatus;
  lastModified: number;
  lastSynced: number | null;
  syncAttempts: number;
  cloudId: string | null;
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
}

export interface SyncQueueItem {
  id?: number;
  table: string;
  operation: 'INSERT' | 'UPDATE' | 'DELETE';
  recordId: number;
  cloudId: string | null;
  timestamp: number;
  attempts: number;
}

export interface SyncContextType {
  syncState: GlobalSyncState;
  isOnline: boolean;
  pendingCount: number;
  lastSynced: Date | null;
  triggerSync: () => Promise<SyncResult>;
  retryFailed: () => Promise<SyncResult>;
  pullFromCloud: () => Promise<SyncResult>;
}

export const DEFAULT_SYNC_META: SyncMeta = {
  syncStatus: 'LOCAL_ONLY',
  lastModified: Date.now(),
  lastSynced: null,
  syncAttempts: 0,
  cloudId: null,
};

export interface CloudRecord {
  id: string;
  user_id: string;
  created_at: string;
  updated_at?: string;
}
