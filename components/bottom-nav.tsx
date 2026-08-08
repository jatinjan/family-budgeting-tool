"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Scale, Users, User, Home, PieChart, ClipboardList, FileText } from "lucide-react"
import { cn } from "@/lib/utils"

const navItems = [
  {
    href: "/",
    label: "Balance",
    icon: Scale,
  },
  {
    href: "/children",
    label: "Children",
    icon: Users,
  },
  {
    href: "/adults",
    label: "Adults",
    icon: User,
  },
  {
    href: "/household",
    label: "Household",
    icon: Home,
  },
  {
    href: "/dashboard",
    label: "Dashboard",
    icon: PieChart,
  },
  {
    href: "/planning",
    label: "Planning",
    icon: ClipboardList,
  },
  {
    href: "/summary",
    label: "Summary",
    icon: FileText,
  },
]

export function BottomNav() {
  const pathname = usePathname()

  return (
    <nav 
      className="fixed bottom-0 left-0 right-0 z-50 border-t bg-card shadow-lg"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
    >
      <div className="mx-auto flex max-w-lg items-center justify-around">
        {navItems.map((item) => {
          const isActive = pathname === item.href || 
            (item.href === "/children" && pathname === "/categories") ||
            (item.href === "/adults" && pathname === "/adult-categories") ||
            (item.href === "/household" && pathname === "/household-categories")
          const Icon = item.icon

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-1 flex-col items-center gap-1 py-3 text-xs transition-colors",
                isActive ? "text-primary" : "text-muted-foreground hover:text-foreground",
              )}
            >
              <Icon className="h-5 w-5" />
              <span className="font-medium">{item.label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
