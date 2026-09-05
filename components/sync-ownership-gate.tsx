"use client"

import { useState } from 'react'
import { AlertTriangle, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { LegacyOwnershipAction, SyncResult } from '@/types/sync'

interface SyncOwnershipGateProps {
  recoveryRequired: boolean
  onResolve: (action: LegacyOwnershipAction) => Promise<SyncResult>
  syncFailed?: boolean
  isOnline?: boolean
  onRetry?: () => Promise<SyncResult>
}

export function SyncOwnershipGate({
  recoveryRequired,
  onResolve,
  syncFailed = false,
  isOnline = true,
  onRetry,
}: SyncOwnershipGateProps) {
  const [working, setWorking] = useState<LegacyOwnershipAction | null>(null)
  const [error, setError] = useState<string | null>(null)

  if (!recoveryRequired) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center text-sm text-muted-foreground">
          <div className="flex items-center justify-center gap-3">
            {!syncFailed && <Loader2 className="h-5 w-5 animate-spin" />}
            {syncFailed ? 'Your budget could not be loaded.' : 'Preparing your budget…'}
          </div>
          {syncFailed && onRetry && (
            <Button
              className="mt-4"
              onClick={() => void onRetry()}
              disabled={!isOnline}
            >
              Retry
            </Button>
          )}
          {!isOnline && <p className="mt-3">Reconnect to continue.</p>}
        </div>
      </main>
    )
  }

  const resolve = async (action: LegacyOwnershipAction) => {
    setWorking(action)
    setError(null)
    const result = await onResolve(action)
    if (!result.success && result.state !== 'PENDING') {
      setError(result.error || 'Recovery could not be completed.')
    }
    setWorking(null)
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background p-6">
      <section className="w-full max-w-lg rounded-xl border bg-card p-6 shadow-sm">
        <div className="mb-4 flex items-start gap-3">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
          <div>
            <h1 className="text-lg font-semibold">Unlinked device data found</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              This browser contains older budget data that is not linked to an account.
              It cannot be uploaded automatically because doing so could duplicate or
              overwrite cloud data.
            </p>
          </div>
        </div>

        <div>
          <Button
            onClick={() => void resolve('START_WITH_CLOUD_DATA')}
            disabled={working !== null}
            className="w-full"
          >
            {working === 'START_WITH_CLOUD_DATA' && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            Start with cloud data
          </Button>
        </div>

        <p className="mt-4 text-xs text-muted-foreground">
          Continue with the account&apos;s cloud data. A private recovery snapshot of
          this device&apos;s previous budget will be retained for supervised support.
        </p>
        {error && <p className="mt-3 text-sm text-destructive">{error}</p>}
      </section>
    </main>
  )
}
