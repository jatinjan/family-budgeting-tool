"use client"

import type React from "react"
import { usePathname } from "next/navigation"
import { BottomNav } from "@/components/bottom-nav"

function shouldShowUserChrome(pathname: string): boolean {
  if (pathname.startsWith("/admin")) return false
  if (pathname === "/login" || pathname === "/signup") return false
  if (pathname.startsWith("/auth/")) return false
  return true
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || "/"
  const showUserChrome = shouldShowUserChrome(pathname)

  return (
    <>
      <div
        className={showUserChrome ? "min-h-screen pb-20" : "min-h-screen"}
        style={
          showUserChrome
            ? { paddingBottom: "calc(5rem + env(safe-area-inset-bottom, 0px))" }
            : undefined
        }
      >
        {children}
      </div>
      {showUserChrome ? <BottomNav /> : null}
    </>
  )
}
