/**
 * Sync Layer for My Balanced Family Finances
 * Handles bidirectional sync between IndexedDB and Supabase
 */

import { db, type SyncableFields } from './db';
import { supabase } from './supabase';
import type { SyncResult, SyncStatus, GlobalSyncState } from '@/types/sync';
import {
  isCheckConstraintError,
  isUniqueViolation,
  mapFrequencyToCloud,
  mapHousingTypeFromCloud,
  mapHousingTypeToCloud,
  mapSchoolLevelFromCloud,
  mapSchoolLevelToCloud,
  withCloudSafeFields,
} from './sync-field-map';

const DEBOUNCE_MS = 200;
const MAX_RETRY_ATTEMPTS = 5;
const BASE_RETRY_DELAY_MS = 1000;
const MAX_RETRY_DELAY_MS = 60000;

let debounceTimer: ReturnType<typeof setTimeout> | null = null;
let currentSyncState: GlobalSyncState = 'LOCAL_ONLY';
let syncStateListeners: Set<(state: GlobalSyncState) => void> = new Set();
let syncLockDepth = 0;
let syncQueuedDuringPush = false;

export function getSyncState(): GlobalSyncState {
  return currentSyncState;
}

export function setSyncState(state: GlobalSyncState): void {
  currentSyncState = state;
  syncStateListeners.forEach(listener => listener(state));
}

export function subscribeSyncState(listener: (state: GlobalSyncState) => void): () => void {
  syncStateListeners.add(listener);
  return () => syncStateListeners.delete(listener);
}

function getRetryDelay(attempt: number): number {
  const delay = BASE_RETRY_DELAY_MS * Math.pow(2, attempt);
  const jitter = Math.random() * 1000;
  return Math.min(delay + jitter, MAX_RETRY_DELAY_MS);
}

const SYNCABLE_TABLES = [
  'children', 'adults', 'households',
  'categories', 'adultCategories', 'householdCategories',
  'items', 'adultItems', 'householdItems',
] as const

let writeHooksAttached = false

export function attachSyncWriteHooks(): void {
  if (writeHooksAttached || typeof window === 'undefined') return
  writeHooksAttached = true

  for (const tableName of SYNCABLE_TABLES) {
    db.table(tableName).hook('creating', (_key, obj) => {
      const record = obj as SyncableFields
      if (record.syncStatus === 'SYNCED' || record.cloudId) {
        return
      }
      record.syncStatus = 'PENDING'
      record.lastModified = Date.now()
      record.lastSynced = record.lastSynced ?? null
      record.syncAttempts = record.syncAttempts ?? 0
      record.cloudId = record.cloudId ?? null
      queueSync()
    })

    db.table(tableName).hook('updating', (mods) => {
      const changes = mods as Partial<SyncableFields> & Record<string, unknown>
      const keys = Object.keys(changes)
      const onlySyncMeta = keys.every((key) =>
        ['syncStatus', 'lastSynced', 'syncAttempts', 'cloudId', 'lastModified'].includes(key)
      )
      if (onlySyncMeta || changes.syncStatus === 'SYNCED') {
        return changes
      }
      queueSync()
      return {
        ...changes,
        syncStatus: 'PENDING' as SyncStatus,
        lastModified: Date.now(),
      }
    })
  }
}

function beginSync(): void {
  syncLockDepth += 1;
}

function endSync(): void {
  syncLockDepth = Math.max(0, syncLockDepth - 1);
  if (syncLockDepth === 0 && syncQueuedDuringPush) {
    syncQueuedDuringPush = false;
    queueSync();
  }
}

export function queueSync(): void {
  if (debounceTimer) {
    clearTimeout(debounceTimer);
  }

  debounceTimer = setTimeout(async () => {
    if (!navigator.onLine) {
      return;
    }
    if (syncLockDepth > 0 || currentSyncState === 'SYNCING') {
      syncQueuedDuringPush = true;
      return;
    }
    await pushToCloud();
  }, DEBOUNCE_MS);
}

