import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const root = process.cwd()
const nav = readFileSync(join(root, 'lib/app-nav.ts'), 'utf8')
const bottom = readFileSync(join(root, 'components/bottom-nav.tsx'), 'utf8')
const top = readFileSync(join(root, 'components/top-nav.tsx'), 'utf8')
const sheet = readFileSync(join(root, 'components/family-nav-sheet.tsx'), 'utf8')
const shell = readFileSync(join(root, 'components/app-shell.tsx'), 'utf8')
const header = readFileSync(join(root, 'components/page-header.tsx'), 'utf8')
const consultation = readFileSync(
  join(root, 'app/admin/families/[id]/view/components/consultation-nav.tsx'),
  'utf8'
)
const spec = readFileSync(join(root, 'docs/specs/app-navigation.md'), 'utf8')
const readme = readFileSync(join(root, 'docs/specs/README.md'), 'utf8')

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

assert('Spec exists', /hybrid navigation/i.test(spec))
assert('README indexes app-navigation', readme.includes('app-navigation.md'))
assert('Primary labels in app-nav', ['Balance', 'Family', 'Dashboard', 'Planning', 'Summary'].every((l) => nav.includes(`'${l}'`) || nav.includes(`"${l}"`) || nav.includes(`label: '${l}'`) || nav.includes(`label: "${l}"`)))
assert('Family children order Household then Children then Adults', (() => {
  const h = nav.indexOf("id: 'household'")
  const c = nav.indexOf("id: 'children'")
  const a = nav.indexOf("id: 'adults'")
  return h >= 0 && c > h && a > c
})())
assert('Category active prefixes', nav.includes("'/categories'") && nav.includes("'/adult-categories'") && nav.includes("'/household-categories'"))
assert('Bottom nav uses shared config', bottom.includes('APP_NAV_ITEMS') || bottom.includes('from "@/lib/app-nav"') || bottom.includes("from '@/lib/app-nav'"))
assert('Top nav uses shared config', top.includes('from "@/lib/app-nav"') || top.includes("from '@/lib/app-nav'"))
assert('Family sheet exists', sheet.includes('FAMILY_NAV_CHILDREN') || sheet.includes('from "@/lib/app-nav"') || sheet.includes("from '@/lib/app-nav'"))
assert('AppShell hybrid', shell.includes('TopNav') && shell.includes('BottomNav') && (shell.includes('md:') || shell.includes('hidden md:')))
assert('PageHeader hides Sign out on desktop', header.includes('md:hidden') || header.includes('hidden md:'))
assert('Consultation uses Family group', consultation.includes('Family') && (consultation.includes('app-nav') || consultation.includes('CONSULTATION_FAMILY') || consultation.includes('FAMILY_NAV')))

// Active-match helpers (mirror lib/app-nav.ts)
function isFamilyChildActive(pathname, child) {
  return child.activePrefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))
}
function isFamilyGroupActive(pathname, children) {
  return children.some((child) => isFamilyChildActive(pathname, child))
}
function isNavLinkActive(pathname, href) {
  if (href === '/') return pathname === '/'
  return pathname === href || pathname.startsWith(`${href}/`)
}

const children = [
  { activePrefixes: ['/household', '/household-categories'] },
  { activePrefixes: ['/children', '/categories'] },
  { activePrefixes: ['/adults', '/adult-categories'] },
]
assert('Balance active only on /', isNavLinkActive('/', '/') && !isNavLinkActive('/dashboard', '/'))
assert('/categories activates Family', isFamilyGroupActive('/categories', children))
assert('/adult-categories activates Family', isFamilyGroupActive('/adult-categories', children))
assert('/household-categories activates Family', isFamilyGroupActive('/household-categories', children))
assert('/planning is link-active', isNavLinkActive('/planning', '/planning'))

console.log('')
console.log(`${passes.length} passed, ${failures.length} failed`)
if (failures.length) {
  process.exit(1)
}
