# Sync Layer Specification

**Status:** Ready for implementation  
**Priority:** P0  
**Dependencies:** Auth flow, Supabase schema deployed

---

## Overview

This spec defines the bidirectional sync layer between IndexedDB (local/offline) and Supabase (cloud). The sync layer enables offline-first functionality while ensuring data consistency.

---

## 1. Sync State Machine

### 1.1 States

| State | Description | UI Indicator |
|-------|-------------|--------------|
| `LOCAL_ONLY` | User not logged in, data exists only in IndexedDB | "Sign in to sync" badge |
| `SYNCED` | All local data matches cloud | Hidden or green checkmark |
| `PENDING` | Changes queued, waiting to sync | Yellow dot |
| `SYNCING` | Currently uploading/downloading | Spinner + "Syncing..." |
| `FAILED` | Sync attempt failed | Red warning + "Retry" |
| `CONFLICT` | Same record modified on both sides | "Resolve" dialog (v1.1) |

### 1.2 State Transitions

```
┌─────────────┐
│ LOCAL_ONLY  │ ←── No auth session
└──────┬──────┘
       │ Sign in + migrate
       ▼
┌─────────────┐
│   SYNCED    │ ←── All records synced
└──────┬──────┘
       │ User edits data
       ▼
┌─────────────┐
│   PENDING   │ ←── Changes queued
└──────┬──────┘
       │ Online + debounce expires
       ▼
┌─────────────┐
│   SYNCING   │ ←── Upload/download in progress
└──────┬──────┘
       │
       ├── Success ──► SYNCED
       │
       └── Failure ──► FAILED ──► retry ──► SYNCING
```

### 1.3 Transition Logic

```typescript
type SyncState = 'LOCAL_ONLY' | 'SYNCED' | 'PENDING' | 'SYNCING' | 'FAILED' | 'CONFLICT';

interface SyncTransition {
  from: SyncState;
  to: SyncState;
  trigger: string;
  condition?: () => boolean;
}

const transitions: SyncTransition[] = [
  { from: 'LOCAL_ONLY', to: 'SYNCED', trigger: 'AUTH_SUCCESS' },
  { from: 'SYNCED', to: 'PENDING', trigger: 'DATA_CHANGED' },
  { from: 'PENDING', to: 'SYNCING', trigger: 'SYNC_START', condition: () => navigator.onLine },
  { from: 'SYNCING', to: 'SYNCED', trigger: 'SYNC_SUCCESS' },
  { from: 'SYNCING', to: 'FAILED', trigger: 'SYNC_ERROR' },
  { from: 'FAILED', to: 'SYNCING', trigger: 'RETRY' },
  { from: 'FAILED', to: 'PENDING', trigger: 'RETRY_LATER' },
];
```

---

## 2. Sync Record Schema

### 2.1 IndexedDB Record with Sync Metadata

Each record in IndexedDB includes sync metadata:

```typescript
interface SyncMeta {
  syncStatus: 'LOCAL_ONLY' | 'SYNCED' | 'PENDING' | 'FAILED';
  lastModified: number;       // Local timestamp (Date.now())
  lastSynced: number | null;  // Cloud timestamp
  syncAttempts: number;       // For exponential backoff
  cloudId: string | null;     // Supabase UUID (null for new local records)
}

// Example: ExpenseItem with sync metadata
interface LocalExpenseItem extends ExpenseItem, SyncMeta {}
```

### 2.2 Dexie Schema Update

```typescript
// lib/db.ts
const db = new Dexie('FamilyBudget');

db.version(2).stores({
  households: '++id, user_id, cloudId, syncStatus',
  adults: '++id, user_id, cloudId, syncStatus',
  children: '++id, user_id, cloudId, syncStatus',
  categories: '++id, user_id, entity_type, entity_id, cloudId, syncStatus',
  expenseItems: '++id, user_id, category_id, cloudId, syncStatus',
  syncQueue: '++id, table, operation, recordId, timestamp',
});
```

---

## 3. Sync Operations

### 3.1 Push to Cloud (Local → Supabase)

