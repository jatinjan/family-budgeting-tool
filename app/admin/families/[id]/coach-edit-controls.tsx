"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Hand, Loader2, Mail, Pencil, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { toast } from "@/hooks/use-toast"
import { useCoachLease } from "@/hooks/use-coach-lease"
import { supabase } from "@/lib/supabase"
import type { Profile } from "@/types/database"

const DEEP_TEAL = "#2F6B66"

function minutesUntil(iso: string | null | undefined, now: number): number {
  if (!iso) return 0
  return Math.max(0, Math.ceil((Date.parse(iso) - now) / 60_000))
}

export async function sendFamilyInvite(familyId: string): Promise<void> {
  const { data } = await supabase.auth.getSession()
  const token = data.session?.access_token
  if (!token) throw new Error("Your session has expired. Sign in again.")
  const response = await fetch(`/api/admin/families/${familyId}/invite`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { error?: string } | null
    throw new Error(body?.error || "Could not send the invite.")
  }
}

/** Lease-aware actions for a family: set up, ask to help, cancel, finish, invite. */
export function CoachEditControls({ familyId, profile }: { familyId: string; profile: Profile }) {
  const router = useRouter()
  const lease = useCoachLease(familyId)
  const [inviting, setInviting] = useState(false)
  // Only coach-created families have claimed_at = null; undefined means the column is not migrated yet.
  const claimed = profile.claimed_at !== null
  const openEditor = () => router.push(`/admin/families/${familyId}/edit`)

  async function handleInvite() {
    setInviting(true)
    try {
      await sendFamilyInvite(familyId)
      toast({ title: "Invite sent", description: `${profile.email} will get a link to set a password.` })
    } catch (error) {
      toast({
        title: "Invite not sent",
        description: error instanceof Error ? error.message : "Something went wrong.",
        variant: "destructive",
      })
    } finally {
      setInviting(false)
    }
  }

  if (lease.loading) return null

  const busyIcon = lease.busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null
  const errorLine = lease.error ? <p className="text-xs text-destructive sm:text-right">{lease.error}</p> : null

  if (lease.heldByOther) {
    return <p className="text-sm text-amber-700 sm:text-right">Another coach is working with this family.</p>
  }

  if (lease.state === "requested") {
    return (
      <div className="flex flex-col items-start gap-1 sm:items-end">
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600">
            Waiting for the family to accept · {minutesUntil(lease.lease?.request_expires_at, lease.now)} min
          </span>
          <Button variant="outline" size="sm" className="gap-1" disabled={lease.busy} onClick={() => void lease.end()}>
            {busyIcon ?? <X className="h-4 w-4" />}
            Cancel
          </Button>
        </div>
        {errorLine}
      </div>
    )
  }

  if (lease.canEdit) {
    return (
      <div className="flex flex-col items-start gap-1 sm:items-end">
        <div className="flex flex-wrap items-center gap-2">
          <Button onClick={openEditor} variant="outline" className="gap-2" style={{ borderColor: DEEP_TEAL, color: DEEP_TEAL }}>
            <Pencil className="h-4 w-4" />
            Edit budget
          </Button>
          <Button variant="ghost" size="sm" disabled={lease.busy} onClick={() => void lease.end()} className="gap-1">
            {busyIcon}
            Done
          </Button>
        </div>
        <p className="text-xs text-gray-500">
          {lease.lease?.mode === "assist"
            ? `Family's app is view-only · ${minutesUntil(lease.lease?.expires_at, lease.now)} min left`
            : "Setting up · the family has not signed in yet"}
        </p>
        {!claimed ? (
          <Button variant="link" size="sm" className="h-auto gap-1 p-0" disabled={inviting} onClick={handleInvite}>
            {inviting ? <Loader2 className="h-3 w-3 animate-spin" /> : <Mail className="h-3 w-3" />}
            Send invite email
          </Button>
        ) : null}
        {errorLine}
      </div>
    )
  }

  if (!claimed) {
    return (
      <div className="flex flex-col items-start gap-1 sm:items-end">
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            className="gap-2"
            disabled={lease.busy}
            style={{ borderColor: DEEP_TEAL, color: DEEP_TEAL }}
            onClick={async () => {
              if (await lease.startSetup()) openEditor()
            }}
          >
            {busyIcon ?? <Pencil className="h-4 w-4" />}
            Edit budget
          </Button>
          <Button variant="ghost" size="sm" className="gap-1" disabled={inviting} onClick={handleInvite}>
            {inviting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
            Send invite
          </Button>
        </div>
        <p className="text-xs text-gray-500">Not signed in yet</p>
        {errorLine}
      </div>
    )
  }

  return (
    <div className="flex flex-col items-start gap-1 sm:items-end">
      <Button
        variant="outline"
        className="gap-2"
        disabled={lease.busy}
        style={{ borderColor: DEEP_TEAL, color: DEEP_TEAL }}
        onClick={() => void lease.requestAssist()}
      >
        {busyIcon ?? <Hand className="h-4 w-4" />}
        Ask to help edit
      </Button>
      <p className="text-xs text-gray-500">The family accepts on their app, then their budget pauses for you.</p>
      {errorLine}
    </div>
  )
}
