import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const root = process.cwd()
const page = readFileSync(join(root, 'app/page.tsx'), 'utf8')
const header = readFileSync(join(root, 'components/page-header.tsx'), 'utf8')
const spec = readFileSync(join(root, 'docs/specs/balance-type-polish.md'), 'utf8')
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

assert('Spec indexed', readme.includes('balance-type-polish.md'))
assert('Spec is type-only', /No copy changes|type only/i.test(spec))
assert('PageHeader uses Nunito', header.includes('--font-nunito') && header.includes('text-[1.75rem]'))
assert('PageHeader has no font-serif', !header.includes('font-serif'))
assert('Balance has no font-serif', !page.includes('font-serif'))
assert('Balance titles use Nunito', (page.match(/--font-nunito/g) || []).length >= 4)
assert('Guest helper is text-xs', page.includes('text-xs font-normal text-muted-foreground'))
assert('Closing line is Nunito semibold', page.includes('text-lg font-semibold') && page.includes('balanced year begins with clarity'))
assert('Welcome still present', page.includes('Welcome to My Balanced Family Finances'))
assert('Goal question unchanged', page.includes('What matters most to you this year'))

console.log('')
console.log(`${passes.length} passed, ${failures.length} failed`)
if (failures.length) process.exit(1)