export async function markRecordPending<T extends Partial<SyncableFields>>(
  table: 'children' | 'adults' | 'households' | 'categories' | 'adultCategories' | 'householdCategories' | 'items' | 'adultItems' | 'householdItems',
  id: number
): Promise<void> {
  await db.table(table).update(id, {
    syncStatus: 'PENDING' as SyncStatus,
    lastModified: Date.now(),
  });
  queueSync();
}

async function getAllPendingRecords(): Promise<{
  table: string;
  records: Array<{ id: number; cloudId: string | null; syncStatus: SyncStatus }>;
}[]> {
  const tables = [
    'children', 'adults', 'households',
    'categories', 'adultCategories', 'householdCategories',
    'items', 'adultItems', 'householdItems'
  ];

  const results: { table: string; records: Array<{ id: number; cloudId: string | null; syncStatus: SyncStatus }> }[] = [];

  for (const tableName of tables) {
    const pending = await db.table(tableName)
      .filter((record: SyncableFields) =>
        record.syncStatus === 'PENDING' ||
        record.syncStatus === 'FAILED' ||
        record.syncStatus === 'LOCAL_ONLY' ||
        !record.syncStatus
      )
      .toArray();

    if (pending.length > 0) {
      results.push({
        table: tableName,
        records: pending.map((r: { id?: number; cloudId?: string | null; syncStatus?: SyncStatus }) => ({
          id: r.id as number,
          cloudId: r.cloudId || null,
          syncStatus: r.syncStatus || 'LOCAL_ONLY' as SyncStatus,
        })),
      });
    }
  }

  return results;
}

export async function getPendingCount(): Promise<number> {
  const pending = await getAllPendingRecords();
  return pending.reduce((sum, table) => sum + table.records.length, 0);
}

function mapFrequency(frequency: unknown): string {
  return mapFrequencyToCloud(frequency)
}

const PUSH_PHASES = [
  ['households', 'adults', 'children'],
  ['householdCategories', 'adultCategories', 'categories'],
  ['householdItems', 'adultItems', 'items'],
] as const

async function getPendingForTable(tableName: string) {
  return db.table(tableName)
    .filter((record: SyncableFields) =>
      record.syncStatus === 'PENDING' ||
      record.syncStatus === 'FAILED' ||
      record.syncStatus === 'LOCAL_ONLY' ||
      !record.syncStatus
    )
    .toArray()
}

async function resolveParentCloudId(
  table: string,
  record: Record<string, unknown>
): Promise<string | null> {
  if (table === 'categories') {
    const child = await db.children.get(record.childId as number)
    return child?.cloudId ?? null
  }
  if (table === 'adultCategories') {
    const adult = await db.adults.get(record.adultId as number)
    return adult?.cloudId ?? null
  }
  if (table === 'householdCategories') {
    const household = await db.households.get(record.householdId as number)
    return household?.cloudId ?? null
  }
  if (table === 'items') {
    const category = await db.categories.get(record.categoryId as number)
    return category?.cloudId ?? null
  }
  if (table === 'adultItems') {
    const category = await db.adultCategories.get(record.categoryId as number)
    return category?.cloudId ?? null
  }
  if (table === 'householdItems') {
    const category = await db.householdCategories.get(record.categoryId as number)
    return category?.cloudId ?? null
  }
  return null
}

