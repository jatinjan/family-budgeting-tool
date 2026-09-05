import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const root = process.cwd()
const spec = readFileSync(join(root, 'docs/specs/cross-device-sync-fix.md'), 'utf8')
const readme = readFileSync(join(root, 'docs/specs/README.md'), 'utf8')
const syncSpec = readFileSync(join(root, 'docs/specs/sync-layer.md'), 'utf8')
const intentionSpec = readFileSync(join(root, 'docs/specs/balance-intention-sync.md'), 'utf8')
const map = readFileSync(join(root, 'lib/sync-field-map.ts'), 'utf8')
const sync = readFileSync(join(root, 'lib/sync.ts'), 'utf8')
const syncPolicy = readFileSync(join(root, 'lib/sync-policy.mjs'), 'utf8')
const db = readFileSync(join(root, 'lib/db.ts'), 'utf8')
const syncContext = readFileSync(join(root, 'contexts/SyncContext.tsx'), 'utf8')
const ownershipGate = readFileSync(join(root, 'components/sync-ownership-gate.tsx'), 'utf8')
const migrationLib = readFileSync(join(root, 'lib/migration.ts'), 'utf8')
const hook = readFileSync(join(root, 'hooks/use-reload-on-sync.ts'), 'utf8')
const sql = readFileSync(join(root, 'supabase/migrations/20260901_sync_constraint_relax.sql'), 'utf8')
const coordinatorSql = readFileSync(join(root, 'supabase/migrations/20260904_sync_coordinator_contract.sql'), 'utf8')
const integritySql = readFileSync(join(root, 'supabase/migrations/20260904_cloud_first_integrity.sql'), 'utf8')
const auth = readFileSync(join(root, 'contexts/AuthContext.tsx'), 'utf8')
const page = readFileSync(join(root, 'app/page.tsx'), 'utf8')
const supabaseLib = readFileSync(join(root, 'lib/supabase.ts'), 'utf8')

const pages = [
  'app/adults/page.tsx',
  'app/children/page.tsx',
  'app/household/page.tsx',
  'app/dashboard/page.tsx',
  'app/planning/page.tsx',
  'app/summary/page.tsx',
  'app/categories/page.tsx',
  'app/adult-categories/page.tsx',
  'app/household-categories/page.tsx',
].map((rel) => [rel, readFileSync(join(root, rel), 'utf8')])

const failures = []
const passes = []

function assert(name, condition) {
  if (condition) {
    passes.push(name)
    console.log(`PASS  ${name}`)
  } else {
    failures.push(name)
    console.log(`FAIL  ${name}`)
  }
}

