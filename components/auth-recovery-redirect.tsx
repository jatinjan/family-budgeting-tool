"use client"

import { useEffect } from "react"
import { usePathname } from "next/navigation"

const SET_PASSWORD = "/auth/set-password"

/** Dashboard recovery emails land on the Site URL. Keep the token and send them to set a password. */
export function AuthRecoveryRedirect() {
  const pathname = usePathname()

  useEffect(() => {
    if (pathname === SET_PASSWORD) return
    const hash = new URLSearchParams(window.location.hash.slice(1))
    const query = new URLSearchParams(window.location.search)
    const type = hash.get("type") || query.get("type")
    if (type !== "recovery") return
    window.location.replace(`${SET_PASSWORD}${window.location.search}${window.location.hash}`)
  }, [pathname])

  return null
}
