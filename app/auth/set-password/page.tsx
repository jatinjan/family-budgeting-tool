"use client"

import { useEffect, useState } from "react"
import type { EmailOtpType } from "@supabase/supabase-js"
import { Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { APP_CONFIG } from "@/lib/config"
import { claimFamilyBudget } from "@/lib/budget-edit-lock"
import { supabase } from "@/lib/supabase"
import { validatePassword, validatePasswordConfirmation } from "@/lib/utils/validators"

type Stage = "checking" | "ready" | "invalid" | "saving"

async function establishSessionFromLink(): Promise<string | null> {
  const hash = new URLSearchParams(window.location.hash.slice(1))
  const query = new URLSearchParams(window.location.search)

  const linkError = hash.get("error_description") || query.get("error_description")
  if (linkError) return linkError.replace(/\+/g, " ")

  const accessToken = hash.get("access_token")
  const refreshToken = hash.get("refresh_token")
  const tokenHash = query.get("token_hash")
  const type = query.get("type") as EmailOtpType | null
  const code = query.get("code")

  if (accessToken && refreshToken) {
    const { error } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    })
    if (error) return error.message
  } else if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type })
    if (error) return error.message
  } else if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (error) return error.message
  }

  if (accessToken || tokenHash || code) {
    window.history.replaceState(null, "", window.location.pathname)
  }

  const { data } = await supabase.auth.getSession()
  return data.session ? null : "This link has expired or was already used."
}

export default function SetPasswordPage() {
  const [stage, setStage] = useState<Stage>("checking")
  const [linkError, setLinkError] = useState<string | null>(null)
  const [password, setPassword] = useState("")
  const [confirmation, setConfirmation] = useState("")
  const [acceptedTerms, setAcceptedTerms] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    void establishSessionFromLink().then((error) => {
      if (cancelled) return
      setLinkError(error)
      setStage(error ? "invalid" : "ready")
    })
    return () => {
      cancelled = true
    }
  }, [])

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    const passwordCheck = validatePassword(password)
    if (!passwordCheck.valid) return setFormError(passwordCheck.error ?? null)
    const confirmCheck = validatePasswordConfirmation(password, confirmation)
    if (!confirmCheck.valid) return setFormError(confirmCheck.error ?? null)
    if (!acceptedTerms) {
      return setFormError("Please confirm you have read the Terms of Service and Privacy Policy.")
    }

    setFormError(null)
    setStage("saving")
    const { error } = await supabase.auth.updateUser({ password })
    if (error) {
      setFormError(error.message)
      setStage("ready")
      return
    }
    try {
      await claimFamilyBudget()
    } catch (claimError) {
      setFormError(
        claimError instanceof Error
          ? claimError.message
          : "Password saved, but we could not finish setup. Try again.",
      )
      setStage("ready")
      return
    }
    window.location.href = "/"
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-primary/5 via-secondary/5 to-accent/5 px-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="font-[Nunito]">Set your password</CardTitle>
          <CardDescription>
            Choose a password for {APP_CONFIG.APP_NAME}. You&apos;ll use it with your email to sign in.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {stage === "checking" ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Checking your link…
            </div>
          ) : stage === "invalid" ? (
            <div className="space-y-4">
              <p className="text-sm text-destructive">{linkError}</p>
              <p className="text-sm text-muted-foreground">
                Use Forgot your password on the sign-in page, or ask your coach to send a password reset.
              </p>
              <Button asChild variant="outline" className="w-full">
                <a href="/login">Go to sign in</a>
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="new-password">New password</Label>
                <Input
                  id="new-password"
                  type="password"
                  autoComplete="new-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm-password">Confirm password</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  autoComplete="new-password"
                  value={confirmation}
                  onChange={(event) => setConfirmation(event.target.value)}
                  required
                />
              </div>
              <div className="flex items-start gap-2">
                <Checkbox
                  id="accept-terms"
                  checked={acceptedTerms}
                  onCheckedChange={(value) => setAcceptedTerms(value === true)}
                  className="mt-0.5"
                />
                <Label htmlFor="accept-terms" className="text-sm font-normal leading-5">
                  I have read the{" "}
                  <a href="/terms" target="_blank" rel="noopener noreferrer" className="underline underline-offset-4">
                    Terms of Service
                  </a>{" "}
                  and{" "}
                  <a href="/privacy" target="_blank" rel="noopener noreferrer" className="underline underline-offset-4">
                    Privacy Policy
                  </a>
                  .
                </Label>
              </div>
              {formError ? <p className="text-sm text-destructive">{formError}</p> : null}
              <Button type="submit" className="w-full gap-2" disabled={stage === "saving"}>
                {stage === "saving" ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Save password and continue
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
