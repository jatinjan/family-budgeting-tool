/**
 * Account-scoped reconciliation coordinator for IndexedDB and Supabase.
 */

import type { Transaction } from 'dexie'
import { db, type SyncableFields } from './db'
import { supabase } from './supabase'
import { fetchCloudBudgetRows } from './budget-repository'
import type { Database } from '@/types/database'
import type {
  GlobalSyncState,
  LegacyOwnershipAction,
  OwnershipState,
  SyncFailureCode,
  SyncResult,
  SyncRowFailure,
  SyncStatus,
  SyncTrigger,
} from '@/types/sync'
import {
  isCheckConstraintError,
  isUniqueViolation,
  mapFrequencyToCloud,
  mapHousingTypeFromCloud,
  mapHousingTypeToCloud,
  mapSchoolLevelFromCloud,
  mapSchoolLevelToCloud,
  withCloudSafeFields,
} from './sync-field-map'
import { classifyPendingVersion, getSyncPlan } from './sync-policy.mjs'

const DEBOUNCE_MS = 200
const MAX_RETRY_ATTEMPTS = 5
const OWNER_SETTING_KEY = '__sync_owner_user_id'
const OWNER_HYDRATED_SETTING_KEY = '__sync_owner_hydrated_at'

const SYNCABLE_TABLES = [
  'children',
  'adults',
  'households',
  'categories',
  'adultCategories',
  'householdCategories',
  'items',
  'adultItems',
  'householdItems',
] as const

type LocalTable = (typeof SYNCABLE_TABLES)[number]
type HouseholdRow = Database['public']['Tables']['households']['Row']
type AdultRow = Database['public']['Tables']['adults']['Row']
type ChildRow = Database['public']['Tables']['children']['Row']
type CategoryRow = Database['public']['Tables']['categories']['Row']
type ItemRow = Database['public']['Tables']['expense_items']['Row']

interface CloudSnapshot {
  households: HouseholdRow[]
  adults: AdultRow[]
  children: ChildRow[]
  categories: CategoryRow[]
  items: ItemRow[]
}

interface LooseCloudError {
  message: string
  code?: string
}

interface LooseCloudResult<T> {
  data: T | null
  error: LooseCloudError | null
}

interface LooseCloudQuery<T = unknown> extends PromiseLike<LooseCloudResult<T>> {
  update(values: Record<string, unknown>): LooseCloudQuery<T>
  insert(values: Record<string, unknown>): LooseCloudQuery<T>
  delete(): LooseCloudQuery<T>
  select(columns?: string): LooseCloudQuery<T>
  eq(column: string, value: unknown): LooseCloudQuery<T>
  single(): Promise<LooseCloudResult<{ id: string }>>
  maybeSingle(): Promise<LooseCloudResult<{ id: string }>>
}

// The generated Database type predates the current Supabase client's relationship
// metadata. Keep dynamic sync-table writes structurally typed at this boundary.
const syncCloud = supabase as unknown as {
  from(table: string): LooseCloudQuery
}

interface TableCounts {
  pushed: number
  pulled: number
  deleted: number
  skipped: number
  failed: number
}

type CycleCounts = Record<LocalTable, TableCounts>

const PUSH_PHASES: readonly (readonly LocalTable[])[] = [
  ['households', 'adults', 'children'],
  ['householdCategories', 'adultCategories', 'categories'],
  ['householdItems', 'adultItems', 'items'],
]

const DELETE_ORDER: Record<LocalTable, number> = {
  items: 0,
  adultItems: 0,
  householdItems: 0,
  categories: 1,
  adultCategories: 1,
  householdCategories: 1,
  children: 2,
  adults: 2,
  households: 2,
}

let debounceTimer: ReturnType<typeof setTimeout> | null = null
let currentSyncState: GlobalSyncState = 'LOCAL_ONLY'
let currentOwnershipState: OwnershipState = 'UNRESOLVED'
let currentDataRevision = 0
let activeOwnerUserId: string | null = null
let recoveryUserId: string | null = null
let ownerMustHydrate = false
let internalMutationDepth = 0
let writeHooksAttached = false
let coordinatorPromise: Promise<SyncResult> | null = null
const queuedTriggers = new Set<SyncTrigger>()
const syncStateListeners = new Set<(state: GlobalSyncState) => void>()
const ownershipListeners = new Set<(state: OwnershipState) => void>()
const revisionListeners = new Set<(revision: number) => void>()

class DependencyFailure extends Error {
  readonly code: SyncFailureCode = 'MISSING_PARENT_CLOUD_ID'

  constructor(
    readonly table: LocalTable,
    readonly recordId: number,
  ) {
    super('Required parent has not synced yet')
    this.name = 'DependencyFailure'
  }
}

class VersionConflict extends Error {
  readonly code: SyncFailureCode = 'VERSION_CONFLICT'

  constructor(
    readonly table: LocalTable,
    readonly recordId: number,
  ) {
    super('Cloud data changed since this device last loaded it')
    this.name = 'VersionConflict'
  }
}

export function getSyncState(): GlobalSyncState {
  return currentSyncState
}

export function setSyncState(state: GlobalSyncState): void {
  if (currentSyncState === state) return
  currentSyncState = state
  syncStateListeners.forEach((listener) => listener(state))
}

export function subscribeSyncState(listener: (state: GlobalSyncState) => void): () => void {
  syncStateListeners.add(listener)
  return () => syncStateListeners.delete(listener)
}

export function getOwnershipState(): OwnershipState {
  return currentOwnershipState
}

export function getActiveOwnerUserId(): string | null {
  return activeOwnerUserId
}

function setOwnershipState(state: OwnershipState): void {
  if (currentOwnershipState === state) return
  currentOwnershipState = state
  ownershipListeners.forEach((listener) => listener(state))
}

