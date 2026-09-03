"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Check, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { PageHeader } from "@/components/page-header"
import { useAuth } from "@/contexts/AuthContext"
import { db } from "@/lib/db"
import { updateProfile } from "@/lib/supabase"
import {
  BALANCE_CUSTOM_GOAL,
  BALANCE_GOALS,
  BALANCE_GUEST_AUTH_PATH,
  BALANCE_HOW_IT_WORKS_STEPS,
  BALANCE_SETTING_KEYS,
  intentionFromProfile,
  intentionToCloud,
  isPresetBalanceGoal,
  resolveBalanceGoal,
} from "@/lib/balance-home"

function applyIntentionToForm(
  goal: string,
  yearly: string,
  monthly: string,
  setters: {
    setSelectedGoal: (v: string | null) => void
    setCustomGoal: (v: string) => void
    setYearlyGoal: (v: string) => void
    setMonthlyBuffer: (v: string) => void
    setIntentionSet: (v: boolean) => void
  }
) {
  if (goal) {
    if (isPresetBalanceGoal(goal)) {
      setters.setSelectedGoal(goal)
      setters.setCustomGoal("")
    } else {
      setters.setSelectedGoal(BALANCE_CUSTOM_GOAL)
      setters.setCustomGoal(goal)
    }
    setters.setIntentionSet(true)
  }
  if (yearly) setters.setYearlyGoal(yearly)
  if (monthly) setters.setMonthlyBuffer(monthly)
}

