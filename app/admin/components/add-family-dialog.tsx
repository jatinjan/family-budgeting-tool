"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Loader2, UserPlus } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { supabase } from "@/lib/supabase"
import { validateEmail } from "@/lib/utils/validators"

const DEEP_TEAL = "#2F6B66"

/** Coach creates a family login, then lands in the budget editor to fill it in. */
export function AddFamilyDialog() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [familyName, setFamilyName] = useState("")
  const [email, setEmail] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  function reset(next: boolean) {
    setOpen(next)
    if (!next) {
      setFamilyName("")
      setEmail("")
      setError(null)
    }
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (!familyName.trim()) return setError("Enter a family name.")
    const emailCheck = validateEmail(email)
    if (!emailCheck.valid) return setError(emailCheck.error ?? "Enter a valid email address.")

    setSaving(true)
    setError(null)
    try {
      const { data } = await supabase.auth.getSession()
      const token = data.session?.access_token
      if (!token) throw new Error("Your session has expired. Sign in again.")
      const response = await fetch("/api/admin/families", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ family_name: familyName.trim(), email: emailCheck.value }),
      })
      const body = (await response.json().catch(() => null)) as { user_id?: string; error?: string } | null
      if (!response.ok || !body?.user_id) throw new Error(body?.error || "Could not add the family.")
      router.push(`/admin/families/${body.user_id}/edit`)
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Could not add the family.")
      setSaving(false)
    }
  }

  return (
    <>
      <Button size="sm" className="gap-1" style={{ backgroundColor: DEEP_TEAL }} onClick={() => setOpen(true)}>
        <UserPlus className="h-4 w-4" />
        Add family
      </Button>
      <Dialog open={open} onOpenChange={reset}>
        <DialogContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <DialogHeader>
              <DialogTitle>Add a family</DialogTitle>
              <DialogDescription>
                Set up their budget for them. No email is sent until you choose Send invite.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-2">
              <Label htmlFor="add-family-name">Family name</Label>
              <Input
                id="add-family-name"
                value={familyName}
                maxLength={80}
                onChange={(event) => setFamilyName(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="add-family-email">Email they will sign in with</Label>
              <Input
                id="add-family-email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </div>
            {error ? <p className="text-sm text-destructive">{error}</p> : null}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => reset(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving} className="gap-2" style={{ backgroundColor: DEEP_TEAL }}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Create and start editing
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