export function subscribeOwnershipState(listener: (state: OwnershipState) => void): () => void {
  ownershipListeners.add(listener)
  return () => ownershipListeners.delete(listener)
}

export function getDataRevision(): number {
  return currentDataRevision
}

export function subscribeDataRevision(listener: (revision: number) => void): () => void {
  revisionListeners.add(listener)
  return () => revisionListeners.delete(listener)
}

function publishDataRevision(): void {
  currentDataRevision += 1
  revisionListeners.forEach((listener) => listener(currentDataRevision))
}

function makeCounts(): CycleCounts {
  return Object.fromEntries(
    SYNCABLE_TABLES.map((table) => [
      table,
      { pushed: 0, pulled: 0, deleted: 0, skipped: 0, failed: 0 },
    ]),
  ) as CycleCounts
}

function cloudIdSuffix(cloudId: string | null | undefined): string | undefined {
  return cloudId ? cloudId.slice(-6) : undefined
}

function failure(
  code: SyncFailureCode,
  table: string,
  message: string,
  retryable: boolean,
  recordId?: number,
  cloudId?: string | null,
): SyncRowFailure {
  return {
    code,
    table,
    message,
    retryable,
    recordId,
    cloudIdSuffix: cloudIdSuffix(cloudId),
  }
}

async function withInternalMutation<T>(work: () => Promise<T>): Promise<T> {
  internalMutationDepth += 1
  try {
    return await work()
  } finally {
    internalMutationDepth = Math.max(0, internalMutationDepth - 1)
  }
}

export function runWithoutSyncOutbox<T>(work: () => Promise<T>): Promise<T> {
  return withInternalMutation(work)
}

async function storedOwner(): Promise<string | null> {
  return (await db.settings.get(OWNER_SETTING_KEY))?.value || null
}

async function bindOwner(userId: string): Promise<void> {
  await db.transaction('rw', db.settings, async () => {
    await db.settings.put({ key: OWNER_SETTING_KEY, value: userId })
    await db.settings.delete(OWNER_HYDRATED_SETTING_KEY)
  })
  activeOwnerUserId = userId
  recoveryUserId = null
  ownerMustHydrate = true
}

async function markOwnerHydrated(userId: string): Promise<void> {
  await db.settings.put({
    key: OWNER_HYDRATED_SETTING_KEY,
    value: `${userId}:${Date.now()}`,
  })
}

async function budgetRowCount(): Promise<number> {
  const counts = await Promise.all(SYNCABLE_TABLES.map((table) => db.table(table).count()))
  return counts.reduce((sum, count) => sum + count, 0)
}

async function readBudgetSnapshot(): Promise<Record<string, unknown[]>> {
  const entries = await Promise.all(
    SYNCABLE_TABLES.map(async (table) => [table, await db.table(table).toArray()] as const),
  )
  const queue = await db.syncQueue.toArray()
  return { ...Object.fromEntries(entries), syncQueue: queue }
}

