"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { useAuth } from "@/contexts/AuthContext"
import { supabase } from "@/lib/supabase"
import { checkLocalData, migrateToCloud, clearLocalData, type LocalDataSummary } from "@/lib/migration"
import { MigrationPrompt } from "@/components/migration-prompt"
import { useToast } from "@/hooks/use-toast"
import { Heart, Check, X, Sparkles, Tag, Star, Loader2, AlertCircle, Mail } from "lucide-react"

type PlanType = "founding" | "monthly" | "annual"

type PromoCode = {
  code: string
  description: string | null
  status: string
  redemptions: number
  max_redemptions: number | null
}

// Brand colors
const BRAND = {
  teal: "#63A8A3",
  deepTeal: "#2F6B66",
  sand: "#EBC79A",
  charcoal: "#4A4A4A",
}

type PromoResult = {
  valid: boolean
  message: string
  promo?: PromoCode
  appliedPlan?: PlanType
  appliedPrice?: string
}

const PLAN_PRICES: Record<PlanType, { label: string; price: string; period: string; amount: number }> = {
  founding: { label: "Founding Member", price: "$0", period: "invite only", amount: 0 },
  monthly: { label: "Monthly", price: "$12", period: "/month", amount: 12 },
  annual: { label: "Annual", price: "$99", period: "/year", amount: 99 },
}

async function validatePromoCode(code: string): Promise<PromoResult> {
  if (!code.trim()) {
    return { valid: false, message: "" }
  }

  const { data: promo, error } = await supabase
    .from('promo_codes')
    .select('*')
    .eq('code', code.trim().toUpperCase())
    .eq('status', 'active')
    .single()

  if (error || !promo) {
    return { valid: false, message: "Invalid promo code" }
  }

  if (promo.max_redemptions && promo.redemptions >= promo.max_redemptions) {
    return { valid: false, message: "This promo code has reached its limit" }
  }

  if (promo.expires_at && new Date(promo.expires_at) < new Date()) {
    return { valid: false, message: "This promo code has expired" }
  }

  return {
    valid: true,
    message: promo.description || "Promo code applied!",
    promo,
    appliedPlan: "founding",
    appliedPrice: "$0 forever",
  }
}