async function mapLocalToCloud(
  table: string,
  record: Record<string, unknown>,
  userId: string
): Promise<Record<string, unknown> | null> {
  const baseFields = {
    user_id: userId,
    updated_at: new Date().toISOString(),
  }

  const cloudIdField = record.cloudId ? { id: record.cloudId } : {}

  switch (table) {
    case 'children': {
      const schoolLevel =
        typeof record.schoolLevel === 'string' ? record.schoolLevel.trim() : ''
      return {
        ...cloudIdField,
        ...baseFields,
        name: record.name,
        age: record.age,
        school_level: schoolLevel || mapSchoolLevelToCloud(record.schoolLevel),
      }
    }

    case 'adults':
      return {
        ...cloudIdField,
        ...baseFields,
        name: record.name,
        age: record.age,
      }

    case 'households': {
      const housingType =
        typeof record.housingType === 'string' ? record.housingType.trim() : ''
      return {
        ...cloudIdField,
        ...baseFields,
        name: record.name,
        housing_type: housingType || mapHousingTypeToCloud(record.housingType),
        members: record.members,
      }
    }

    case 'categories':
    case 'adultCategories':
    case 'householdCategories': {
      const entityId = await resolveParentCloudId(table, record)
      if (!entityId) return null
      return {
        ...cloudIdField,
        ...baseFields,
        entity_type: table === 'adultCategories' ? 'adult' : table === 'householdCategories' ? 'household' : 'child',
        entity_id: entityId,
        name: record.name,
        description: record.description ?? null,
        is_percentage_based: record.isPercentageBased || false,
        percentage_value: record.percentageValue || 15,
        sort_order: record.order ?? 0,
      }
    }

    case 'items':
    case 'adultItems':
    case 'householdItems': {
      const categoryId = await resolveParentCloudId(table, record)
      if (!categoryId) return null
      return {
        ...cloudIdField,
        ...baseFields,
        category_id: categoryId,
        name: record.name,
        cost: record.cost ?? 0,
        frequency: mapFrequency(record.frequency),
        quantity: record.quantity ?? 1,
        total: record.total ?? 0,
        need_want: record.needWant ?? null,
        adjusted_total: record.adjustedTotal ?? null,
      }
    }

    default:
      return { ...cloudIdField, ...baseFields }
  }
}

export async function pushToCloud(): Promise<SyncResult> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: 'Not authenticated' };
  }

  const pendingCount = await getPendingCount();
  if (pendingCount === 0) {
    setSyncState('SYNCED');
    return { success: true, synced: 0 };
  }

  beginSync();
  setSyncState('SYNCING');
  let syncedCount = 0;
  const errors: string[] = [];

  try {
    for (const phase of PUSH_PHASES) {
      for (const table of phase) {
        const records = await getPendingForTable(table);

        for (const record of records) {
          const fullRecord = record as SyncableFields & { id: number; cloudId?: string | null };
          if (fullRecord.syncStatus === 'FAILED' && (fullRecord.syncAttempts || 0) >= MAX_RETRY_ATTEMPTS) {
            continue;
          }

          const cloudTable = getCloudTableName(table);
          const cloudRecord = await mapLocalToCloud(table, fullRecord as unknown as Record<string, unknown>, user.id);
          if (!cloudRecord) {
            continue;
          }

          try {
            if (fullRecord.cloudId) {
              const { error } = await updateCloudRow(cloudTable, fullRecord.cloudId, table, cloudRecord);
              if (error) throw error;
            } else {
              const cloudId = await insertCloudRow(table, cloudTable, cloudRecord, user.id);
              if (!cloudId) {
                throw new Error('Insert returned no id');
              }
              await db.table(table).update(fullRecord.id, {
                cloudId,
              });
            }

            await db.table(table).update(fullRecord.id, {
              syncStatus: 'SYNCED' as SyncStatus,
              lastSynced: Date.now(),
              syncAttempts: 0,
            });

            syncedCount++;
          } catch (err) {
            const errorMessage = err instanceof Error ? err.message : String(err);
            errors.push(`${table}[${fullRecord.id}]: ${errorMessage}`);

            await db.table(table).update(fullRecord.id, {
              syncStatus: 'FAILED' as SyncStatus,
              syncAttempts: (fullRecord.syncAttempts || 0) + 1,
            });
          }
        }
      }
    }

    const remaining = await getPendingCount();

    if (errors.length > 0) {
      setSyncState('FAILED');
      return { success: false, synced: syncedCount, failed: errors.length, errors };
    }

    if (remaining > 0) {
      setSyncState('PENDING');
      return { success: true, synced: syncedCount };
    }

    setSyncState('SYNCED');
    return { success: true, synced: syncedCount };

  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    setSyncState('FAILED');
    return { success: false, error: errorMessage };
  } finally {
    endSync();
  }
}