async function quarantineAndClear(
  ownerUserId: string | null,
  reason: 'ACCOUNT_SWITCH' | 'LEGACY_CLOUD_RESET',
): Promise<void> {
  const snapshot = await readBudgetSnapshot()
  const hasData = Object.values(snapshot).some((rows) => rows.length > 0)
  const quarantineId = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`

  await withInternalMutation(() =>
    db.transaction(
      'rw',
      [
        ...SYNCABLE_TABLES.map((table) => db.table(table)),
        db.syncQueue,
        db.quarantineSnapshots,
      ],
      async () => {
        if (hasData) {
          await db.quarantineSnapshots.put({
            id: quarantineId,
            ownerUserId,
            createdAt: Date.now(),
            reason,
            data: JSON.stringify(snapshot),
          })
        }
        for (const table of SYNCABLE_TABLES) {
          await db.table(table).clear()
        }
        await db.syncQueue.clear()
      },
    ),
  )
}

function getCloudTableName(localTable: string): string {
  if (localTable === 'categories' || localTable === 'adultCategories' || localTable === 'householdCategories') {
    return 'categories'
  }
  if (localTable === 'items' || localTable === 'adultItems' || localTable === 'householdItems') {
    return 'expense_items'
  }
  return localTable
}

function isLocalTable(value: string): value is LocalTable {
  return (SYNCABLE_TABLES as readonly string[]).includes(value)
}

export function attachSyncWriteHooks(): void {
  if (writeHooksAttached || typeof window === 'undefined') return
  writeHooksAttached = true

  for (const tableName of SYNCABLE_TABLES) {
    db.table(tableName).hook('creating', (_key, obj) => {
      if (internalMutationDepth > 0) return
      const record = obj as SyncableFields
      if (record.syncStatus === 'SYNCED' || record.cloudId) return
      record.syncStatus = 'PENDING'
      record.lastModified = Date.now()
      record.lastSynced = record.lastSynced ?? null
      record.syncAttempts = record.syncAttempts ?? 0
      record.cloudId = record.cloudId ?? null
      record.pendingOperation = 'CREATE'
      record.syncErrorCode = null
      record.syncErrorMessage = null
      queueSync()
    })

    db.table(tableName).hook('updating', (mods, _key, obj: SyncableFields) => {
      if (internalMutationDepth > 0) return mods
      const changes = mods as Partial<SyncableFields> & Record<string, unknown>
      const onlySyncMeta = Object.keys(changes).every((key) =>
        [
          'syncStatus',
          'lastSynced',
          'syncAttempts',
          'cloudId',
          'serverUpdatedAt',
          'pendingOperation',
          'lastModified',
          'syncErrorCode',
          'syncErrorMessage',
        ].includes(key),
      )
      if (onlySyncMeta || changes.syncStatus === 'SYNCED') return changes
      queueSync()
      return {
        ...changes,
        syncStatus: 'PENDING' as SyncStatus,
        pendingOperation: obj.pendingOperation === 'CREATE' ? 'CREATE' : 'UPDATE',
        lastModified: Date.now(),
        syncErrorCode: null,
        syncErrorMessage: null,
      }
    })

    db.table(tableName).hook(
      'deleting',
      (_key, obj: SyncableFields & { id?: number }, transaction: Transaction) => {
        if (internalMutationDepth > 0 || !activeOwnerUserId || !obj.cloudId) return
        return transaction.table('syncQueue').add({
          table: tableName,
          operation: 'DELETE',
          recordId: obj.id ?? -1,
          cloudId: obj.cloudId,
          ownerUserId: activeOwnerUserId,
          expectedUpdatedAt: obj.serverUpdatedAt ?? null,
          timestamp: Date.now(),
          attempts: 0,
          lastError: null,
        })
      },
    )
  }
}

export function queueSync(): void {
  if (currentSyncState !== 'LOCAL_ONLY' && currentSyncState !== 'SYNCING') {
    setSyncState('PENDING')
  }
  if (debounceTimer) clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => {
    if (typeof navigator !== 'undefined' && navigator.onLine) {
      void reconcileBudget('local-write')
    }
  }, DEBOUNCE_MS)
}

export async function markRecordPending<T extends Partial<SyncableFields>>(
  table: LocalTable,
  id: number,
): Promise<void> {
  const record = (await db.table(table).get(id)) as SyncableFields | undefined
  await db.table(table).update(id, {
    syncStatus: 'PENDING' as SyncStatus,
    pendingOperation:
      record?.pendingOperation === 'CREATE' || !record?.cloudId ? 'CREATE' : 'UPDATE',
    lastModified: Date.now(),
    syncErrorCode: null,
    syncErrorMessage: null,
  })
  queueSync()
}

async function pendingRecords(table: LocalTable): Promise<Array<SyncableFields & { id: number }>> {
  return db
    .table(table)
    .filter((record: SyncableFields) =>
      record.syncStatus === 'PENDING' ||
      record.syncStatus === 'FAILED' ||
      record.syncStatus === 'LOCAL_ONLY' ||
      !record.syncStatus,
    )
    .toArray()
}

export async function getPendingCount(): Promise<number> {
  const recordCounts = await Promise.all(
    SYNCABLE_TABLES.map(async (table) => (await pendingRecords(table)).length),
  )
  const owner = activeOwnerUserId || (await storedOwner())
  const tombstones = owner
    ? await db.syncQueue.where('[ownerUserId+operation]').equals([owner, 'DELETE']).count()
    : 0
  return recordCounts.reduce((sum, count) => sum + count, 0) + tombstones
}

async function fetchCloudSnapshot(userId: string): Promise<CloudSnapshot> {
  const rows = await fetchCloudBudgetRows(userId)
  return {
    households: rows.households,
    adults: rows.adults,
    children: rows.children,
    categories: rows.categories,
    items: rows.expenseItems,
  }
}

export async function bootstrapOwnerFromCache(userId: string): Promise<OwnershipState> {
  const [owner, hydrated] = await Promise.all([
    storedOwner(),
    db.settings.get(OWNER_HYDRATED_SETTING_KEY),
  ])
  activeOwnerUserId = owner

  if (owner !== userId) {
    setOwnershipState('UNRESOLVED')
    return 'UNRESOLVED'
  }

  recoveryUserId = null
  if (
    hydrated?.value.startsWith(`${userId}:`) ||
    (await budgetRowCount()) > 0
  ) {
    setOwnershipState('READY')
    return 'READY'
  }

  setOwnershipState('UNRESOLVED')
  return 'UNRESOLVED'
}

async function verifyOwner(userId: string): Promise<SyncResult | null> {
  const owner = await storedOwner()
  activeOwnerUserId = owner

  if (owner === userId) {
    recoveryUserId = null
    if (!ownerMustHydrate) setOwnershipState('READY')
    return null
  }

  if (owner && owner !== userId) {
    await quarantineAndClear(owner, 'ACCOUNT_SWITCH')
    await bindOwner(userId)
    return null
  }

  const rowCount = await budgetRowCount()
  const queueCount = await db.syncQueue.count()
  if (rowCount === 0 && queueCount === 0) {
    await bindOwner(userId)
    return null
  }

  activeOwnerUserId = null
  recoveryUserId = userId
  setOwnershipState('RECOVERY_REQUIRED')
  return {
    success: false,
    failed: 1,
    error: 'This device has unassigned budget data. Choose how to recover it.',
    failures: [
      failure(
        'RECOVERY_REQUIRED',
        'cache',
        'Choose whether this device data or cloud data should be used.',
        false,
      ),
    ],
    state: 'FAILED',
  }
}

async function assertOwnerBoundary(expectedUserId: string): Promise<void> {
  const [owner, auth] = await Promise.all([storedOwner(), supabase.auth.getUser()])
  if (owner !== expectedUserId || auth.data.user?.id !== expectedUserId) {
    throw new Error('Sync owner changed during reconciliation')
  }
}

async function resetFailedRows(): Promise<void> {
  await withInternalMutation(async () => {
    for (const table of SYNCABLE_TABLES) {
      await db
        .table(table)
        .filter((record: SyncableFields) => record.syncStatus === 'FAILED')
        .modify({
          syncStatus: 'PENDING' as SyncStatus,
          syncAttempts: 0,
          syncErrorCode: null,
          syncErrorMessage: null,
        })
    }
  })
}

async function processDeleteTombstones(
  userId: string,
  counts: CycleCounts,
): Promise<SyncRowFailure[]> {
  const failures: SyncRowFailure[] = []
  const tombstones = (await db.syncQueue.where('ownerUserId').equals(userId).toArray())
    .filter((entry) => entry.operation === 'DELETE' && isLocalTable(entry.table))
    .sort((a, b) => DELETE_ORDER[a.table as LocalTable] - DELETE_ORDER[b.table as LocalTable])

  for (const tombstone of tombstones) {
    const table = tombstone.table as LocalTable
    if (!tombstone.cloudId) {
      await withInternalMutation(() => db.syncQueue.delete(tombstone.id as number))
      counts[table].skipped += 1
      continue
    }

    if (tombstone.attempts >= MAX_RETRY_ATTEMPTS) {
      counts[table].failed += 1
      failures.push(
        failure(
          'DELETE_FAILED',
          table,
          'Delete retry limit reached',
          false,
          tombstone.recordId,
          tombstone.cloudId,
        ),
      )
      continue
    }

    try {
      if (!tombstone.expectedUpdatedAt) {
        throw new VersionConflict(table, tombstone.recordId)
      }
      await assertOwnerBoundary(userId)
      const { data, error } = await syncCloud
        .from(getCloudTableName(table))
        .delete()
        .eq('id', tombstone.cloudId)
        .eq('user_id', userId)
        .eq('updated_at', tombstone.expectedUpdatedAt)
        .select('id')
        .maybeSingle()
      if (error) throw error
      if (!data?.id) throw new VersionConflict(table, tombstone.recordId)
      await withInternalMutation(() => db.syncQueue.delete(tombstone.id as number))
      counts[table].deleted += 1
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      const isConflict = error instanceof VersionConflict
      await withInternalMutation(() =>
        db.syncQueue.update(tombstone.id as number, {
          attempts: tombstone.attempts + 1,
          lastError: message,
        }),
      )
      counts[table].failed += 1
      failures.push(
        failure(
          isConflict ? error.code : 'DELETE_FAILED',
          table,
          message,
          !isConflict,
          tombstone.recordId,
          tombstone.cloudId,
        ),
      )
    }
  }

  return failures
}

async function resolveParentCloudId(
  table: LocalTable,
  record: Record<string, unknown>,
): Promise<string | null> {
  if (table === 'categories') {
    return (await db.children.get(record.childId as number))?.cloudId ?? null
  }
  if (table === 'adultCategories') {
    return (await db.adults.get(record.adultId as number))?.cloudId ?? null
  }
  if (table === 'householdCategories') {
    return (await db.households.get(record.householdId as number))?.cloudId ?? null
  }
  if (table === 'items') {
    return (await db.categories.get(record.categoryId as number))?.cloudId ?? null
  }
  if (table === 'adultItems') {
    return (await db.adultCategories.get(record.categoryId as number))?.cloudId ?? null
  }
  if (table === 'householdItems') {
    return (await db.householdCategories.get(record.categoryId as number))?.cloudId ?? null
  }
  return null
}

async function mapLocalToCloud(
  table: LocalTable,
  record: Record<string, unknown> & { id: number },
  userId: string,
): Promise<Record<string, unknown>> {
  const baseFields = {
    user_id: userId,
  }
  const cloudIdField = record.cloudId ? { id: record.cloudId } : {}

  if (table === 'children') {
    const schoolLevel = typeof record.schoolLevel === 'string' ? record.schoolLevel.trim() : ''
    return {
      ...cloudIdField,
      ...baseFields,
      name: record.name,
      age: record.age,
      school_level: schoolLevel || mapSchoolLevelToCloud(record.schoolLevel),
    }
  }

  if (table === 'adults') {
    return { ...cloudIdField, ...baseFields, name: record.name, age: record.age }
  }

  if (table === 'households') {
    const housingType = typeof record.housingType === 'string' ? record.housingType.trim() : ''
    return {
      ...cloudIdField,
      ...baseFields,
      name: record.name,
      housing_type: housingType || mapHousingTypeToCloud(record.housingType),
      members: record.members,
    }
  }

  const parentCloudId = await resolveParentCloudId(table, record)
  if (!parentCloudId) throw new DependencyFailure(table, record.id)

  if (table === 'categories' || table === 'adultCategories' || table === 'householdCategories') {
    return {
      ...cloudIdField,
      ...baseFields,
      entity_type:
        table === 'adultCategories' ? 'adult' : table === 'householdCategories' ? 'household' : 'child',
      entity_id: parentCloudId,
      name: record.name,
      description: record.description ?? null,
      is_percentage_based: record.isPercentageBased || false,
      percentage_value: record.percentageValue || 15,
      sort_order: record.order ?? 0,
    }
  }

  return {
    ...cloudIdField,
    ...baseFields,
    category_id: parentCloudId,
    name: record.name,
    cost: record.cost ?? 0,
    frequency: mapFrequencyToCloud(record.frequency),
    quantity: record.quantity ?? 1,
    total: record.total ?? 0,
    need_want: record.needWant ?? null,
    adjusted_total: record.adjustedTotal ?? null,
  }
}

async function updateCloudRow(
  cloudTable: string,
  cloudId: string,
  localTable: LocalTable,
  cloudRecord: Record<string, unknown>,
  userId: string,
  recordId: number,
  expectedUpdatedAt: string,
) {
  const update = (payload: Record<string, unknown>) => {
    const query = syncCloud
      .from(cloudTable)
      .update(payload)
      .eq('id', cloudId)
      .eq('user_id', userId)
      .eq('updated_at', expectedUpdatedAt)
      .select('id')
    return query.maybeSingle()
  }

  const first = await update(cloudRecord)
  if (!first.error && first.data?.id) return first
  if (!first.error) {
    throw new VersionConflict(localTable, recordId)
  }
  if (!isCheckConstraintError(first.error)) return first
  const retry = await update(withCloudSafeFields(localTable, cloudRecord))
  if (!retry.error && !retry.data?.id) {
    throw new VersionConflict(localTable, recordId)
  }
  return retry
}

async function insertCloudRow(
  localTable: LocalTable,
  cloudTable: string,
  cloudRecord: Record<string, unknown>,
  userId: string,
  recordId: number,
): Promise<string | null> {
  const first = await syncCloud.from(cloudTable).insert(cloudRecord).select('id').single()
  if (!first.error && first.data?.id) return first.data.id

  let lastError = first.error
  if (first.error && isCheckConstraintError(first.error)) {
    const retry = await syncCloud
      .from(cloudTable)
      .insert(withCloudSafeFields(localTable, cloudRecord))
      .select('id')
      .single()
    if (!retry.error && retry.data?.id) return retry.data.id
    lastError = retry.error || first.error
  }

  if (lastError && isUniqueViolation(lastError) && typeof cloudRecord.id === 'string') {
    const { data: existing, error: lookupError } = await syncCloud
      .from(cloudTable)
      .select('id')
      .eq('id', cloudRecord.id)
      .eq('user_id', userId)
      .maybeSingle()
    if (lookupError) throw lookupError
    if (existing?.id) return existing.id
  }

  if (lastError && isUniqueViolation(lastError)) {
    throw new VersionConflict(localTable, recordId)
  }
  if (lastError) throw lastError
  return null
}

function makeCloudId(): string {
  if (typeof globalThis.crypto?.randomUUID === 'function') {
    return globalThis.crypto.randomUUID()
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (character) => {
    const random = Math.floor(Math.random() * 16)
    const value = character === 'x' ? random : (random & 0x3) | 0x8
    return value.toString(16)
  })
}

async function pushWrites(userId: string, counts: CycleCounts): Promise<SyncRowFailure[]> {
  const failures: SyncRowFailure[] = []

  for (const phase of PUSH_PHASES) {
    for (const table of phase) {
      const records = await pendingRecords(table)

      for (const record of records) {
        if (record.syncStatus === 'FAILED' && (record.syncAttempts || 0) >= MAX_RETRY_ATTEMPTS) {
          counts[table].failed += 1
          failures.push(
            failure(
              'RETRY_EXHAUSTED',
              table,
              record.syncErrorMessage || 'Write retry limit reached',
              false,
              record.id,
              record.cloudId,
            ),
          )
          continue
        }

        try {
          await assertOwnerBoundary(userId)
          let cloudRecord = await mapLocalToCloud(
            table,
            record as unknown as Record<string, unknown> & { id: number },
            userId,
          )
          const cloudTable = getCloudTableName(table)
          let cloudId = record.cloudId

          if (!cloudId) {
            cloudId = makeCloudId()
            await withInternalMutation(() =>
              db.table(table).update(record.id, {
                cloudId,
                pendingOperation: 'CREATE',
              }),
            )
            cloudRecord = { ...cloudRecord, id: cloudId }
          }

          if (record.serverUpdatedAt) {
            const { error } = await updateCloudRow(
              cloudTable,
              cloudId,
              table,
              cloudRecord,
              userId,
              record.id,
              record.serverUpdatedAt,
            )
            if (error) throw error
          } else {
            cloudId = await insertCloudRow(
              table,
              cloudTable,
              { ...cloudRecord, id: cloudId },
              userId,
              record.id,
            )
            if (!cloudId) throw new Error('Cloud insert returned no id')
          }

          await withInternalMutation(() =>
            db.table(table).update(record.id, {
              cloudId,
              syncStatus: 'SYNCED' as SyncStatus,
              lastSynced: Date.now(),
              syncAttempts: 0,
              pendingOperation: null,
              syncErrorCode: null,
              syncErrorMessage: null,
            }),
          )
          counts[table].pushed += 1
        } catch (error) {
          const isDependency = error instanceof DependencyFailure
          const isConflict = error instanceof VersionConflict
          const code: SyncFailureCode = isDependency
            ? error.code
            : isConflict
              ? error.code
              : 'PUSH_FAILED'
          const message = error instanceof Error ? error.message : String(error)
          await withInternalMutation(() =>
            db.table(table).update(record.id, {
              syncStatus: 'FAILED' as SyncStatus,
              syncAttempts: (record.syncAttempts || 0) + 1,
              syncErrorCode: code,
              syncErrorMessage: message,
            }),
          )
          counts[table].failed += 1
          failures.push(failure(code, table, message, !isConflict, record.id, record.cloudId))
        }
      }
    }
  }

  return failures
}

function remoteTimestamp(row: { created_at: string } & { updated_at?: string }): number {
  const timestamp = Date.parse(row.updated_at || row.created_at)
  return Number.isFinite(timestamp) ? timestamp : 0
}

function isUnresolved(record: SyncableFields): boolean {
  return (
    record.syncStatus === 'PENDING' ||
    record.syncStatus === 'FAILED' ||
    record.syncStatus === 'LOCAL_ONLY' ||
    !record.syncStatus
  )
}

async function applyCloudSnapshot(
  snapshot: CloudSnapshot,
  counts: CycleCounts,
): Promise<SyncRowFailure[]> {
  const failures: SyncRowFailure[] = []
  const householdIds = new Set(snapshot.households.map((row) => row.id))
  const adultIds = new Set(snapshot.adults.map((row) => row.id))
  const childIds = new Set(snapshot.children.map((row) => row.id))

  const validCategories: CategoryRow[] = []
  const categoryTableById = new Map<string, LocalTable>()
  for (const category of snapshot.categories) {
    const localTable: LocalTable =
      category.entity_type === 'adult'
        ? 'adultCategories'
        : category.entity_type === 'household'
          ? 'householdCategories'
          : 'categories'
    const valid =
      (category.entity_type === 'adult' && adultIds.has(category.entity_id)) ||
      (category.entity_type === 'household' && householdIds.has(category.entity_id)) ||
      (category.entity_type === 'child' && childIds.has(category.entity_id))
    if (!valid) {
      counts[localTable].failed += 1
      failures.push(
        failure(
          'INVALID_CLOUD_PARENT',
          localTable,
          'Cloud category parent does not belong to this account snapshot',
          false,
          undefined,
          category.id,
        ),
      )
      continue
    }
    validCategories.push(category)
    categoryTableById.set(category.id, localTable)
  }

  const validItems: ItemRow[] = []
  for (const item of snapshot.items) {
    const localTable = categoryTableById.get(item.category_id)
    if (!localTable) {
      counts.items.failed += 1
      failures.push(
        failure(
          'INVALID_CLOUD_PARENT',
          'expense_items',
          'Cloud expense item category does not belong to this account snapshot',
          false,
          undefined,
          item.id,
        ),
      )
      continue
    }
    validItems.push(item)
  }

  const categoryRemoteIds: Record<'categories' | 'adultCategories' | 'householdCategories', Set<string>> = {
    categories: new Set(),
    adultCategories: new Set(),
    householdCategories: new Set(),
  }
  for (const category of validCategories) {
    categoryRemoteIds[categoryTableById.get(category.id) as keyof typeof categoryRemoteIds].add(category.id)
  }

  const itemRemoteIds: Record<'items' | 'adultItems' | 'householdItems', Set<string>> = {
    items: new Set(),
    adultItems: new Set(),
    householdItems: new Set(),
  }
  for (const item of validItems) {
    const categoryTable = categoryTableById.get(item.category_id)
    const itemTable =
      categoryTable === 'adultCategories'
        ? 'adultItems'
        : categoryTable === 'householdCategories'
          ? 'householdItems'
          : 'items'
    itemRemoteIds[itemTable].add(item.id)
  }

  await withInternalMutation(() =>
    db.transaction(
      'rw',
      SYNCABLE_TABLES.map((table) => db.table(table)),
      async () => {
        const upsert = async (
          table: LocalTable,
          cloudId: string,
          data: Record<string, unknown>,
          remoteTime: number,
          remoteVersion: string | null,
        ): Promise<void> => {
          const existing = (await db
            .table(table)
            .filter((row: SyncableFields) => row.cloudId === cloudId)
            .first()) as (SyncableFields & { id?: number }) | undefined
          if (existing?.id && isUnresolved(existing)) {
            const resolution = classifyPendingVersion({
              pendingOperation: existing.pendingOperation,
              expectedUpdatedAt: existing.serverUpdatedAt,
              remoteUpdatedAt: remoteVersion,
            })
            if (resolution === 'HYDRATE_CREATE' && existing.cloudId === cloudId) {
              // A stable client UUID makes a retried create idempotent. If the
              // row already exists with that UUID, hydrate its canonical value.
            } else if (resolution === 'PRESERVE_PENDING') {
              counts[table].skipped += 1
              return
            } else {
              await db.table(table).update(existing.id, {
                syncStatus: 'FAILED' as SyncStatus,
                syncErrorCode: 'VERSION_CONFLICT' as SyncFailureCode,
                syncErrorMessage: 'Cloud data changed since this edit was started',
              })
              failures.push(
                failure(
                  'VERSION_CONFLICT',
                  table,
                  'Cloud data changed since this edit was started',
                  false,
                  existing.id,
                  cloudId,
                ),
              )
              counts[table].failed += 1
              return
            }
          }
          const localData = {
            ...data,
            cloudId,
            serverUpdatedAt: remoteVersion,
            syncStatus: 'SYNCED' as SyncStatus,
            lastModified: remoteTime,
            lastSynced: Date.now(),
            syncAttempts: 0,
            pendingOperation: null,
            syncErrorCode: null,
            syncErrorMessage: null,
          }
          if (existing?.id) {
            await db.table(table).update(existing.id, localData)
          } else {
            await db.table(table).add(localData)
          }
          counts[table].pulled += 1
        }

        for (const household of snapshot.households) {
          await upsert(
            'households',
            household.id,
            {
              name: household.name,
              housingType:
                mapHousingTypeFromCloud(household.housing_type) || household.housing_type || '',
              members: household.members,
              createdAt: new Date(household.created_at),
            },
            remoteTimestamp(household),
            household.updated_at || null,
          )
        }
        for (const adult of snapshot.adults) {
          await upsert(
            'adults',
            adult.id,
            { name: adult.name, age: adult.age || 0, createdAt: new Date(adult.created_at) },
            remoteTimestamp(adult as AdultRow & { updated_at?: string }),
            adult.updated_at || null,
          )
        }
        for (const child of snapshot.children) {
          await upsert(
            'children',
            child.id,
            {
              name: child.name,
              age: child.age || 0,
              schoolLevel:
                mapSchoolLevelFromCloud(child.school_level) || child.school_level || '',
              createdAt: new Date(child.created_at),
            },
            remoteTimestamp(child as ChildRow & { updated_at?: string }),
            child.updated_at || null,
          )
        }

        for (const category of validCategories) {
          const table = categoryTableById.get(category.id) as
            | 'categories'
            | 'adultCategories'
            | 'householdCategories'
          const parentTable =
            table === 'adultCategories'
              ? 'adults'
              : table === 'householdCategories'
                ? 'households'
                : 'children'
          const parent = (await db
            .table(parentTable)
            .filter((row: SyncableFields) => row.cloudId === category.entity_id)
            .first()) as { id?: number } | undefined
          if (!parent?.id) {
            counts[table].failed += 1
            failures.push(
              failure(
                'INVALID_CLOUD_PARENT',
                table,
                'Validated cloud parent could not be linked locally',
                false,
                undefined,
                category.id,
              ),
            )
            continue
          }
          const parentField =
            table === 'adultCategories'
              ? { adultId: parent.id }
              : table === 'householdCategories'
                ? { householdId: parent.id }
                : { childId: parent.id }
          await upsert(
            table,
            category.id,
            {
              ...parentField,
              name: category.name,
              description: category.description || '',
              isPercentageBased: category.is_percentage_based,
              percentageValue: category.percentage_value,
              order: category.sort_order,
            },
            remoteTimestamp(category as CategoryRow & { updated_at?: string }),
            category.updated_at || null,
          )
        }

        for (const item of validItems) {
          const categoryTable = categoryTableById.get(item.category_id) as
            | 'categories'
            | 'adultCategories'
            | 'householdCategories'
          const table =
            categoryTable === 'adultCategories'
              ? 'adultItems'
              : categoryTable === 'householdCategories'
                ? 'householdItems'
                : 'items'
          const category = (await db
            .table(categoryTable)
            .filter((row: SyncableFields) => row.cloudId === item.category_id)
            .first()) as { id?: number } | undefined
          if (!category?.id) {
            counts[table].failed += 1
            failures.push(
              failure(
                'INVALID_CLOUD_PARENT',
                table,
                'Validated cloud category could not be linked locally',
                false,
                undefined,
                item.id,
              ),
            )
            continue
          }
          await upsert(
            table,
            item.id,
            {
              categoryId: category.id,
              name: item.name,
              cost: item.cost,
              frequency: item.frequency,
              quantity: item.quantity,
              total: item.total,
              needWant: item.need_want || undefined,
              adjustedTotal: item.adjusted_total ?? undefined,
            },
            remoteTimestamp(item),
            item.updated_at || null,
          )
        }

        const removeAbsentSynced = async (table: LocalTable, remoteIds: Set<string>) => {
          const stale = await db
            .table(table)
            .filter(
              (row: SyncableFields) =>
                row.syncStatus === 'SYNCED' && Boolean(row.cloudId) && !remoteIds.has(row.cloudId as string),
            )
            .toArray()
          if (stale.length > 0) {
            await db.table(table).bulkDelete(stale.map((row: { id: number }) => row.id))
            counts[table].deleted += stale.length
          }
        }

        await removeAbsentSynced('items', itemRemoteIds.items)
        await removeAbsentSynced('adultItems', itemRemoteIds.adultItems)
        await removeAbsentSynced('householdItems', itemRemoteIds.householdItems)
        await removeAbsentSynced('categories', categoryRemoteIds.categories)
        await removeAbsentSynced('adultCategories', categoryRemoteIds.adultCategories)
        await removeAbsentSynced('householdCategories', categoryRemoteIds.householdCategories)
        await removeAbsentSynced('children', childIds)
        await removeAbsentSynced('adults', adultIds)
        await removeAbsentSynced('households', householdIds)
      },
    ),
  )

  return failures
}

async function unresolvedFailures(failures: SyncRowFailure[]): Promise<SyncRowFailure[]> {
  const resolvedByPull = new Set<SyncFailureCode>([
    'MISSING_PARENT_CLOUD_ID',
    'PUSH_FAILED',
    'RETRY_EXHAUSTED',
  ])
  const remaining: SyncRowFailure[] = []
  for (const item of failures) {
    if (
      resolvedByPull.has(item.code) &&
      isLocalTable(item.table) &&
      typeof item.recordId === 'number'
    ) {
      const record = (await db.table(item.table).get(item.recordId)) as SyncableFields | undefined
      if (!record || record.syncStatus === 'SYNCED') continue
    }
    remaining.push(item)
  }
  return remaining
}

function logCycle(
  cycleId: string,
  trigger: SyncTrigger,
  ownerUserId: string,
  counts: CycleCounts,
  startedAt: number,
  finalState: GlobalSyncState,
): void {
  if (process.env.NODE_ENV === 'production') return
  console.info('[budget-sync]', {
    cycleId,
    trigger,
    ownerSuffix: ownerUserId.slice(-6),
    tables: counts,
    durationMs: Date.now() - startedAt,
    finalState,
  })
}

async function runCycle(trigger: SyncTrigger): Promise<SyncResult> {
  const cycleId = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`
  const startedAt = Date.now()
  const counts = makeCounts()
  let ownerUserId = ''
  let finalState: GlobalSyncState = 'FAILED'

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      activeOwnerUserId = null
      recoveryUserId = null
      setOwnershipState('UNRESOLVED')
      setSyncState('LOCAL_ONLY')
      return { success: false, error: 'Not authenticated' }
    }
    ownerUserId = user.id

    if (activeOwnerUserId !== user.id) {
      setOwnershipState('UNRESOLVED')
    }
    await bootstrapOwnerFromCache(user.id)

    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      finalState = getOwnershipState() === 'READY' ? 'PENDING' : 'FAILED'
      setSyncState(finalState)
      return {
        success: false,
        error:
          finalState === 'PENDING'
            ? 'You are offline. Showing the saved budget on this device.'
            : 'Connect once to prepare this account on this device.',
        state: finalState,
      }
    }

    setSyncState('SYNCING')
    const ownerFailure = await verifyOwner(user.id)
    if (ownerFailure) {
      finalState = 'FAILED'
      setSyncState(finalState)
      return ownerFailure
    }

    if (trigger === 'login' || trigger === 'retry') {
      await resetFailedRows()
    }

    const failures: SyncRowFailure[] = []
    const plan = getSyncPlan(trigger)
    const pullSnapshot = async () => {
      await assertOwnerBoundary(user.id)
      const snapshot = await fetchCloudSnapshot(user.id)
      await assertOwnerBoundary(user.id)
      failures.push(...(await applyCloudSnapshot(snapshot, counts)))
    }

    try {
      // Supabase is authoritative: establish a cloud baseline before any
      // queued mutation. Realtime invalidation is intentionally pull-only.
      if (plan.pullBefore) await pullSnapshot()
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      failures.push(failure('PULL_FAILED', 'snapshot', message, true))
      finalState = 'FAILED'
      setSyncState(finalState)
      return {
        success: false,
        failed: failures.length,
        error: message,
        failures,
        errors: failures.map((item) => item.message),
        state: 'FAILED',
      }
    }

    ownerMustHydrate = false
    await markOwnerHydrated(user.id)
    setOwnershipState('READY')

    if (plan.push) {
      failures.push(
        ...(await processDeleteTombstones(user.id, counts)),
        ...(await pushWrites(user.id, counts)),
      )
      if (plan.pullAfter) {
        try {
          await pullSnapshot()
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error)
          failures.push(failure('PULL_FAILED', 'snapshot', message, true))
        }
      }
    }

    publishDataRevision()
    const terminalFailures = await unresolvedFailures(failures)
    const remaining = await getPendingCount()
    finalState = terminalFailures.some((item) => item.code === 'VERSION_CONFLICT')
      ? 'CONFLICT'
      : terminalFailures.length > 0
        ? 'FAILED'
        : remaining > 0
          ? 'PENDING'
          : 'SYNCED'
    setSyncState(finalState)

    return {
      success: terminalFailures.length === 0,
      synced: Object.values(counts).reduce((sum, table) => sum + table.pushed + table.pulled, 0),
      failed: terminalFailures.length,
      failures: terminalFailures,
      errors: terminalFailures.map((item) => item.message),
      error: terminalFailures[0]?.message,
      state: finalState as 'SYNCED' | 'PENDING' | 'FAILED' | 'CONFLICT',
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    finalState = 'FAILED'
    setSyncState(finalState)
    return {
      success: false,
      failed: 1,
      error: message,
      errors: [message],
      failures: [failure('PULL_FAILED', 'coordinator', message, true)],
      state: 'FAILED',
    }
  } finally {
    if (ownerUserId) logCycle(cycleId, trigger, ownerUserId, counts, startedAt, finalState)
  }
}

