"use client"

import { HandHelping, Loader2, Lock, WifiOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useBudgetEditLock } from '@/hooks/use-budget-edit-lock'

function minutesLeft(iso: string | null): number | null {
  if (!iso) return null
  return Math.max(0, Math.ceil((Date.parse(iso) - Date.now()) / 60_000))
}

export function BudgetEditLockBanner() {
  const { phase, edit, waitingForConnection, busy, error, accept, decline, takeBack } =
    useBudgetEditLock()
  const coach = edit.coachName || 'Your coach'

  if (phase === 'unlocked') return null

  if (phase === 'requested') {
    return (
      <div className="mx-auto max-w-4xl px-4 pt-4">
        <div
          role="alertdialog"
          aria-labelledby="coach-request-title"
          className="rounded-xl border border-primary/30 bg-primary/5 p-4 shadow-sm"
        >
          <div className="flex items-start gap-3">
            <HandHelping className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
            <div className="flex-1 space-y-3">
              <div>
                <p id="coach-request-title" className="font-semibold text-foreground">
                  {coach} would like to fill in part of your budget.
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  While {coach} is editing, you can watch the changes appear but you won&apos;t be
                  able to edit. You can take back editing at any time.
                </p>
              </div>
              {error ? <p className="text-sm text-destructive">{error}</p> : null}
              <div className="flex flex-wrap gap-2">
                <Button onClick={() => void accept()} disabled={busy} className="gap-2">
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  Let {coach} help
                </Button>
                <Button variant="outline" onClick={() => void decline()} disabled={busy}>
                  Not now
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const remaining = minutesLeft(edit.expiresAt)

  return (
    <div className="sticky top-0 z-40 border-b border-amber-200 bg-amber-50">
      <div className="mx-auto flex max-w-4xl flex-wrap items-center gap-3 px-4 py-3">
        {waitingForConnection ? (
          <WifiOff className="h-5 w-5 shrink-0 text-amber-700" />
        ) : phase === 'unlocking' ? (
          <Loader2 className="h-5 w-5 shrink-0 animate-spin text-amber-700" />
        ) : (
          <Lock className="h-5 w-5 shrink-0 text-amber-700" />
        )}
        <div className="flex-1 text-sm text-amber-900">
          {waitingForConnection ? (
            <p>Reconnect to continue editing. We need to load {coach}&apos;s changes first.</p>
          ) : phase === 'unlocking' ? (
            <p>Loading {coach}&apos;s changes…</p>
          ) : (
            <p>
              <span className="font-semibold">{coach} is filling in your budget.</span> You can
              watch changes appear. Editing returns when they&apos;re done
              {remaining !== null ? ` (at most ${remaining} min)` : ''}.
            </p>
          )}
          {error ? <p className="mt-1 text-destructive">{error}</p> : null}
        </div>
        {phase === 'locked' && !waitingForConnection && edit.mode === 'assist' ? (
          <Button
            size="sm"
            variant="outline"
            onClick={() => void takeBack()}
            disabled={busy}
            className="border-amber-300 bg-white"
          >
            Take back editing
          </Button>
        ) : null}
      </div>
    </div>
  )
}
