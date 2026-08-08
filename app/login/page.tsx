"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useAuth } from "@/contexts/AuthContext"
import { Heart, Loader2, AlertCircle } from "lucide-react"

const BRAND = {
  teal: "#63A8A3",
  deepTeal: "#2F6B66",
  sand: "#EBC79A",
  charcoal: "#4A4A4A",
}

export default function LoginPage() {
  const router = useRouter()
  const { signIn, user, loading: authLoading } = useAuth()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Redirect if already logged in
  useEffect(() => {
    if (user && !authLoading) {
      // Use hard redirect to ensure cookies are properly sent to middleware
      window.location.href = "/household"
    }
  }, [user, authLoading])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setIsSubmitting(true)

    try {
      const { error: signInError } = await signIn(email.trim().toLowerCase(), password)

      if (signInError) {
        setError(signInError.message)
        setIsSubmitting(false)
        return
      }

      // Redirect will happen automatically via useEffect
    } catch (err) {
      setError("An unexpected error occurred. Please try again.")
      console.error("Login error:", err)
    } finally {
      setIsSubmitting(false)
    }
  }

  // Show loading while checking auth state
  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#2F6B66]" />
      </div>
    )
  }

  return (
    <div
      className="flex min-h-screen items-center justify-center px-4 pb-24 pt-8"
      style={{
        background: `linear-gradient(135deg, ${BRAND.teal}14 0%, ${BRAND.sand}1a 100%)`,
      }}
    >
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="mb-6 text-center">
          <div
            className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl"
            style={{ backgroundColor: BRAND.deepTeal }}
          >
            <Heart className="h-7 w-7 text-white fill-white" />
          </div>
          <h1 className="font-[Nunito] text-2xl font-bold tracking-tight">
            <span style={{ color: BRAND.teal }}>My Balanced</span>
          </h1>
          <p className="text-sm" style={{ color: BRAND.charcoal }}>
            Family Finances
          </p>
        </div>

        <Card className="border-0 bg-white shadow-xl">
          <CardHeader className="text-center pb-2">
            <CardTitle
              className="font-[Nunito] text-xl font-semibold"
              style={{ color: BRAND.deepTeal }}
            >
              Welcome back
            </CardTitle>
            <CardDescription>
              Sign in to continue managing your family budget
            </CardDescription>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Email */}
              <div className="space-y-2">
                <Label htmlFor="email" style={{ color: BRAND.charcoal }}>
                  Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="border-gray-200"
                  required
                  autoComplete="email"
                />
              </div>

              {/* Password */}
              <div className="space-y-2">
                <Label htmlFor="password" style={{ color: BRAND.charcoal }}>
                  Password
                </Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••"
                  className="border-gray-200"
                  required
                  autoComplete="current-password"
                />
              </div>

              {/* Error display */}
              {error && (
                <div className="flex items-start gap-2 rounded-lg bg-red-50 p-3 text-sm">
                  <AlertCircle className="h-4 w-4 mt-0.5 shrink-0 text-red-500" />
                  <span className="text-red-600">{error}</span>
                </div>
              )}

              {/* Submit */}
              <Button
                type="submit"
                size="lg"
                className="w-full gap-2 text-white mt-2"
                style={{ backgroundColor: BRAND.deepTeal }}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  "Sign in"
                )}
              </Button>

              {/* Forgot password */}
              <p className="text-center text-sm text-gray-500">
                <button
                  type="button"
                  className="font-medium underline underline-offset-4"
                  style={{ color: BRAND.deepTeal }}
                  onClick={() => {
                    // TODO: Implement forgot password
                    alert("Password reset coming soon!")
                  }}
                >
                  Forgot your password?
                </button>
              </p>
            </form>
          </CardContent>
        </Card>

        {/* Sign up link */}
        <p className="mt-4 text-center text-sm text-gray-500">
          Don't have an account?{" "}
          <button
            onClick={() => router.push("/signup")}
            className="font-medium underline underline-offset-4"
            style={{ color: BRAND.deepTeal }}
          >
            Sign up
          </button>
        </p>
      </div>
    </div>
  )
}