```typescript
// lib/sync.ts
async function pushToCloud(): Promise<SyncResult> {
  const pendingRecords = await getAllPendingRecords();
  
  if (pendingRecords.length === 0) {
    return { success: true, synced: 0 };
  }
  
  setSyncState('SYNCING');
  
  try {
    // Group by table for batch operations
    const grouped = groupByTable(pendingRecords);
    
    for (const [table, records] of Object.entries(grouped)) {
      // Separate inserts, updates, deletes
      const inserts = records.filter(r => !r.cloudId);
      const updates = records.filter(r => r.cloudId && r.syncStatus === 'PENDING');
      const deletes = records.filter(r => r.markedForDeletion);
      
      // Batch insert new records
      if (inserts.length > 0) {
        const { data, error } = await supabase
          .from(table)
          .insert(inserts.map(r => toCloudRecord(r)))
          .select();
        
        if (error) throw error;
        
        // Update local records with cloud IDs
        for (let i = 0; i < data.length; i++) {
          await db[table].update(inserts[i].id, {
            cloudId: data[i].id,
            syncStatus: 'SYNCED',
            lastSynced: Date.now(),
          });
        }
      }
      
      // Batch update existing records
      if (updates.length > 0) {
        const { error } = await supabase
          .from(table)
          .upsert(updates.map(r => toCloudRecord(r)));
        
        if (error) throw error;
        
        // Mark as synced
        await markRecordsSynced(table, updates.map(r => r.id));
      }
      
      // Batch delete
      if (deletes.length > 0) {
        const { error } = await supabase
          .from(table)
          .delete()
          .in('id', deletes.map(r => r.cloudId));
        
        if (error) throw error;
        
        // Remove from local DB
        await db[table].bulkDelete(deletes.map(r => r.id));
      }
    }
    
    setSyncState('SYNCED');
    return { success: true, synced: pendingRecords.length };
    
  } catch (error) {
    setSyncState('FAILED');
    incrementSyncAttempts(pendingRecords);
    return { success: false, error: error.message };
  }
}
```

### 3.2 Pull from Cloud (Supabase → Local)

```typescript
async function pullFromCloud(userId: string): Promise<SyncResult> {
  setSyncState('SYNCING');
  
  try {
    // Fetch all user data in parallel
    const [households, adults, children, categories, expenseItems] = await Promise.all([
      supabase.from('households').select('*').eq('user_id', userId),
      supabase.from('adults').select('*').eq('user_id', userId),
      supabase.from('children').select('*').eq('user_id', userId),
      supabase.from('categories').select('*').eq('user_id', userId),
      supabase.from('expense_items').select('*').eq('user_id', userId),
    ]);
    
    // Upsert into IndexedDB (cloud wins for initial pull)
    await db.transaction('rw', [db.households, db.adults, db.children, db.categories, db.expenseItems], async () => {
      if (households.data) {
        await db.households.bulkPut(households.data.map(r => toLocalRecord(r, 'SYNCED')));
      }
      if (adults.data) {
        await db.adults.bulkPut(adults.data.map(r => toLocalRecord(r, 'SYNCED')));
      }
      if (children.data) {
        await db.children.bulkPut(children.data.map(r => toLocalRecord(r, 'SYNCED')));
      }
      if (categories.data) {
        await db.categories.bulkPut(categories.data.map(r => toLocalRecord(r, 'SYNCED')));
      }
      if (expenseItems.data) {
        await db.expenseItems.bulkPut(expenseItems.data.map(r => toLocalRecord(r, 'SYNCED')));
      }
    });
    
    setSyncState('SYNCED');
    return { success: true };
    
  } catch (error) {
    setSyncState('FAILED');
    return { success: false, error: error.message };
  }
}
```

### 3.3 Bidirectional Sync

```typescript
async function fullSync(userId: string): Promise<SyncResult> {
  // 1. Push local changes first
  const pushResult = await pushToCloud();
  
  if (!pushResult.success) {
    return pushResult;
  }
  
  // 2. Then pull remote changes
  const pullResult = await pullFromCloud(userId);
  
  return pullResult;
}
```

---

## 4. Conflict Resolution

### 4.1 MVP Strategy: Last-Write-Wins

```typescript
function resolveConflict(local: LocalRecord, remote: CloudRecord): LocalRecord | CloudRecord {
  const localTime = local.lastModified;
  const remoteTime = new Date(remote.updated_at).getTime();
  
  return localTime > remoteTime ? local : remote;
}
```

### 4.2 Future (v1.1): User Choice

```typescript
interface ConflictResolution {
  recordId: string;
  table: string;
  localVersion: Record<string, any>;
  remoteVersion: Record<string, any>;
  resolvedBy: 'local' | 'remote' | 'merge';
  resolvedAt: number;
}

// Present UI to user
function showConflictDialog(conflict: Conflict): Promise<'local' | 'remote'> {
  // Show both versions side-by-side
  // User picks which to keep
}
```

---

## 5. Offline Detection

### 5.1 Online/Offline Listeners

```typescript
// lib/sync.ts
function initOfflineDetection() {
  // Initial state
  setIsOnline(navigator.onLine);
  
  // Listen for changes
  window.addEventListener('online', () => {
    setIsOnline(true);
    showToast('Back online');
    triggerSync();
  });
  
  window.addEventListener('offline', () => {
    setIsOnline(false);
    showToast('You are offline. Changes will sync when connected.');
  });
}
```

### 5.2 Offline Banner Component

