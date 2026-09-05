"use client"

import type React from "react"
import { usePathname } from "next/navigation"
import { BottomNav } from "@/components/bottom-nav"
import { TopNav } from "@/components/top-nav"
import { Toaster } from "@/components/ui/toaster"
import { useAuth } from "@/contexts/AuthContext"

function shouldShowUserChrome(pathname: string, isLoggedIn: boolean): boolean {
  if (!isLoggedIn) return false
  if (pathname.startsWith("/admin")) return false
  if (pathname === "/login" || pathname === "/signup") return false
  if (pathname.startsWith("/auth/")) return false
  return true
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || "/"
  const { user, loading } = useAuth()
  const showUserChrome = shouldShowUserChrome(pathname, !loading && !!user)

  return (
    <>
      {showUserChrome ? <TopNav /> : null}
      <div
        className={
          showUserChrome
            ? "min-h-screen pb-[calc(5rem+env(safe-area-inset-bottom,0px))] md:pb-0"
            : "min-h-screen"
        }
      >
        {children}
      </div>
      {showUserChrome ? <BottomNav /> : null}
      <Toaster />
    </>
  )
}
