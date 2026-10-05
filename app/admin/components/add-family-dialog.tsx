"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Check, Copy, Loader2, UserPlus } from "lucide-react"
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
import { validateEmail, validatePassword } from "@/lib/utils/validators"

const DEEP_TEAL = "#2F6B66"

/** Coach creates a family login with a temporary password. Spec: coach-editing.md §2.1 */
export function AddFamilyDialog() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [familyName, setFamilyName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [created, setCreated] = useState<{ userId: string; email: string; password: string } | null>(null)
  const [copied, setCopied] = useState(false)

  function reset(next: boolean) {
    if (!next && created) {
      const familyId = created.userId
      setOpen(false)
      setFamilyName("")
      setEmail("")
      setPassword("")
      setError(null)
      setCreated(null)
      setCopied(false)
      router.push(`/admin/families/${familyId}`)
      return
    }
    setOpen(next)
    if (!next) {
      setFamilyName("")
      setEmail("")
      setPassword("")
      setError(null)
      setCreated(null)
      setCopied(false)
    }
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (!familyName.trim()) return setError("Enter a family name.")
    const emailCheck = validateEmail(email)
    if (!emailCheck.valid) return setError(emailCheck.error ?? "Enter a valid email address.")
    const passwordCheck = validatePassword(password)
    if (!passwordCheck.valid) return setError(passwordCheck.error ?? "Enter a password.")

    setSaving(true)
    setError(null)
    try {
      const { data } = await supabase.auth.getSession()
      const token = data.session?.access_token
      if (!token) throw new Error("Your session has expired. Sign in again.")
      const response = await fetch("/api/admin/families", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          family_name: familyName.trim(),
          email: emailCheck.value,
          password: passwordCheck.value,
        }),
      })
      const body = (await response.json().catch(() => null)) as { user_id?: string; error?: string } | null
      if (!response.ok || !body?.user_id) throw new Error(body?.error || "Could not add the family.")
      setCreated({ userId: body.user_id, email: emailCheck.value, password: passwordCheck.value })
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Could not add the family.")
    } finally {
      setSaving(false)
    }
  }

  async function copyCredentials() {
    if (!created) return
    const text = `Email: ${created.email}\nPassword: ${created.password}`
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
    } catch {
      setError("Could not copy. Select the details and copy them yourself.")
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
          {created ? (
            <div className="space-y-4">
              <DialogHeader>
                <DialogTitle>Family login created</DialogTitle>
                <DialogDescription>
                  Copy these now. The password is not shown again. Sign into the family app with them for the first consult.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-2 rounded-md border bg-muted/40 p-3 text-sm">
                <p>
                  <span className="text-muted-foreground">Email: </span>
                  <span className="font-medium">{created.email}</span>
                </p>
                <p>
                  <span className="text-muted-foreground">Password: </span>
                  <span className="font-medium">{created.password}</span>
                </p>
              </div>
              {error ? <p className="text-sm text-destructive">{error}</p> : null}
              <DialogFooter>
                <Button type="button" variant="outline" className="gap-2" onClick={() => void copyCredentials()}>
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  {copied ? "Copied" : "Copy"}
                </Button>
                <Button
                  type="button"
                  className="gap-2"
                  style={{ backgroundColor: DEEP_TEAL }}
                  onClick={() => reset(false)}
                >
                  Open family
                </Button>
              </DialogFooter>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <DialogHeader>
                <DialogTitle>Add a family</DialogTitle>
                <DialogDescription>
                  Create a login with a temporary password. Sign into the family app as them for the first consult. No email is sent yet.
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
              <div className="space-y-2">
                <Label htmlFor="add-family-password">Temporary password</Label>
                <Input
                  id="add-family-password"
                  type="text"
                  autoComplete="new-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                />
              </div>
              {error ? <p className="text-sm text-destructive">{error}</p> : null}
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => reset(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={saving} className="gap-2" style={{ backgroundColor: DEEP_TEAL }}>
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  Create login
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
