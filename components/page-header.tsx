"use client"

import { useState } from "react"
import { LogOut, Loader2 } from "lucide-react"
import { APP_CONFIG } from "@/lib/config"
import { useAuth } from "@/contexts/AuthContext"
import { Button } from "@/components/ui/button"

export function PageHeader() {
  const { user, signOut } = useAuth()
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
    <div className="relative mb-6 text-center">
      {user && (
        <div className="absolute right-0 top-0">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-1.5 border-gray-200 text-muted-foreground hover:text-foreground"
            onClick={handleSignOut}
            disabled={signingOut}
            aria-label="Sign out"
          >
            {signingOut ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <LogOut className="h-3.5 w-3.5" />
            )}
            <span className="hidden sm:inline">Sign out</span>
          </Button>
        </div>
      )}
      <h1 className="mb-1 font-serif text-2xl font-bold text-balance text-primary">
        {APP_CONFIG.APP_NAME}
      </h1>
      <p className="text-sm text-muted-foreground text-balance">
        {APP_CONFIG.APP_TAGLINE}
      </p>
    </div>
  )
}
