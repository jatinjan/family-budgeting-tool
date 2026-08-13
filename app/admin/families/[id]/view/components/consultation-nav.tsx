'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Users, User, Home, PieChart, ClipboardList, FileText } from 'lucide-react'
import { cn } from '@/lib/utils'
import { BRAND } from '../consultation-ui'

export function ConsultationNav({ userId }: { userId: string }) {
  const pathname = usePathname()
  const base = `/admin/families/${userId}/view`

  const items = [
    { href: `${base}/children`, label: 'Children', icon: Users, match: `${base}/children` },
    { href: `${base}/adults`, label: 'Adults', icon: User, match: `${base}/adults` },
    { href: `${base}/household`, label: 'Household', icon: Home, match: `${base}/household` },
    { href: `${base}/dashboard`, label: 'Dashboard', icon: PieChart, match: `${base}/dashboard` },
    { href: `${base}/planning`, label: 'Planning', icon: ClipboardList, match: `${base}/planning` },
    { href: `${base}/summary`, label: 'Summary', icon: FileText, match: `${base}/summary` },
  ]

  return (
    <nav className="border-b bg-white">
      <div className="mx-auto flex max-w-6xl items-center gap-1 overflow-x-auto px-4">
        {items.map((item) => {
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
