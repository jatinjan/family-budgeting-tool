"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Home, Users, User, ChevronRight } from "lucide-react"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { FAMILY_NAV_CHILDREN, isFamilyChildActive } from "@/lib/app-nav"
import { cn } from "@/lib/utils"

const ICONS = {
  household: Home,
  children: Users,
  adults: User,
} as const

const BLURBS: Record<(typeof FAMILY_NAV_CHILDREN)[number]["id"], string> = {
  household: "Shared household costs",
  children: "Kids' expenses and details",
  adults: "Adult costs and details",
}

type FamilyNavSheetProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function FamilyNavSheet({ open, onOpenChange }: FamilyNavSheetProps) {
  const pathname = usePathname() || "/"

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-2xl pb-[env(safe-area-inset-bottom,0px)]">
        <SheetHeader className="text-left">
          <SheetTitle className="font-serif">Family</SheetTitle>
          <SheetDescription>Choose whose expenses to manage</SheetDescription>
        </SheetHeader>
        <div className="mt-4 flex flex-col gap-2 px-1 pb-4">
          {FAMILY_NAV_CHILDREN.map((child) => {
            const Icon = ICONS[child.id]
            const active = isFamilyChildActive(pathname, child)
            return (
              <Link
                key={child.id}
                href={child.href}
                onClick={() => onOpenChange(false)}
                className={cn(
                  "flex items-center gap-3 rounded-xl border px-4 py-3 transition-colors",
                  active
                    ? "border-primary bg-primary/10 text-foreground"
                    : "border-border bg-card text-muted-foreground hover:border-primary/40 hover:bg-primary/5 hover:text-foreground"
                )}
              >
                <span
                  className={cn(
                    "flex h-10 w-10 shrink-0 items-center justify-center rounded-full",
                    active ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"
                  )}
                >
                  <Icon className="h-5 w-5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium text-foreground">{child.label}</span>
                  <span className="block text-xs text-muted-foreground">{BLURBS[child.id]}</span>
                </span>
                <ChevronRight className="h-4 w-4 shrink-0 opacity-50" />
              </Link>
            )
          })}
        </div>
      </SheetContent>
    </Sheet>
  )
}