async function runCoordinator(): Promise<SyncResult> {
  let result: SyncResult = { success: true, state: 'SYNCED' }
  while (queuedTriggers.size > 0) {
    const triggers = [...queuedTriggers]
    queuedTriggers.clear()
    const trigger = triggers.includes('login')
      ? 'login'
      : triggers.includes('retry')
        ? 'retry'
        : triggers.includes('local-write')
          ? 'local-write'
          : triggers.includes('reconnect')
            ? 'reconnect'
            : triggers.includes('manual')
              ? 'manual'
              : 'realtime'
    result = await runCycle(trigger)
    if (getOwnershipState() === 'RECOVERY_REQUIRED') {
      queuedTriggers.clear()
      break
    }
  }
  return result
}

export function reconcileBudget(trigger: SyncTrigger): Promise<SyncResult> {
  queuedTriggers.add(trigger)
  if (!coordinatorPromise) {
    coordinatorPromise = (async () => {
      let result: SyncResult = { success: true, state: 'SYNCED' }
      do {
        result = await runCoordinator()
      } while (queuedTriggers.size > 0 && getOwnershipState() !== 'RECOVERY_REQUIRED')
      return result
    })().finally(() => {
      coordinatorPromise = null
    })
  }
  return coordinatorPromise
}

export async function resolveLegacyOwnership(
  action: LegacyOwnershipAction,
): Promise<SyncResult> {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user || recoveryUserId !== user.id || currentOwnershipState !== 'RECOVERY_REQUIRED') {
    return { success: false, error: 'Ownership recovery is no longer available.' }
  }

  if (action !== 'START_WITH_CLOUD_DATA') {
    return { success: false, error: 'Automatic device-data upload is disabled.' }
  }
  await quarantineAndClear(null, 'LEGACY_CLOUD_RESET')
  await bindOwner(user.id)
  setOwnershipState('UNRESOLVED')
  setSyncState('PENDING')
  return reconcileBudget('manual')
}