```tsx
// components/offline-banner.tsx
export function OfflineBanner() {
  const { isOnline } = useSync();
  
  if (isOnline) return null;
  
  return (
    <div className="fixed top-0 inset-x-0 bg-amber-500 text-white text-center py-2 z-50">
      <WifiOff className="inline h-4 w-4 mr-2" />
      You're offline. Changes will sync when you reconnect.
    </div>
  );
}
```

---

## 6. Retry Strategy

### 6.1 Exponential Backoff

```typescript
const RETRY_CONFIG = {
  maxAttempts: 5,
  baseDelayMs: 1000,
  maxDelayMs: 60000,
  backoffMultiplier: 2,
};

function getRetryDelay(attempt: number): number {
  const delay = RETRY_CONFIG.baseDelayMs * Math.pow(RETRY_CONFIG.backoffMultiplier, attempt);
  const jitter = Math.random() * 1000; // Add jitter to prevent thundering herd
  return Math.min(delay + jitter, RETRY_CONFIG.maxDelayMs);
}

// Retry schedule: ~1s → ~2s → ~4s → ~8s → ~16s → give up
```

### 6.2 Auto-Retry Logic

```typescript
async function syncWithRetry(): Promise<void> {
  const pendingRecords = await getPendingRecords();
  
  for (const record of pendingRecords) {
    if (record.syncAttempts >= RETRY_CONFIG.maxAttempts) {
      // Mark as permanently failed, require manual intervention
      await markPermanentlyFailed(record);
      continue;
    }
    
    const delay = getRetryDelay(record.syncAttempts);
    
    setTimeout(async () => {
      try {
        await syncRecord(record);
      } catch (error) {
        await incrementSyncAttempts(record);
      }
    }, delay);
  }
}
```

---

## 7. Debouncing

### 7.1 Debounce Config

```typescript
const DEBOUNCE_MS = 500; // Wait 500ms after last change before syncing

let debounceTimer: NodeJS.Timeout | null = null;

function queueSync() {
  if (debounceTimer) {
    clearTimeout(debounceTimer);
  }
  
  debounceTimer = setTimeout(() => {
    if (navigator.onLine && getSyncState() !== 'SYNCING') {
      pushToCloud();
    }
  }, DEBOUNCE_MS);
}
```

### 7.2 Hook into Data Changes

```typescript
// Called whenever data is modified
async function saveExpenseItem(item: ExpenseItem): Promise<void> {
  // 1. Save to IndexedDB immediately
  await db.expenseItems.put({
    ...item,
    syncStatus: 'PENDING',
    lastModified: Date.now(),
  });
  
  // 2. Queue sync (debounced)
  queueSync();
}
```

---

## 8. SyncProvider Context

### 8.1 Interface

```typescript
interface SyncContextType {
  syncState: SyncState;
  isOnline: boolean;
  pendingCount: number;
  lastSynced: Date | null;
  triggerSync: () => Promise<void>;
  retryFailed: () => Promise<void>;
}
```

### 8.2 Implementation

```typescript
// contexts/SyncContext.tsx
export function SyncProvider({ children }: { children: React.ReactNode }) {
  const [syncState, setSyncState] = useState<SyncState>('LOCAL_ONLY');
  const [isOnline, setIsOnline] = useState(true);
  const [pendingCount, setPendingCount] = useState(0);
  const [lastSynced, setLastSynced] = useState<Date | null>(null);
  const { user } = useAuth();
  
  useEffect(() => {
    initOfflineDetection();
    
    if (user) {
      // Initial sync on auth
      fullSync(user.id);
      
      // Subscribe to realtime changes (optional, v1.1)
      subscribeToChanges(user.id);
    }
  }, [user]);
  
  // ... rest of implementation
}
```

---

## 9. Files to Create/Modify

| File | Action | Description |
|------|--------|-------------|
| `lib/sync.ts` | Create | Core sync logic |
| `lib/db.ts` | Modify | Add sync metadata to schemas |
| `contexts/SyncContext.tsx` | Create | Sync state provider |
| `hooks/use-sync.ts` | Create | Convenience hook |
| `components/sync-indicator.tsx` | Create | Sync status UI |
| `components/offline-banner.tsx` | Create | Offline notification |

---

## 10. Acceptance Criteria

- [ ] Data saves to IndexedDB immediately (offline-first)
- [ ] Changes sync to Supabase within 2 seconds when online
- [ ] Sync status indicator shows current state
- [ ] Offline banner appears when connection lost
- [ ] Failed syncs retry with exponential backoff
- [ ] Sync resumes automatically when coming back online
- [ ] User can manually trigger sync
- [ ] Last sync timestamp displayed
- [ ] Pending changes count displayed
- [ ] Conflicts resolved via last-write-wins (MVP)
