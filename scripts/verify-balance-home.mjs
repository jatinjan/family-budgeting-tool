import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const root = process.cwd()
const lists = readFileSync(join(root, 'lib/balance-home.ts'), 'utf8')
const page = readFileSync(join(root, 'app/page.tsx'), 'utf8')
const spec = readFileSync(join(root, 'docs/specs/balance-home.md'), 'utf8')
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

const goals = [
  'Reduce financial stress',
  'Build a safety buffer',
  'Save for a holiday',
  'Understand our real spending',
  'Reduce overspending',
  "Make better decisions about kids' activities",
  'Improve communication about money',
]

assert('Spec indexed', readme.includes('balance-home.md'))
assert('Spec describes replace marketing home', /welcome|intention|goals/i.test(spec))
for (const g of goals) {
  assert(`Goal list includes ${g}`, lists.includes(g))
}
assert('Five how-it-works steps', (lists.match(/Add your known expenses|Add estimates|Review your total|Explore adjustments|See your potential/g) || []).length === 5)
assert('Setting keys locked', lists.includes('balanceGoal') && lists.includes('yearlySavingsGoal') && lists.includes('monthlyBuffer'))
assert('Guest auth path is signup', lists.includes("'/signup'") || lists.includes('"/signup"'))
assert('Page uses shared module', page.includes('BALANCE_GOALS') && page.includes('from "@/lib/balance-home"') || page.includes("from '@/lib/balance-home'"))
assert('Page is client Balance', page.includes('use client') && page.includes('What matters most'))
assert('Old marketing cards gone', !page.includes('A clearer picture of your year') && !page.includes('Plan with purpose'))
assert('Start Planning removed', !page.includes('Start Planning') && !page.includes('handleStartPlanning'))
assert('Guest cannot persist without auth', page.includes('BALANCE_GUEST_AUTH_PATH') && page.includes('isLoggedIn'))
assert('Logged-in saves settings', page.includes('db.settings.put') && page.includes('BALANCE_SETTING_KEYS'))

console.log('')
console.log(`${passes.length} passed, ${failures.length} failed`)
if (failures.length) {
  process.exit(1)
}
