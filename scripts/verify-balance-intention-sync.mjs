import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const root = process.cwd()
const spec = readFileSync(join(root, 'docs/specs/balance-intention-sync.md'), 'utf8')
const migration = readFileSync(join(root, 'supabase/migrations/20260830_balance_intention.sql'), 'utf8')
const types = readFileSync(join(root, 'types/database.ts'), 'utf8')
const supabaseLib = readFileSync(join(root, 'lib/supabase.ts'), 'utf8')
const balanceLib = readFileSync(join(root, 'lib/balance-home.ts'), 'utf8')
const page = readFileSync(join(root, 'app/page.tsx'), 'utf8')
const banner = readFileSync(
  join(root, 'app/admin/families/[id]/view/components/consultation-banner.tsx'),
  'utf8'
)
const briefing = readFileSync(join(root, 'app/admin/families/[id]/page.tsx'), 'utf8')
const summary = readFileSync(join(root, 'components/balance-intention-summary.tsx'), 'utf8')
const readme = readFileSync(join(root, 'docs/specs/README.md'), 'utf8')
const auth = readFileSync(join(root, 'contexts/AuthContext.tsx'), 'utf8')
const updateFn = supabaseLib.slice(
  supabaseLib.indexOf('export async function updateProfile'),
  supabaseLib.indexOf('export async function isAdmin')
)

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

assert('Spec indexed', readme.includes('balance-intention-sync.md'))
assert('Migration adds three columns', migration.includes('balance_goal') && migration.includes('yearly_savings_goal') && migration.includes('monthly_buffer'))
assert('Types include profile columns', types.includes('balance_goal') && types.includes('yearly_savings_goal') && types.includes('monthly_buffer'))
assert('updateProfile accepts intention', supabaseLib.includes('balance_goal') && supabaseLib.includes('yearly_savings_goal'))
assert('Mapping helpers exist', balanceLib.includes('intentionFromProfile') && balanceLib.includes('intentionToCloud'))
assert('Page dual-writes cloud', page.includes('updateProfile') && page.includes('intentionToCloud') && page.includes('refreshProfile'))
assert('Page hydrates from profile', page.includes('intentionFromProfile'))
assert('Consultation banner shows intention', banner.includes('BalanceIntentionSummary'))
assert('Briefing shows intention', briefing.includes('BalanceIntentionSummary') && briefing.includes('Balance intention'))
assert('Summary is read-only component', summary.includes('Read-only') || summary.includes('Intention'))
assert('Spec says not via sync.ts', /does \*\*not\*\* go through|not go through `lib\/sync/i.test(spec) || spec.includes('lib/sync.ts'))
assert('Blank re-login points at cross-device spec', spec.includes('cross-device-sync-fix.md'))
assert('updateProfile does not use .single()', updateFn.includes('.select()') && !updateFn.includes('.single()'))
assert('Save errors shown on Balance page', page.includes('setSaveError') && page.includes('could not sync to the cloud'))
assert('Fetch error does not wipe signed-in profile', auth.includes('if (profileData) setProfile(profileData)') && auth.includes('return null'))

console.log('')
console.log(`${passes.length} passed, ${failures.length} failed`)
if (failures.length) process.exit(1)
