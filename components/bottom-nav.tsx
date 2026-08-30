"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Scale, Users, PieChart, ClipboardList, FileText } from "lucide-react"
import { cn } from "@/lib/utils"
import {
  APP_NAV_ITEMS,
  isFamilyGroupActive,
  isNavLinkActive,
  type AppNavItem,
} from "@/lib/app-nav"
import { FamilyNavSheet } from "@/components/family-nav-sheet"

const ICONS: Record<AppNavItem["id"], typeof Scale> = {
  balance: Scale,
  family: Users,
  dashboard: PieChart,
  planning: ClipboardList,
  summary: FileText,
}

export function BottomNav() {
  const pathname = usePathname() || "/"
  const [familyOpen, setFamilyOpen] = useState(false)

  return (
    <>
      <nav
        className="fixed bottom-0 left-0 right-0 z-50 border-t bg-card shadow-lg md:hidden"
        style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
        aria-label="Main"
      >
        <div className="mx-auto flex max-w-lg items-center justify-around">
          {APP_NAV_ITEMS.map((item) => {
            const Icon = ICONS[item.id]
            if (item.kind === "family") {
              const active = isFamilyGroupActive(pathname)
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setFamilyOpen(true)}
                  className={cn(
                    "flex flex-1 flex-col items-center gap-1 py-3 text-xs transition-colors",
                    active ? "text-primary" : "text-muted-foreground hover:text-foreground"
                  )}
                  aria-expanded={familyOpen}
                  aria-haspopup="dialog"
                >
                  <Icon className="h-5 w-5" />
                  <span className="font-medium">{item.label}</span>
                </button>
              )
            }

            const active = isNavLinkActive(pathname, item.href)
            return (
              <Link
                key={item.id}
                href={item.href}
                className={cn(
                  "flex flex-1 flex-col items-center gap-1 py-3 text-xs transition-colors",
                  active ? "text-primary" : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Icon className="h-5 w-5" />
                <span className="font-medium">{item.label}</span>
              </Link>
            )
          })}
        </div>
      </nav>
      <FamilyNavSheet open={familyOpen} onOpenChange={setFamilyOpen} />
    </>
  )
}