async function updateCloudRow(
  cloudTable: string,
  cloudId: string,
  localTable: string,
  cloudRecord: Record<string, unknown>
) {
  const first = await supabase.from(cloudTable).update(cloudRecord).eq('id', cloudId);
  if (!first.error) return first;
  if (!isCheckConstraintError(first.error)) return first;
  return supabase.from(cloudTable).update(withCloudSafeFields(localTable, cloudRecord)).eq('id', cloudId);
}

async function insertCloudRow(
  localTable: string,
  cloudTable: string,
  cloudRecord: Record<string, unknown>,
  userId: string
): Promise<string | null> {
  const first = await supabase.from(cloudTable).insert(cloudRecord).select('id').single();
  if (!first.error && first.data?.id) return first.data.id as string;

  let lastError = first.error;
  if (first.error && isCheckConstraintError(first.error)) {
    const retry = await supabase
      .from(cloudTable)
      .insert(withCloudSafeFields(localTable, cloudRecord))
      .select('id')
      .single();
    if (!retry.error && retry.data?.id) return retry.data.id as string;
    lastError = retry.error || first.error;
  }

  if (localTable === 'households' && lastError && isUniqueViolation(lastError)) {
    const { data: existing, error: lookupError } = await supabase
      .from('households')
      .select('id')
      .eq('user_id', userId)
      .maybeSingle();
    if (lookupError) throw lookupError;
    if (existing?.id) {
      const { error: updError } = await updateCloudRow(
        cloudTable,
        existing.id,
        localTable,
        withCloudSafeFields(localTable, cloudRecord)
      );
      if (updError) throw updError;
      return existing.id;
    }
  }

  if (lastError) throw lastError;
  return (first.data?.id as string) || null;
}

function getCloudTableName(localTable: string): string {
  switch (localTable) {
    case 'children':
      return 'children';
    case 'adults':
      return 'adults';
    case 'households':
      return 'households';
    case 'categories':
    case 'adultCategories':
    case 'householdCategories':
      return 'categories';
    case 'items':
    case 'adultItems':
    case 'householdItems':
      return 'expense_items';
    default:
      return localTable;
  }
}

