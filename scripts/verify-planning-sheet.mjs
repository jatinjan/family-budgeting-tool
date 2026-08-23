import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const root = process.cwd()
const lists = readFileSync(join(root, 'lib/planning-categories.ts'), 'utf8')
const planning = readFileSync(join(root, 'app/planning/page.tsx'), 'utf8')
const summary = readFileSync(join(root, 'app/summary/page.tsx'), 'utf8')
const totals = readFileSync(join(root, 'lib/consultation-totals.ts'), 'utf8')
const adminPlanning = readFileSync(join(root, 'app/admin/families/[id]/view/planning/page.tsx'), 'utf8')
const adminSummary = readFileSync(join(root, 'app/admin/families/[id]/view/summary/page.tsx'), 'utf8')

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

function listHas(name) {
  return lists.includes(`'${name}'`)
}

const specForward = {
  child: ['Education', 'Medical & Special Needs', 'Clothing & Toys', 'Entertainment/Events', 'Parties & Social', 'Holiday'],
  adult: ['Education', 'Medical', 'Vehicles/Transport', 'Personal Debt Repayment', 'Personal', 'Gifting', 'Adult Holidays/ Solo Travel'],
  household: ['Housing', 'Utilities', 'Scheduled Maintenance', 'Insurance', 'Groceries & Household Supplies', 'Entertainment & Recreation', 'Eating Out', 'Pets', 'Family Holidays'],
}

const specNeeds = {
  child: ['Extracurricular', 'Child Communication and Subscriptions'],
  adult: ['Fitness', 'Adult Communications & Subscriptions'],
  household: ['Communications & Subscriptions'],
}

for (const name of Object.values(specForward).flat()) {
  assert(`Forward list includes ${name}`, listHas(name))
}
for (const name of Object.values(specNeeds).flat()) {
  assert(`Need/want list includes ${name}`, listHas(name))
}

assert('Need/want is a list, not a single string', lists.includes('export const CHILD_NEEDS_WANTS = ['))
assert('Planning uses spec helpers', planning.includes('forwardPlanningNames') && planning.includes('needsWantsNames'))
assert('Summary uses spec helpers', summary.includes('forwardPlanningNames') && summary.includes('needsWantsNames'))
assert('Consultation totals use spec helpers', totals.includes('needsWantsNames'))
assert('Admin planning uses spec helpers', adminPlanning.includes('needsWantsNames'))
assert('Admin summary uses spec helpers', adminSummary.includes('needsWantsNames'))
assert('Planning Need button still exists', planning.includes('Need') && planning.includes('Want'))
assert('Old wrong names are gone', !lists.includes("'Debt Repayment'") && !lists.includes("'Mortgage/Rent'") && !lists.includes("'Subscriptions'"))

console.log('')
console.log(`${passes.length} passed, ${failures.length} failed`)
if (failures.length) {
  process.exit(1)
}
