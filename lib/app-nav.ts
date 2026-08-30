/**
 * Shared family-app navigation IA.
 * Source of truth: docs/specs/app-navigation.md
 */

export type AppNavFamilyChild = {
  id: 'household' | 'children' | 'adults'
  label: string
  href: string
  /** Path prefixes that keep this child (and Family group) active */
  activePrefixes: string[]
}

export type AppNavLink = {
  kind: 'link'
  id: 'balance' | 'dashboard' | 'planning' | 'summary'
  label: string
  href: string
}

export type AppNavFamily = {
  kind: 'family'
  id: 'family'
  label: 'Family'
  children: AppNavFamilyChild[]
}

export type AppNavItem = AppNavLink | AppNavFamily

export const FAMILY_NAV_CHILDREN: AppNavFamilyChild[] = [
  {
    id: 'household',
    label: 'Household',
    href: '/household',
    activePrefixes: ['/household', '/household-categories'],
  },
  {
    id: 'children',
    label: 'Children',
    href: '/children',
    activePrefixes: ['/children', '/categories'],
  },
  {
    id: 'adults',
    label: 'Adults',
    href: '/adults',
    activePrefixes: ['/adults', '/adult-categories'],
  },
]

export const APP_NAV_ITEMS: AppNavItem[] = [
  { kind: 'link', id: 'balance', label: 'Balance', href: '/' },
  { kind: 'family', id: 'family', label: 'Family', children: FAMILY_NAV_CHILDREN },
  { kind: 'link', id: 'dashboard', label: 'Dashboard', href: '/dashboard' },
  { kind: 'link', id: 'planning', label: 'Planning', href: '/planning' },
  { kind: 'link', id: 'summary', label: 'Summary', href: '/summary' },
]

export function isFamilyChildActive(pathname: string, child: AppNavFamilyChild): boolean {
  return child.activePrefixes.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  )
}

export function isFamilyGroupActive(pathname: string): boolean {
  return FAMILY_NAV_CHILDREN.some((child) => isFamilyChildActive(pathname, child))
}

/** Exact match for Balance `/`; otherwise exact or nested under href. */
export function isNavLinkActive(pathname: string, href: string): boolean {
  if (href === '/') return pathname === '/'
  return pathname === href || pathname.startsWith(`${href}/`)
}

/** Consultation view segments under `/admin/families/[id]/view`. */
export const CONSULTATION_FAMILY_SEGMENTS = [
  { id: 'household' as const, segment: 'household', label: 'Household' },
  { id: 'children' as const, segment: 'children', label: 'Children' },
  { id: 'adults' as const, segment: 'adults', label: 'Adults' },
]

export function isConsultationFamilyChildActive(
  pathname: string,
  base: string,
  segment: string
): boolean {
  const root = `${base}/${segment}`
  return pathname === root || pathname.startsWith(`${root}/`)
}

export function isConsultationFamilyGroupActive(pathname: string, base: string): boolean {
  return CONSULTATION_FAMILY_SEGMENTS.some((item) =>
    isConsultationFamilyChildActive(pathname, base, item.segment)
  )
}