export default function BalancePage() {
  const router = useRouter()
  const { user, profile, loading: authLoading, refreshProfile } = useAuth()
  const [selectedGoal, setSelectedGoal] = useState<string | null>(null)
  const [customGoal, setCustomGoal] = useState("")
  const [yearlyGoal, setYearlyGoal] = useState("")
  const [monthlyBuffer, setMonthlyBuffer] = useState("")
  const [intentionSet, setIntentionSet] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  const isLoggedIn = !authLoading && !!user
  const resolvedGoal = resolveBalanceGoal(selectedGoal, customGoal)

  useEffect(() => {
    if (!isLoggedIn) return

    let cancelled = false
    async function load() {
      const fromProfile = intentionFromProfile(profile)
      if (fromProfile) {
        if (cancelled) return
        applyIntentionToForm(fromProfile.goal, fromProfile.yearlySavingsGoal, fromProfile.monthlyBuffer, {
          setSelectedGoal,
          setCustomGoal,
          setYearlyGoal,
          setMonthlyBuffer,
          setIntentionSet,
        })
        await Promise.all([
          db.settings.put({ key: BALANCE_SETTING_KEYS.goal, value: fromProfile.goal }),
          db.settings.put({
            key: BALANCE_SETTING_KEYS.yearlySavingsGoal,
            value: fromProfile.yearlySavingsGoal,
          }),
          db.settings.put({
            key: BALANCE_SETTING_KEYS.monthlyBuffer,
            value: fromProfile.monthlyBuffer,
          }),
        ])
        return
      }

      const [goal, yearly, monthly] = await Promise.all([
        db.settings.get(BALANCE_SETTING_KEYS.goal),
        db.settings.get(BALANCE_SETTING_KEYS.yearlySavingsGoal),
        db.settings.get(BALANCE_SETTING_KEYS.monthlyBuffer),
      ])
      if (cancelled) return
      applyIntentionToForm(goal?.value || "", yearly?.value || "", monthly?.value || "", {
        setSelectedGoal,
        setCustomGoal,
        setYearlyGoal,
        setMonthlyBuffer,
        setIntentionSet,
      })
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [isLoggedIn, profile])

  async function saveIntention(): Promise<boolean> {
    if (!resolvedGoal) return false

    if (!isLoggedIn || !user) {
      router.push(BALANCE_GUEST_AUTH_PATH)
      return false
    }

    setSaving(true)
    setSaveError(null)
    try {
      await db.settings.put({ key: BALANCE_SETTING_KEYS.goal, value: resolvedGoal })
      await db.settings.put({
        key: BALANCE_SETTING_KEYS.yearlySavingsGoal,
        value: yearlyGoal,
      })
      await db.settings.put({
        key: BALANCE_SETTING_KEYS.monthlyBuffer,
        value: monthlyBuffer,
      })

      const cloud = intentionToCloud({
        goal: resolvedGoal,
        yearlySavingsGoal: yearlyGoal,
        monthlyBuffer,
      })
      const { error } = await updateProfile(user.id, cloud)
      if (error) {
        setSaveError(
          error.message || "Saved on this device, but could not sync to the cloud. Try again."
        )
        setIntentionSet(true)
        return false
      }

      await refreshProfile()
      setIntentionSet(true)
      return true
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not save your intention. Try again."
      setSaveError(message)
      setIntentionSet(true)
      return false
    } finally {
      setSaving(false)
    }
  }

  async function handleSetIntention() {
    await saveIntention()
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-secondary/5 to-accent/5 pb-24 md:pb-8">
      <div className="mx-auto max-w-2xl px-4 py-8">
        <PageHeader />

        <Card className="mb-8 border-primary/20 bg-gradient-to-br from-primary/5 to-secondary/5 shadow-lg">
          <CardContent className="p-6 text-center">
            <h2 className="mb-2 font-[family-name:var(--font-nunito)] text-2xl font-semibold text-balance text-foreground">
              Welcome to My Balanced Family Finances
            </h2>
            <p className="mx-auto max-w-md text-base font-normal leading-relaxed text-balance text-muted-foreground">
              A clear space to understand your family&apos;s spending and create more balance in your
              life.
            </p>
          </CardContent>
        </Card>

        <Card className="mb-6">
          <CardContent className="p-6">
            <h2 className="font-[family-name:var(--font-nunito)] text-xl font-semibold text-balance text-foreground">
              &ldquo;What matters most to you this year?&rdquo;
            </h2>
            <p className="mt-2 text-sm font-normal text-muted-foreground">
              Choose the goal that feels most important right now:
            </p>

            <div
              className="mt-5 flex flex-col gap-2"
              role="radiogroup"
              aria-label="Your main goal this year"
            >
              {BALANCE_GOALS.map((goal) => {
                const selected = selectedGoal === goal
                return (
                  <button
                    key={goal}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    onClick={() => setSelectedGoal(goal)}
                    className={`flex items-center justify-between gap-3 rounded-lg border px-4 py-3 text-left text-sm transition-colors ${
                      selected
                        ? "border-primary bg-primary/10 font-medium text-foreground"
                        : "border-border bg-card text-muted-foreground hover:border-primary/40 hover:bg-primary/5"
                    }`}
                  >
                    <span>{goal}</span>
                    <span
                      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${
                        selected
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border"
                      }`}
                    >
                      {selected ? <Check className="h-3 w-3" /> : null}
                    </span>
                  </button>
                )
              })}

              <button
                type="button"
                role="radio"
                aria-checked={selectedGoal === BALANCE_CUSTOM_GOAL}
                onClick={() => setSelectedGoal(BALANCE_CUSTOM_GOAL)}
                className={`flex items-center justify-between gap-3 rounded-lg border px-4 py-3 text-left text-sm transition-colors ${
                  selectedGoal === BALANCE_CUSTOM_GOAL
                    ? "border-primary bg-primary/10 font-medium text-foreground"
                    : "border-border bg-card text-muted-foreground hover:border-primary/40 hover:bg-primary/5"
                }`}
              >
                <span>Something else</span>
                <span
                  className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${
                    selectedGoal === BALANCE_CUSTOM_GOAL
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border"
                  }`}
                >
                  {selectedGoal === BALANCE_CUSTOM_GOAL ? <Check className="h-3 w-3" /> : null}
                </span>
              </button>
            </div>

            <div className="mt-4">
              <Label htmlFor="custom-goal" className="text-sm font-medium">
                In your own words
              </Label>
              <Input
                id="custom-goal"
                type="text"
                placeholder="If none of the above suit you, write your own goal here"
                value={customGoal}
                onChange={(e) => {
                  setCustomGoal(e.target.value)
                  if (e.target.value.trim()) setSelectedGoal(BALANCE_CUSTOM_GOAL)
                }}
                className="mt-2"
              />
            </div>
          </CardContent>
        </Card>

        <Card className="mb-6">
          <CardContent className="p-6">
            <h2 className="font-[family-name:var(--font-nunito)] text-xl font-semibold text-balance text-foreground">
              Set your saving intention
            </h2>
            <p className="mt-2 text-sm font-normal text-muted-foreground">
              How much would you love to save or set aside this year?
            </p>

            <div className="mt-5 flex flex-col gap-4 sm:flex-row">
              <div className="flex-1">
                <Label htmlFor="yearly-goal" className="text-sm font-medium">
                  Yearly savings goal{" "}
                  <span className="font-normal text-muted-foreground">(optional)</span>
                </Label>
                <Input
                  id="yearly-goal"
                  type="number"
                  inputMode="decimal"
                  min={0}
                  placeholder="$0"
                  value={yearlyGoal}
                  onChange={(e) => setYearlyGoal(e.target.value)}
                  className="mt-2"
                />
              </div>
              <div className="flex-1">
                <Label htmlFor="monthly-buffer" className="text-sm font-medium">
                  Monthly buffer{" "}
                  <span className="font-normal text-muted-foreground">(optional)</span>
                </Label>
                <Input
                  id="monthly-buffer"
                  type="number"
                  inputMode="decimal"
                  min={0}
                  placeholder="$0"
                  value={monthlyBuffer}
                  onChange={(e) => setMonthlyBuffer(e.target.value)}
                  className="mt-2"
                />
              </div>
            </div>

            <div className="mt-5 flex flex-wrap items-center gap-3">
              <Button
                onClick={handleSetIntention}
                disabled={!resolvedGoal || saving}
                className="gap-2"
              >
                Set your intention
              </Button>
              {intentionSet && isLoggedIn && !saveError ? (
                <span className="flex items-center gap-1.5 text-sm text-primary">
                  <Check className="h-4 w-4" /> Saved
                </span>
              ) : null}
            </div>
            {saveError ? (
              <p className="mt-3 text-sm text-destructive" role="alert">
                {saveError}
              </p>
            ) : null}
            {!isLoggedIn && !authLoading ? (
              <p className="mt-3 text-xs font-normal text-muted-foreground">
                <Link
                  href="/signup"
                  className="text-primary underline underline-offset-4 hover:text-primary/80"
                >
                  Sign up
                </Link>{" "}
                or{" "}
                <Link
                  href="/login"
                  className="text-primary underline underline-offset-4 hover:text-primary/80"
                >
                  sign in
                </Link>{" "}
                to save your intention.
              </p>
            ) : null}
          </CardContent>
        </Card>

        <Card className="mb-8">
          <CardContent className="p-6">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                <Sparkles className="h-5 w-5 text-primary" />
              </div>
              <h2 className="font-[family-name:var(--font-nunito)] text-xl font-semibold text-foreground">
                How My BFF works
              </h2>
            </div>
            <p className="mb-4 text-sm font-normal leading-relaxed text-muted-foreground">
              Now that your goals are set, here&apos;s your simple path forward:
            </p>
            <ol className="flex flex-col gap-3 text-sm font-normal text-muted-foreground">
              {BALANCE_HOW_IT_WORKS_STEPS.map((step, i) => (
                <li key={step} className="flex items-start gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                    {i + 1}
                  </span>
                  <span className="leading-relaxed">{step}</span>
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>

        <p className="text-center font-[family-name:var(--font-nunito)] text-lg font-semibold text-balance text-foreground">
          A more balanced year begins with clarity.
        </p>
      </div>
    </div>
  )
}
