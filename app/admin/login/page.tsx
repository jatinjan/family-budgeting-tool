"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { supabase } from "@/lib/supabase"
import { ShieldCheck, Lock, Heart, Loader2, AlertCircle } from "lucide-react"

const BRAND = {
  teal: "#63A8A3",
  deepTeal: "#2F6B66",
  sand: "#EBC79A",
  charcoal: "#4A4A4A",
}

export default function AdminLoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (authError) {
        setError(authError.message)
        return
      }

      if (!authData.user) {
        setError('Authentication failed')
        return
      }

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('is_admin')
        .eq('id', authData.user.id)
        .single()

      if (profileError) {
        console.error('Admin profile lookup failed:', profileError)
        setError(
          profileError.message?.toLowerCase().includes('recursion')
            ? 'Unable to verify admin status (database policy error). Re-run updated RLS policies.'
            : 'Unable to verify admin status'
        )
        await supabase.auth.signOut()
        return
      }

      if (!profile?.is_admin) {
        setError('Access denied. Admin privileges required.')
        await supabase.auth.signOut()
        return
      }

      // Use hard redirect to ensure cookies are properly sent to middleware
      window.location.href = "/admin"
    } catch (err) {
      console.error('Login error:', err)
      setError('An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div 
      className="flex min-h-screen items-center justify-center px-4 pb-24"
      style={{ 
        background: `linear-gradient(135deg, ${BRAND.teal}14 0%, ${BRAND.sand}1a 100%)` 
      }}
    >
      <div className="w-full max-w-md">
        <Card className="border-0 bg-white shadow-xl">
          <div className="flex flex-col items-center pt-8 pb-2">
            <div 
              className="flex h-16 w-16 items-center justify-center rounded-2xl mb-4"
              style={{ backgroundColor: BRAND.deepTeal }}
            >
              <Heart className="h-8 w-8 text-white fill-white" />
            </div>
            <h1 className="font-[Nunito] text-2xl font-bold tracking-tight">
              <span style={{ color: BRAND.teal }}>My Balanced</span>
            </h1>
            <p 
              className="text-sm font-medium uppercase tracking-widest"
              style={{ color: BRAND.charcoal }}
            >
              Family Finances
            </p>
          </div>

          <CardHeader className="pt-4 pb-2 text-center">
            <CardTitle 
              className="font-[Nunito] text-lg font-semibold"
              style={{ color: BRAND.deepTeal }}
            >
              Admin Console
            </CardTitle>
            <CardDescription>Sign in to manage families and subscriptions</CardDescription>
          </CardHeader>

          <CardContent className="pb-8">
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 text-red-700 text-sm">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  {error}
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="admin-email" style={{ color: BRAND.charcoal }}>
                  Email
                </Label>
                <Input
                  id="admin-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@mybalancedfamily.com.au"
                  autoComplete="email"
                  className="border-gray-200 focus-visible:ring-[#63A8A3]"
                  disabled={loading}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="admin-password" style={{ color: BRAND.charcoal }}>
                  Password
                </Label>
                <Input
                  id="admin-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••"
                  autoComplete="current-password"
                  className="border-gray-200 focus-visible:ring-[#63A8A3]"
                  disabled={loading}
                  required
                />
              </div>

              <Button 
                type="submit" 
                size="lg" 
                className="w-full gap-2 text-white"
                style={{ backgroundColor: BRAND.deepTeal }}
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  <>
                    <Lock className="h-4 w-4" />
                    Sign in
                  </>
                )}
              </Button>

              <div className="text-center">
                <button
                  type="button"
                  disabled
                  className="text-sm opacity-50 cursor-not-allowed underline-offset-4"
                  style={{ color: BRAND.charcoal }}
                >
                  Forgot password?
                </button>
              </div>
            </form>
          </CardContent>
        </Card>

        <p 
          className="mt-4 flex items-center justify-center gap-1.5 text-center text-xs"
          style={{ color: BRAND.charcoal }}
        >
          <ShieldCheck className="h-3.5 w-3.5" style={{ color: BRAND.teal }} />
          Secured with email verification &amp; session management
        </p>
      </div>
    </div>
  )
}
