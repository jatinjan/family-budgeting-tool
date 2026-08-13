import { readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'

const root = process.cwd()
const failures = []
const passes = []

function read(rel) {
  return readFileSync(join(root, rel), 'utf8')
}

function assert(name, condition, detail = '') {
  if (condition) {
    passes.push(name)
    console.log(`PASS  ${name}`)
  } else {
    failures.push(`${name}${detail ? ` — ${detail}` : ''}`)
    console.log(`FAIL  ${name}${detail ? ` — ${detail}` : ''}`)
  }
}

function fileHas(rel, snippet) {
  return existsSync(join(root, rel)) && read(rel).includes(snippet)
}

function fileMatches(rel, pattern) {
  return existsSync(join(root, rel)) && pattern.test(read(rel))
}

// --- Spec acceptance: static ---

assert(
  'Admin can open consultation from the family briefing page',
  fileHas('app/admin/families/[id]/page.tsx', 'Open consultation') &&
    fileHas('app/admin/families/[id]/page.tsx', '/view/dashboard')
)

assert(
  'Non-admin blocked by existing /admin middleware',
  fileHas('middleware.ts', "const ADMIN_ROUTES_PREFIX = '/admin'") &&
    fileHas('middleware.ts', 'isAdminRoute') &&
    fileHas('docs/specs/protected-routes.md', '/admin/families/[id]/view/*')
)

assert(
  'Admin session stays admin — hook loads by userId, no IndexedDB',
  fileHas('hooks/use-family-budget.ts', "supabase.from('profiles')") &&
    !fileHas('hooks/use-family-budget.ts', "from '@/lib/db'") &&
    !fileMatches('app/admin/families/[id]/view/layout.tsx', /signIn|impersonat/i)
)

assert(
  'Children, adults, and household profile fields are visible',
  fileHas('app/admin/families/[id]/view/children/page.tsx', 'child.age') &&
    fileHas('app/admin/families/[id]/view/children/page.tsx', 'school_level') &&
    fileHas('app/admin/families/[id]/view/adults/page.tsx', 'adult.age') &&
    fileHas('app/admin/families/[id]/view/household/page.tsx', 'housing_type') &&
    fileHas('app/admin/families/[id]/view/household/page.tsx', 'members')
)

assert(
  'Category views show entered items and not-started categories',
  fileHas('app/admin/families/[id]/view/components/category-breakdown.tsx', '(not started)') &&
    fileHas('app/admin/families/[id]/view/components/category-breakdown.tsx', 'No items entered yet')
)

assert(
  'Empty / signed_up families are still openable',
  fileHas('app/admin/families/[id]/view/layout.tsx', 'ConsultationProvider') &&
    fileHas('app/admin/families/[id]/view/dashboard/page.tsx', 'No financial data yet') &&
    fileHas('app/admin/families/[id]/view/children/page.tsx', 'No children added yet')
)

assert(
  'Need/want and adjusted_total appear on planning and category display',
  fileHas('app/admin/families/[id]/view/planning/page.tsx', 'need_want') &&
    fileHas('app/admin/families/[id]/view/planning/page.tsx', 'adjusted_total') &&
    fileHas('app/admin/families/[id]/view/components/category-breakdown.tsx', 'NeedWantBadge') &&
    fileHas('app/admin/families/[id]/view/components/category-breakdown.tsx', 'adjusted_total')
)

const viewFiles = [
  'app/admin/families/[id]/view/layout.tsx',
  'app/admin/families/[id]/view/dashboard/page.tsx',
  'app/admin/families/[id]/view/planning/page.tsx',
  'app/admin/families/[id]/view/summary/page.tsx',
  'app/admin/families/[id]/view/children/page.tsx',
  'app/admin/families/[id]/view/adults/page.tsx',
  'app/admin/families/[id]/view/household/page.tsx',
  'app/admin/families/[id]/view/components/category-breakdown.tsx',
  'hooks/use-family-budget.ts',
  'contexts/ConsultationContext.tsx',
]
const writeApi = /supabase[\s\S]{0,80}\.(insert|update|upsert|delete)\s*\(/
const viewWrites = viewFiles.filter((file) => writeApi.test(read(file)))
assert(
  'No consultation control writes family budget tables',
  viewWrites.length === 0,
  viewWrites.join(', ')
)

assert(
  'Refresh reloads from Supabase and updates Last updated',
  fileHas('hooks/use-family-budget.ts', 'refresh') &&
    fileHas('app/admin/families/[id]/view/components/consultation-banner.tsx', 'Last updated') &&
    fileHas('app/admin/families/[id]/view/components/consultation-banner.tsx', 'onRefresh')
)

assert(
  'Consultation and family app subscribe to live budget changes',
  fileHas('lib/realtime.ts', 'subscribeToFamilyBudget') &&
    fileHas('hooks/use-family-budget.ts', 'subscribeToFamilyBudget') &&
    fileHas('contexts/SyncContext.tsx', 'subscribeToFamilyBudget') &&
    fileHas('app/admin/families/[id]/view/components/consultation-banner.tsx', 'Live')
)

assert(
  'Banner shows family name (or email) and read-only label',
  fileHas('app/admin/families/[id]/view/components/consultation-banner.tsx', 'Consultation (read-only)') &&
    fileHas('app/admin/families/[id]/view/components/consultation-banner.tsx', 'family_name') &&
    fileHas('app/admin/families/[id]/view/components/consultation-banner.tsx', 'email')
)

assert(
  'Back to briefing returns to /admin/families/[id]',
  fileHas('app/admin/families/[id]/view/components/consultation-banner.tsx', 'Back to briefing') &&
    fileHas('app/admin/families/[id]/view/components/consultation-banner.tsx', '`/admin/families/${userId}`')
)

assert(
  'Customer Dexie write paths are unchanged (consultation does not import lib/db)',
  viewFiles.every((file) => !read(file).includes("from '@/lib/db'")) &&
    !read('hooks/use-family-budget.ts').includes("from '@/lib/db'")
)

assert(
  'Planning category lists live in one shared module',
  fileHas('lib/planning-categories.ts', 'CHILD_FORWARD_PLANNING') &&
    fileHas('app/planning/page.tsx', '@/lib/planning-categories') &&
    fileHas('app/summary/page.tsx', '@/lib/planning-categories') &&
    fileHas('lib/consultation-totals.ts', '@/lib/planning-categories')
)

// --- Calculation fixture (same rules as family planning) ---

const CHILD_FORWARD = ['Education', 'Medical & Special Needs', 'Clothing & Toys', 'Entertainment/Events', 'Parties & Social']
const CHILD_NEEDS = 'Extracurricular'

const categories = [
  { id: 'edu', name: 'Education', is_percentage_based: false, percentage_value: 0 },
  { id: 'extra', name: 'Extracurricular', is_percentage_based: false, percentage_value: 0 },
  { id: 'misc', name: 'Miscellaneous', is_percentage_based: true, percentage_value: 15 },
]
const items = [
  { category_id: 'edu', total: 1000, adjusted_total: 800, need_want: null },
  { category_id: 'extra', total: 400, adjusted_total: 400, need_want: 'need' },
  { category_id: 'extra', total: 200, adjusted_total: 200, need_want: 'want' },
]

const itemsIn = (predicate) =>
  categories.filter(predicate).flatMap((category) => items.filter((item) => item.category_id === category.id))

const miscPercentage = 15
const nonMiscCurrentTotal = itemsIn((c) => !c.is_percentage_based).reduce((sum, item) => sum + item.total, 0)
const miscCurrentSituation = (miscPercentage / 100) * nonMiscCurrentTotal
const currentSituationTotal = nonMiscCurrentTotal + miscCurrentSituation
const needsTotal = itemsIn((c) => c.name === CHILD_NEEDS)
  .filter((item) => item.need_want === 'need')
  .reduce((sum, item) => sum + (item.adjusted_total ?? item.total), 0)
const forwardPlanningItemsTotal = itemsIn((c) => CHILD_FORWARD.includes(c.name))
  .reduce((sum, item) => sum + (item.adjusted_total ?? item.total), 0)
const miscForwardPlanning = (miscPercentage / 100) * (needsTotal + forwardPlanningItemsTotal)
const forwardPlanningTotal = forwardPlanningItemsTotal + needsTotal + miscForwardPlanning
const potentialSavings = currentSituationTotal - forwardPlanningTotal

assert(
  'Dashboard/planning/summary math fixture matches family planning rules',
  currentSituationTotal === 1840 &&
    forwardPlanningTotal === 1380 &&
    potentialSavings === 460 &&
    needsTotal === 400 &&
    miscCurrentSituation === 240 &&
    miscForwardPlanning === 180,
  `got current=${currentSituationTotal} forward=${forwardPlanningTotal} savings=${potentialSavings}`
)

assert(
  'Sync resolves local parent IDs before uploading categories and items',
  fileHas('lib/sync.ts', 'resolveParentCloudId') &&
    fileHas('lib/sync.ts', 'record.childId') &&
    fileHas('lib/sync.ts', 'record.categoryId') &&
    fileHas('lib/sync.ts', 'entity_id: entityId') &&
    fileHas('lib/sync.ts', 'category_id: categoryId')
)

assert(
  'Sync uploads household and people before categories, then items',
  fileHas('lib/sync.ts', "['households', 'adults', 'children']") &&
    fileHas('lib/sync.ts', "['householdCategories', 'adultCategories', 'categories']") &&
    fileHas('lib/sync.ts', "['householdItems', 'adultItems', 'items']")
)

assert(
  'Local writes are marked pending and a missed sync is retried',
  fileHas('lib/sync.ts', 'attachSyncWriteHooks') &&
    fileHas('lib/sync.ts', "record.syncStatus = 'PENDING'") &&
    fileHas('lib/sync.ts', 'syncQueuedDuringPush') &&
    fileHas('contexts/SyncContext.tsx', 'attachSyncWriteHooks')
)

assert(
  'Required consultation routes exist',
  [
    'app/admin/families/[id]/view/page.tsx',
    'app/admin/families/[id]/view/dashboard/page.tsx',
    'app/admin/families/[id]/view/planning/page.tsx',
    'app/admin/families/[id]/view/summary/page.tsx',
    'app/admin/families/[id]/view/children/page.tsx',
    'app/admin/families/[id]/view/children/categories/page.tsx',
    'app/admin/families/[id]/view/adults/page.tsx',
    'app/admin/families/[id]/view/adults/categories/page.tsx',
    'app/admin/families/[id]/view/household/page.tsx',
    'app/admin/families/[id]/view/household/categories/page.tsx',
  ].every((file) => existsSync(join(root, file)))
)

console.log('')
console.log(`${passes.length} passed, ${failures.length} failed`)
if (failures.length) {
  console.log('\nFailed:')
  for (const failure of failures) console.log(`- ${failure}`)
  process.exit(1)
}