export function resetSyncForSignedOut(): void {
  activeOwnerUserId = null
  recoveryUserId = null
  queuedTriggers.clear()
  setOwnershipState('UNRESOLVED')
  setSyncState('LOCAL_ONLY')
}

// Backward-compatible entry points now route through the single coordinator.
export function pushToCloud(): Promise<SyncResult> {
  return reconcileBudget('manual')
}

export function pullFromCloud(_options?: { silent?: boolean }): Promise<SyncResult> {
  return reconcileBudget('manual')
}

export function fullSync(): Promise<SyncResult> {
  return reconcileBudget('login')
}

export function retryFailedSync(): Promise<SyncResult> {
  return reconcileBudget('retry')
}

export function initOfflineDetection(
  onOnline: () => void,
  onOffline: () => void,
): () => void {
  window.addEventListener('online', onOnline)
  window.addEventListener('offline', onOffline)
  return () => {
    window.removeEventListener('online', onOnline)
    window.removeEventListener('offline', onOffline)
  }
}

export async function getLastSyncTime(): Promise<Date | null> {
  let latestSync: number | null = null
  for (const table of SYNCABLE_TABLES) {
    const records = await db
      .table(table)
      .filter((record: SyncableFields) => record.lastSynced !== null)
      .toArray()
    for (const record of records as SyncableFields[]) {
      if (record.lastSynced && (!latestSync || record.lastSynced > latestSync)) {
        latestSync = record.lastSynced
      }
    }
  }
  return latestSync ? new Date(latestSync) : null
}

if (typeof window !== 'undefined') {
  attachSyncWriteHooks()
}