export default function SignUpPage() {
  const router = useRouter()
  const { signUp, user, loading: authLoading } = useAuth()
  const { toast } = useToast()
  const [familyName, setFamilyName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [selectedPlan, setSelectedPlan] = useState<PlanType>("founding")
  const [promoCode, setPromoCode] = useState("")
  const [promoResult, setPromoResult] = useState<PromoResult | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [showConfirmationMessage, setShowConfirmationMessage] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [checkingPromo, setCheckingPromo] = useState(false)
  const [showMigrationPrompt, setShowMigrationPrompt] = useState(false)
  const [localDataSummary, setLocalDataSummary] = useState<LocalDataSummary | null>(null)
  const [newUserId, setNewUserId] = useState<string | null>(null)

  // Redirect if already logged in (but not if we're showing migration prompt)
  useEffect(() => {
    if (user && !authLoading && !showMigrationPrompt) {
      router.push("/household")
    }
  }, [user, authLoading, router, showMigrationPrompt])

  async function handlePromoCheck() {
    setCheckingPromo(true)
    const result = await validatePromoCode(promoCode)
    setPromoResult(result)
    if (result.valid && result.appliedPlan) {
      setSelectedPlan(result.appliedPlan)
    }
    setCheckingPromo(false)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setIsSubmitting(true)
    
    try {
      // Sign up with Supabase
      const { error: signUpError, needsEmailConfirmation } = await signUp(
        email.trim().toLowerCase(),
        password,
        {
          family_name: familyName.trim(),
          promo_code_used: promoResult?.valid ? promoResult.promo?.code : undefined,
        }
      )

      if (signUpError) {
        setError(signUpError.message)
        setIsSubmitting(false)
        return
      }

      // Email confirmation required — no session yet (auth-flow §1.6)
      if (needsEmailConfirmation) {
        setShowConfirmationMessage(true)
        setIsSubmitting(false)
        return
      }

      // If promo code was used, increment redemption count
      if (promoResult?.valid && promoResult.promo) {
        await supabase.rpc('redeem_promo_code', { code_input: promoResult.promo.code })
      }

      // Check for existing local data (only when session exists)
      const dataSummary = await checkLocalData()
      
      if (dataSummary.hasData) {
        // Get the user ID from the session
        const { data: { user: newUser } } = await supabase.auth.getUser()
        if (newUser) {
          setNewUserId(newUser.id)
          setLocalDataSummary(dataSummary)
          setShowMigrationPrompt(true)
        } else {
          setIsSubmitted(true)
        }
      } else {
        setIsSubmitted(true)
      }
    } catch (err) {
      setError("An unexpected error occurred. Please try again.")
      console.error("Signup error:", err)
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleMigrate() {
    if (!newUserId) return

    try {
      const result = await migrateToCloud(newUserId)
      
      if (result.success) {
        toast({
          title: "Data imported successfully",
          description: `Imported ${result.migratedCount} items to your account.`,
        })
        router.push("/dashboard")
      } else {
        toast({
          title: "Import completed with errors",
          description: `Imported ${result.migratedCount} items. Some items could not be imported.`,
          variant: "destructive",
        })
        router.push("/dashboard")
      }
    } catch (err) {
      console.error("Migration error:", err)
      toast({
        title: "Import failed",
        description: "An error occurred while importing your data.",
        variant: "destructive",
      })
      router.push("/household")
    } finally {
      setShowMigrationPrompt(false)
    }
  }

  async function handleStartFresh() {
    try {
      await clearLocalData()
      toast({
        title: "Starting fresh",
        description: "Your local data has been cleared.",
      })
    } catch (err) {
      console.error("Clear data error:", err)
    } finally {
      setShowMigrationPrompt(false)
      router.push("/household")
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

  // Show migration prompt if we have local data
  if (showMigrationPrompt && localDataSummary) {
    return (
      <div
        className="flex min-h-screen items-center justify-center px-4"
        style={{
          background: `linear-gradient(135deg, ${BRAND.teal}14 0%, ${BRAND.sand}1a 100%)`,
        }}
      >
        <MigrationPrompt
          open={true}
          localDataSummary={localDataSummary}
          onMigrate={handleMigrate}
          onStartFresh={handleStartFresh}
        />
      </div>
    )
  }

  // Email confirmation required (auth-flow §1.6.1)
  if (showConfirmationMessage) {
    return (
      <div
        className="flex min-h-screen items-center justify-center px-4 pb-24"
        style={{
          background: `linear-gradient(135deg, ${BRAND.teal}14 0%, ${BRAND.sand}1a 100%)`,
        }}
      >
        <Card className="w-full max-w-md border-0 bg-white shadow-xl text-center">
          <CardContent className="pt-8 pb-8">
            <div
              className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full"
              style={{ backgroundColor: `${BRAND.teal}20` }}
            >
              <Mail className="h-8 w-8" style={{ color: BRAND.deepTeal }} />
            </div>

            <h1
              className="font-[Nunito] text-2xl font-bold mb-2"
              style={{ color: BRAND.deepTeal }}
            >
              Check your email
            </h1>

            <p className="text-gray-600 mb-6">
              We sent a confirmation link to{" "}
              <span className="font-medium" style={{ color: BRAND.charcoal }}>
                {email.trim().toLowerCase()}
              </span>
              . Click the link to activate your account, then you can start budgeting.
            </p>

            <div className="space-y-3">
              <Button
                className="w-full text-white"
                style={{ backgroundColor: BRAND.deepTeal }}
                onClick={() => router.push("/login")}
              >
                Back to sign in
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Success state (Confirm email OFF — session exists immediately)
  if (isSubmitted) {
    const finalPlan = promoResult?.appliedPlan || selectedPlan
    const planInfo = PLAN_PRICES[finalPlan]

    return (
      <div
        className="flex min-h-screen items-center justify-center px-4 pb-24"
        style={{
          background: `linear-gradient(135deg, ${BRAND.teal}14 0%, ${BRAND.sand}1a 100%)`,
        }}
      >
        <Card className="w-full max-w-md border-0 bg-white shadow-xl text-center">
          <CardContent className="pt-8 pb-8">
            <div
              className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full"
              style={{ backgroundColor: `${BRAND.teal}20` }}
            >
              <Check className="h-8 w-8" style={{ color: BRAND.deepTeal }} />
            </div>

            <h1
              className="font-[Nunito] text-2xl font-bold mb-2"
              style={{ color: BRAND.deepTeal }}
            >
              Welcome to the family!
            </h1>

            <p className="text-gray-600 mb-6">
              Your account has been created successfully.
            </p>

            <div
              className="rounded-lg p-4 mb-6"
              style={{ backgroundColor: `${BRAND.sand}20` }}
            >
              <div className="flex items-center justify-center gap-2 mb-2">
                {finalPlan === "founding" && (
                  <Star className="h-5 w-5" style={{ color: "#8a6837" }} />
                )}
                <span
                  className="font-semibold"
                  style={{ color: BRAND.charcoal }}
                >
                  {planInfo.label}
                </span>
              </div>
              <p className="text-2xl font-bold" style={{ color: BRAND.deepTeal }}>
                {planInfo.price}
                <span className="text-sm font-normal text-gray-500">
                  {planInfo.period}
                </span>
              </p>
              {promoResult?.valid && promoResult.promo && (
                <Badge
                  className="mt-2 border-transparent"
                  style={{ backgroundColor: `${BRAND.sand}40`, color: "#8a6837" }}
                >
                  <Tag className="h-3 w-3 mr-1" />
                  {promoResult.promo.code} applied
                </Badge>
              )}
            </div>

            <div className="space-y-3">
              <Button
                className="w-full text-white"
                style={{ backgroundColor: BRAND.deepTeal }}
                onClick={() => router.push("/household")}
              >
                Start budgeting
              </Button>
            </div>
          </CardContent>
        </Card>
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
              Create your account
            </CardTitle>
            <CardDescription>
              Start planning your family's finances today
            </CardDescription>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Family name */}
              <div className="space-y-2">
                <Label htmlFor="family-name" style={{ color: BRAND.charcoal }}>
                  Family name
                </Label>
                <Input
                  id="family-name"
                  value={familyName}
                  onChange={(e) => setFamilyName(e.target.value)}
                  placeholder="e.g., The Smith Family"
                  className="border-gray-200"
                  required
                />
              </div>

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
                />
              </div>

              {/* Promo code */}
              <div className="space-y-2">
                <Label htmlFor="promo" style={{ color: BRAND.charcoal }}>
                  Promo code
                  <span className="text-gray-400 font-normal"> (optional)</span>
                </Label>
                <div className="flex gap-2">
                  <Input
                    id="promo"
                    value={promoCode}
                    onChange={(e) => {
                      setPromoCode(e.target.value.toUpperCase())
                      setPromoResult(null)
                    }}
                    placeholder="e.g., FOUNDING"
                    className="border-gray-200 font-mono uppercase"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    className="shrink-0 border-gray-200"
                    onClick={handlePromoCheck}
                    disabled={checkingPromo || !promoCode.trim()}
                  >
                    {checkingPromo ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      "Apply"
                    )}
                  </Button>
                </div>

                {/* Promo result */}
                {promoResult && (
                  <div
                    className={`flex items-start gap-2 rounded-lg p-3 text-sm ${
                      promoResult.valid
                        ? "bg-[#63A8A3]/10"
                        : "bg-red-50"
                    }`}
                  >
                    {promoResult.valid ? (
                      <>
                        <Sparkles
                          className="h-4 w-4 mt-0.5 shrink-0"
                          style={{ color: BRAND.deepTeal }}
                        />
                        <div>
                          <span
                            className="font-medium"
                            style={{ color: BRAND.deepTeal }}
                          >
                            {promoResult.promo?.code}
                          </span>
                          <span className="text-gray-600">
                            {" — "}
                            {promoResult.message}
                          </span>
                        </div>
                      </>
                    ) : (
                      <>
                        <X className="h-4 w-4 mt-0.5 shrink-0 text-red-500" />
                        <span className="text-red-600">{promoResult.message}</span>
                      </>
                    )}
                  </div>
                )}
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
                    Creating account...
                  </>
                ) : (
                  <>
                    <Heart className="h-4 w-4" />
                    Create free account
                  </>
                )}
              </Button>

              <p className="text-center text-xs text-gray-500">
                By signing up, you agree to our Terms of Service and Privacy Policy
              </p>
            </form>
          </CardContent>
        </Card>

        {/* Sign in link */}
        <p className="mt-4 text-center text-sm text-gray-500">
          Already have an account?{" "}
          <button
            onClick={() => router.push("/login")}
            className="font-medium underline underline-offset-4"
            style={{ color: BRAND.deepTeal }}
          >
            Sign in
          </button>
        </p>
      </div>
    </div>
  )
}