export async function pullFromCloud(options?: { silent?: boolean }): Promise<SyncResult> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: 'Not authenticated' };
  }

  if (options?.silent) {
    if (currentSyncState === 'SYNCING' || (await getPendingCount()) > 0) {
      return { success: true, synced: 0 };
    }
  } else {
    beginSync();
    setSyncState('SYNCING');
  }

  try {
    const [
      householdsRes,
      adultsRes,
      childrenRes,
      categoriesRes,
      itemsRes,
    ] = await Promise.all([
      supabase.from('households').select('*').eq('user_id', user.id),
      supabase.from('adults').select('*').eq('user_id', user.id),
      supabase.from('children').select('*').eq('user_id', user.id),
      supabase.from('categories').select('*').eq('user_id', user.id),
      supabase.from('expense_items').select('*').eq('user_id', user.id),
    ]);

    if (householdsRes.error) throw householdsRes.error;
    if (adultsRes.error) throw adultsRes.error;
    if (childrenRes.error) throw childrenRes.error;
    if (categoriesRes.error) throw categoriesRes.error;
    if (itemsRes.error) throw itemsRes.error;

    await db.transaction('rw', [
      db.households, db.adults, db.children,
      db.categories, db.adultCategories, db.householdCategories,
      db.items, db.adultItems, db.householdItems
    ], async () => {
      const syncMeta = {
        syncStatus: 'SYNCED' as SyncStatus,
        lastModified: Date.now(),
        lastSynced: Date.now(),
        syncAttempts: 0,
      };

      if (householdsRes.data && householdsRes.data.length > 0) {
        for (const h of householdsRes.data) {
          const existing = await db.households.filter(r => r.cloudId === h.id).first();
          const localData = {
            name: h.name,
            housingType: mapHousingTypeFromCloud(h.housing_type) || h.housing_type || '',
            members: h.members,
            createdAt: new Date(h.created_at),
            cloudId: h.id,
            ...syncMeta,
          };

          if (existing?.id) {
            await db.households.update(existing.id, localData);
          } else {
            await db.households.add(localData);
          }
        }
      }

      if (adultsRes.data) {
        for (const a of adultsRes.data) {
          const existing = await db.adults.filter(r => r.cloudId === a.id).first();
          const localData = {
            name: a.name,
            age: a.age || 0,
            createdAt: new Date(a.created_at),
            cloudId: a.id,
            ...syncMeta,
          };

          if (existing?.id) {
            await db.adults.update(existing.id, localData);
          } else {
            await db.adults.add(localData);
          }
        }
      }

      if (childrenRes.data) {
        for (const c of childrenRes.data) {
          const existing = await db.children.filter(r => r.cloudId === c.id).first();
          const localData = {
            name: c.name,
            age: c.age || 0,
            schoolLevel: mapSchoolLevelFromCloud(c.school_level) || c.school_level || '',
            createdAt: new Date(c.created_at),
            cloudId: c.id,
            ...syncMeta,
          };

          if (existing?.id) {
            await db.children.update(existing.id, localData);
          } else {
            await db.children.add(localData);
          }
        }
      }

      if (categoriesRes.data) {
        for (const cat of categoriesRes.data) {
          const localCat = {
            name: cat.name,
            description: cat.description || '',
            isPercentageBased: cat.is_percentage_based,
            percentageValue: cat.percentage_value,
            order: cat.sort_order,
            cloudId: cat.id,
            ...syncMeta,
          };

          switch (cat.entity_type) {
            case 'child': {
              const child = await db.children.filter(c => c.cloudId === cat.entity_id).first();
              if (child?.id) {
                const existing = await db.categories.filter(r => r.cloudId === cat.id).first();
                if (existing?.id) {
                  await db.categories.update(existing.id, { ...localCat, childId: child.id });
                } else {
                  await db.categories.add({ ...localCat, childId: child.id });
                }
              }
              break;
            }
            case 'adult': {
              const adult = await db.adults.filter(a => a.cloudId === cat.entity_id).first();
              if (adult?.id) {
                const existing = await db.adultCategories.filter(r => r.cloudId === cat.id).first();
                if (existing?.id) {
                  await db.adultCategories.update(existing.id, { ...localCat, adultId: adult.id });
                } else {
                  await db.adultCategories.add({ ...localCat, adultId: adult.id });
                }
              }
              break;
            }
            case 'household': {
              const household = await db.households.filter(h => h.cloudId === cat.entity_id).first();
              if (household?.id) {
                const existing = await db.householdCategories.filter(r => r.cloudId === cat.id).first();
                if (existing?.id) {
                  await db.householdCategories.update(existing.id, { ...localCat, householdId: household.id });
                } else {
                  await db.householdCategories.add({ ...localCat, householdId: household.id });
                }
              }
              break;
            }
          }
        }
      }

      if (itemsRes.data) {
        for (const item of itemsRes.data) {
          const localItem = {
            name: item.name,
            cost: item.cost,
            frequency: item.frequency as "monthly" | "term" | "annual" | "weekly",
            quantity: item.quantity,
            total: item.total,
            needWant: item.need_want as "need" | "want" | undefined,
            adjustedTotal: item.adjusted_total || undefined,
            cloudId: item.id,
            ...syncMeta,
          };

          const category = await db.categories.filter(c => c.cloudId === item.category_id).first();
          if (category?.id) {
            const existing = await db.items.filter(i => i.cloudId === item.id).first();
            if (existing?.id) {
              await db.items.update(existing.id, { ...localItem, categoryId: category.id });
            } else {
              await db.items.add({ ...localItem, categoryId: category.id });
            }
            continue;
          }

          const adultCategory = await db.adultCategories.filter(c => c.cloudId === item.category_id).first();
          if (adultCategory?.id) {
            const existing = await db.adultItems.filter(i => i.cloudId === item.id).first();
            if (existing?.id) {
              await db.adultItems.update(existing.id, { ...localItem, categoryId: adultCategory.id });
            } else {
              await db.adultItems.add({ ...localItem, categoryId: adultCategory.id });
            }
            continue;
          }

          const householdCategory = await db.householdCategories.filter(c => c.cloudId === item.category_id).first();
          if (householdCategory?.id) {
            const existing = await db.householdItems.filter(i => i.cloudId === item.id).first();
            if (existing?.id) {
              await db.householdItems.update(existing.id, { ...localItem, categoryId: householdCategory.id });
            } else {
              await db.householdItems.add({ ...localItem, categoryId: householdCategory.id });
            }
          }
        }
      }
    });

    if (!options?.silent) {
      setSyncState('SYNCED');
    }
    return { success: true };

  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    if (!options?.silent) {
      setSyncState('FAILED');
    }
    return { success: false, error: errorMessage };
  } finally {
    if (!options?.silent) {
      endSync();
    }
  }
}

