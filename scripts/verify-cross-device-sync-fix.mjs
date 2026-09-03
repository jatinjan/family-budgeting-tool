import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const root = process.cwd()
const spec = readFileSync(join(root, 'docs/specs/cross-device-sync-fix.md'), 'utf8')
const readme = readFileSync(join(root, 'docs/specs/README.md'), 'utf8')
const syncSpec = readFileSync(join(root, 'docs/specs/sync-layer.md'), 'utf8')
const intentionSpec = readFileSync(join(root, 'docs/specs/balance-intention-sync.md'), 'utf8')
const map = readFileSync(join(root, 'lib/sync-field-map.ts'), 'utf8')
const sync = readFileSync(join(root, 'lib/sync.ts'), 'utf8')
const migrationLib = readFileSync(join(root, 'lib/migration.ts'), 'utf8')
const hook = readFileSync(join(root, 'hooks/use-reload-on-sync.ts'), 'utf8')
const sql = readFileSync(join(root, 'supabase/migrations/20260901_sync_constraint_relax.sql'), 'utf8')
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
assert('Household unique recovery', sync.includes('isUniqueViolation') && sync.includes("localTable === 'households'"))
assert('fullSync always pulls', /const pullResult = await pullFromCloud/.test(sync) && !/if \(!pushResult.success && !pushResult.synced\)/.test(sync))
assert('fullSync retries FAILED rows', sync.includes("syncStatus === 'FAILED'") && sync.includes("PENDING"))
assert('Migration import uses mappers', migrationLib.includes('mapSchoolLevelToCloud') && migrationLib.includes('mapHousingTypeToCloud'))
assert('Reload hook watches SYNCING end', hook.includes("prev === 'SYNCING'") && hook.includes('syncState !=='))
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
