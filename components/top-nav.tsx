"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { ChevronDown, LogOut, Loader2, Home, Users, User } from "lucide-react"
import { APP_CONFIG } from "@/lib/config"
import { useAuth } from "@/contexts/AuthContext"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  APP_NAV_ITEMS,
  FAMILY_NAV_CHILDREN,
  isFamilyChildActive,
  isFamilyGroupActive,
  isNavLinkActive,
} from "@/lib/app-nav"
import { cn } from "@/lib/utils"

const FAMILY_ICONS = {
  household: Home,
  children: Users,
  adults: User,
} as const

const FAMILY_BLURBS: Record<(typeof FAMILY_NAV_CHILDREN)[number]["id"], string> = {
  household: "Shared household costs",
  children: "Kids' expenses",
  adults: "Adult costs",
}

export function TopNav() {
  const pathname = usePathname() || "/"
  const { signOut } = useAuth()
  const [signingOut, setSigningOut] = useState(false)

  async function handleSignOut() {
    setSigningOut(true)
    try {
      await signOut()
      window.location.href = "/"
    } catch (err) {
      console.error("Sign out error:", err)
      setSigningOut(false)
    }
  }

  return (
    <header className="sticky top-0 z-50 hidden border-b bg-card/95 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-card/80 md:block">
      <div className="mx-auto flex h-14 max-w-5xl items-center gap-4 px-4">
        <Link
          href="/"
          className="shrink-0 font-serif text-base font-semibold text-primary hover:opacity-90"
        >
          {APP_CONFIG.APP_NAME}
        </Link>

        <nav className="flex flex-1 items-center justify-center gap-1" aria-label="Main">
          {APP_NAV_ITEMS.map((item) => {
            if (item.kind === "family") {
              const active = isFamilyGroupActive(pathname)
              return (
                <DropdownMenu key={item.id}>
                  <DropdownMenuTrigger
                    className={cn(
                      "inline-flex items-center gap-1 rounded-md px-3 py-2 text-sm font-medium outline-none transition-colors",
                      active
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                  >
                    {item.label}
                    <ChevronDown className="h-3.5 w-3.5 opacity-70" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="center" className="w-64">
                    {FAMILY_NAV_CHILDREN.map((child) => {
                      const Icon = FAMILY_ICONS[child.id]
                      const childActive = isFamilyChildActive(pathname, child)
                      return (
                        <DropdownMenuItem key={child.id} asChild>
                          <Link
                            href={child.href}
                            className={cn(
                              "flex cursor-pointer items-start gap-3 py-2",
                              childActive && "bg-primary/5"
                            )}
                          >
                            <Icon
                              className={cn(
                                "mt-0.5 h-4 w-4 shrink-0",
                                childActive ? "text-primary" : "text-muted-foreground"
                              )}
                            />
                            <span>
                              <span
                                className={cn(
                                  "block text-sm font-medium",
                                  childActive ? "text-primary" : "text-foreground"
                                )}
                              >
                                {child.label}
                              </span>
                              <span className="block text-xs text-muted-foreground">
                                {FAMILY_BLURBS[child.id]}
                              </span>
                            </span>
                          </Link>
                        </DropdownMenuItem>
                      )
                    })}
                  </DropdownMenuContent>
                </DropdownMenu>
              )
            }

            const active = isNavLinkActive(pathname, item.href)
            return (
              <Link
                key={item.id}
                href={item.href}
                className={cn(
                  "rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  active
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                {item.label}
              </Link>
            )
          })}
        </nav>

        <Button
          type="button"
          variant="outline"
          size="sm"
          className="shrink-0 gap-1.5 border-gray-200 text-muted-foreground hover:text-foreground"
          onClick={handleSignOut}
          disabled={signingOut}
          aria-label="Sign out"
        >
          {signingOut ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <LogOut className="h-3.5 w-3.5" />
          )}
          <span>Sign out</span>
        </Button>
      </div>
    </header>
  )
}
