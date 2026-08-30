'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Users, User, Home, PieChart, ClipboardList, FileText, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { BRAND } from '../consultation-ui'
import {
  CONSULTATION_FAMILY_SEGMENTS,
  isConsultationFamilyChildActive,
  isConsultationFamilyGroupActive,
} from '@/lib/app-nav'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

const FAMILY_ICONS = {
  household: Home,
  children: Users,
  adults: User,
} as const

export function ConsultationNav({ userId }: { userId: string }) {
  const pathname = usePathname()
  const base = `/admin/families/${userId}/view`
  const familyActive = isConsultationFamilyGroupActive(pathname, base)

  const linkItems = [
    { href: `${base}/dashboard`, label: 'Dashboard', icon: PieChart, match: `${base}/dashboard` },
    { href: `${base}/planning`, label: 'Planning', icon: ClipboardList, match: `${base}/planning` },
    { href: `${base}/summary`, label: 'Summary', icon: FileText, match: `${base}/summary` },
  ]

  return (
    <nav className="border-b bg-white">
      <div className="mx-auto flex max-w-6xl items-center gap-1 overflow-x-auto px-4">
        <DropdownMenu>
          <DropdownMenuTrigger
            className={cn(
              'flex shrink-0 items-center gap-1.5 border-b-2 px-3 py-3 text-sm font-medium transition-colors outline-none',
              familyActive
                ? 'border-current'
                : 'border-transparent text-gray-500 hover:text-gray-800'
            )}
            style={familyActive ? { color: BRAND.deepTeal } : undefined}
          >
            <Users className="h-4 w-4" />
            Family
            <ChevronDown className="h-3.5 w-3.5 opacity-70" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56">
            {CONSULTATION_FAMILY_SEGMENTS.map((item) => {
              const href = `${base}/${item.segment}`
              const active = isConsultationFamilyChildActive(pathname, base, item.segment)
              const Icon = FAMILY_ICONS[item.id]
              return (
                <DropdownMenuItem key={item.id} asChild>
                  <Link
                    href={href}
                    className={cn('flex cursor-pointer items-center gap-2', active && 'bg-primary/5')}
                    style={active ? { color: BRAND.deepTeal } : undefined}
                  >
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </Link>
                </DropdownMenuItem>
              )
            })}
          </DropdownMenuContent>
        </DropdownMenu>

        {linkItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(`${item.match}/`)
          const Icon = item.icon
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex shrink-0 items-center gap-1.5 border-b-2 px-3 py-3 text-sm font-medium transition-colors',
                isActive
                  ? 'border-current'
                  : 'border-transparent text-gray-500 hover:text-gray-800'
              )}
              style={isActive ? { color: BRAND.deepTeal } : undefined}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
