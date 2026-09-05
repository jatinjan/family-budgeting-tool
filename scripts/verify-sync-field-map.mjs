import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const root = process.cwd()
const map = readFileSync(join(root, 'lib/sync-field-map.ts'), 'utf8')
const sync = readFileSync(join(root, 'lib/sync.ts'), 'utf8')
const syncPolicy = readFileSync(join(root, 'lib/sync-policy.mjs'), 'utf8')
const migration = readFileSync(join(root, 'supabase/migrations/20260901_sync_constraint_relax.sql'), 'utf8')
const spec = readFileSync(join(root, 'docs/specs/sync-layer.md'), 'utf8')

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

assert('Maps Primary School to primary', map.includes("lower.includes('primary')"))
assert('Maps owned/rented housing', map.includes("lower.includes('rent')") && map.includes("lower.includes('own')"))
assert('Children push original schoolLevel first', /school_level: schoolLevel \|\| mapSchoolLevelToCloud/.test(sync))
assert('Household push original housingType first', /housing_type: housingType \|\| mapHousingTypeToCloud/.test(sync))
assert('Push uses school_level mapper on CHECK retry', sync.includes('mapSchoolLevelToCloud') && sync.includes('withCloudSafeFields'))
assert('Push uses housing_type mapper on CHECK retry', sync.includes('mapHousingTypeToCloud'))
assert('Pull reverse-maps UI labels', sync.includes('mapSchoolLevelFromCloud') && sync.includes('mapHousingTypeFromCloud'))
assert('Coordinator hydrates before outbound work', sync.indexOf('await pullSnapshot()') < sync.indexOf('await processDeleteTombstones'))
assert('Realtime policy is pull-only', syncPolicy.includes("trigger === 'realtime'") && syncPolicy.includes('push: false'))
assert('Stable insert IDs handle replay', sync.includes('makeCloudId()') && sync.includes('isUniqueViolation'))
assert('Constraint migration drops school/housing CHECKs', migration.includes('school_level') && migration.includes('housing_type'))
assert('Constraint migration reloads PostgREST', migration.includes("NOTIFY pgrst"))
assert('Sync spec points at cross-device fix', spec.includes('cross-device-sync-fix.md'))

console.log('')
console.log(`${passes.length} passed, ${failures.length} failed`)
if (failures.length) process.exit(1)