assert('Spec indexed in README', readme.includes('cross-device-sync-fix.md'))
assert('Sync spec points here', syncSpec.includes('cross-device-sync-fix.md'))
assert('Intention spec points here', intentionSpec.includes('cross-device-sync-fix.md'))
assert('Spec covers both bugs', spec.includes('children and household') && spec.includes('Balance intention'))
assert('Spec keeps single-select out of scope', spec.includes('Multi-select') && spec.includes('out of scope'))
assert('Children push original schoolLevel first', /school_level: schoolLevel \|\| mapSchoolLevelToCloud/.test(sync))
assert('Household push original housingType first', /housing_type: housingType \|\| mapHousingTypeToCloud/.test(sync))
assert('CHECK retry helper exists', map.includes('isCheckConstraintError') && sync.includes('withCloudSafeFields'))
assert('Stable insert IDs are idempotent', sync.includes('makeCloudId()') && sync.includes("typeof cloudRecord.id === 'string'"))
const firstPull = sync.indexOf('await pullSnapshot()')
const firstPush = sync.indexOf('await processDeleteTombstones', firstPull)
assert('Coordinator hydrates before outbound work', firstPull >= 0 && firstPull < firstPush && sync.includes('if (plan.push)'))
assert('Realtime is pull-only', syncPolicy.includes("trigger === 'realtime'") && syncPolicy.includes('push: false') && syncContext.includes("reconcileBudget('realtime')"))
assert('fullSync retries FAILED rows', sync.includes("syncStatus === 'FAILED'") && sync.includes("PENDING"))
assert('Migration import uses mappers', migrationLib.includes('mapSchoolLevelToCloud') && migrationLib.includes('mapHousingTypeToCloud'))
assert('Reload hook watches data revision', hook.includes('dataRevision') && !hook.includes("prev === 'SYNCING'"))
assert('Coordinator publishes one data revision', sync.includes('publishDataRevision()') && sync.includes('subscribeDataRevision'))
assert('Cache stores an owner boundary', sync.includes("OWNER_SETTING_KEY") && sync.includes('assertOwnerBoundary'))
assert('Account switches quarantine old cache', db.includes('quarantineSnapshots') && sync.includes("'ACCOUNT_SWITCH'"))
assert('Delete outbox is account scoped', db.includes('[ownerUserId+operation]') && sync.includes('processDeleteTombstones'))
assert('Writes use expected cloud version', sync.includes("eq('updated_at', expectedUpdatedAt)") && sync.includes('serverUpdatedAt'))
assert('Missing parent is typed failure', sync.includes('class DependencyFailure') && sync.includes("'MISSING_PARENT_CLOUD_ID'"))
assert('Version conflicts are explicit', sync.includes('class VersionConflict') && sync.includes("'VERSION_CONFLICT'"))
assert('Coordinator serializes and coalesces', sync.includes('coordinatorPromise') && sync.includes('queuedTriggers'))
assert('Pull preserves unresolved work', sync.includes('isUnresolved') && sync.includes('removeAbsentSynced'))
assert('All context triggers use coordinator', ['login', 'manual', 'retry', 'reconnect', 'realtime'].every((trigger) => syncContext.includes(`reconcileBudget('${trigger}')`)))
assert('Offline startup bootstraps matching owner cache', sync.includes('bootstrapOwnerFromCache') && syncContext.includes('bootstrapOwnerFromCache(user.id)'))
assert('Legacy automatic upload is disabled', !sync.includes('prepareLegacyRowsForUpload') && !ownershipGate.includes('USE_DEVICE_DATA'))
assert('Signup import refuses non-empty cloud', migrationLib.includes('already has cloud budget data') && migrationLib.includes('prevent duplicates'))
assert('Diagnostics are PII-safe counts', sync.includes("console.info('[budget-sync]'") && sync.includes('ownerSuffix') && sync.includes('tables: counts'))
assert('LWW tables have updated timestamps', ['adults', 'children', 'categories'].every((table) => coordinatorSql.includes(`public.${table}`)) && coordinatorSql.includes('updated_at'))
assert('Database enforces budget parent ownership', integritySql.includes('validate_category_parent_owner') && integritySql.includes('validate_expense_item_parent_owner'))
assert('Budget write policies use WITH CHECK', ['households', 'adults', 'children', 'categories', 'expense_items'].every((table) => integritySql.includes(`ON public.${table} FOR ALL`)) && integritySql.includes('WITH CHECK (auth.uid() = user_id)'))
for (const [rel, source] of pages) {
  assert(`${rel} reloads after sync`, source.includes('useReloadOnSync'))
}
assert('Constraint SQL drops school/housing CHECKs', sql.includes('school_level') && sql.includes('housing_type'))
assert('Constraint SQL reloads PostgREST', sql.includes("NOTIFY pgrst"))
assert('Fetch error does not wipe profile', auth.includes('if (profileData) setProfile(profileData)'))
assert('Balance save surfaces cloud errors', page.includes('setSaveError') && page.includes('updateProfile'))
assert('updateProfile returns first row without .single()', supabaseLib.includes('data?.[0]'))

console.log('')
console.log(`${passes.length} passed, ${failures.length} failed`)
if (failures.length) process.exit(1)