export async function fullSync(): Promise<SyncResult> {
  beginSync();
  try {
    for (const tableName of SYNCABLE_TABLES) {
      await db.table(tableName)
        .filter((record: SyncableFields) => record.syncStatus === 'FAILED')
        .modify({ syncStatus: 'PENDING' as SyncStatus, syncAttempts: 0 });
    }

    const pushResult = await pushToCloud();
    const pullResult = await pullFromCloud();

    if (!pushResult.success) {
      setSyncState('FAILED');
      return {
        success: false,
        synced: (pushResult.synced || 0) + (pullResult.success ? 1 : 0),
        failed: pushResult.failed,
        errors: pushResult.errors,
        error: pushResult.error,
      };
    }

    if (!pullResult.success) {
      return pullResult;
    }

    return pullResult;
  } finally {
    endSync();
  }
}

export async function retryFailedSync(): Promise<SyncResult> {
  const tables = [
    'children', 'adults', 'households',
    'categories', 'adultCategories', 'householdCategories',
    'items', 'adultItems', 'householdItems'
  ];

  for (const tableName of tables) {
    await db.table(tableName)
      .filter((record: SyncableFields) => 
        record.syncStatus === 'FAILED' && 
        (record.syncAttempts || 0) < MAX_RETRY_ATTEMPTS
      )
      .modify({ syncStatus: 'PENDING' as SyncStatus });
  }

  return pushToCloud();
}

export function initOfflineDetection(
  onOnline: () => void,
  onOffline: () => void
): () => void {
  const handleOnline = () => {
    onOnline();
    if (currentSyncState === 'LOCAL_ONLY') {
      return;
    }
    queueSync();
  };

  const handleOffline = () => {
    onOffline();
  };

  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);

  return () => {
    window.removeEventListener('online', handleOnline);
    window.removeEventListener('offline', handleOffline);
  };
}

export async function getLastSyncTime(): Promise<Date | null> {
  const tables = [
    'children', 'adults', 'households',
    'categories', 'adultCategories', 'householdCategories',
    'items', 'adultItems', 'householdItems'
  ];

  let latestSync: number | null = null;

  for (const tableName of tables) {
    const records = await db.table(tableName)
      .filter((record: SyncableFields) => record.lastSynced !== null)
      .toArray();

    for (const record of records) {
      const syncTime = (record as SyncableFields).lastSynced;
      if (syncTime && (!latestSync || syncTime > latestSync)) {
        latestSync = syncTime;
      }
    }
  }

  return latestSync ? new Date(latestSync) : null;
}

if (typeof window !== 'undefined') {
  attachSyncWriteHooks();
}
