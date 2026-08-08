"use client"

import type React from "react"
import { useState, useEffect, useCallback } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Skeleton } from "@/components/ui/skeleton"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { supabase } from "@/lib/supabase"
import { formatDateShort } from "@/lib/utils/formatters"
import type { PromoCode } from "@/types/database"
import { Plus, Pencil, TimerOff, RefreshCw, Loader2 } from "lucide-react"

const BRAND = {
  teal: "#63A8A3",
  deepTeal: "#2F6B66",
  sand: "#EBC79A",
  charcoal: "#4A4A4A",
}

interface PromoFormState {
  code: string
  description: string
  maxRedemptions: string
  expiresAt: string
}

const EMPTY_FORM: PromoFormState = {
  code: "",
  description: "",
  maxRedemptions: "",
  expiresAt: "",
}

export function PromoCodesTab() {
  const [codes, setCodes] = useState<PromoCode[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingCode, setEditingCode] = useState<PromoCode | null>(null)
  const [expiringCode, setExpiringCode] = useState<PromoCode | null>(null)
  const [form, setForm] = useState<PromoFormState>(EMPTY_FORM)
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const fetchCodes = useCallback(async () => {
    try {
      const { data, error: fetchError } = await supabase
        .from('promo_codes')
        .select('*')
        .order('created_at', { ascending: false })

      if (fetchError) throw fetchError

      setCodes(data || [])
      setError(null)
    } catch (err) {
      console.error('Error fetching promo codes:', err)
      setError('Failed to load promo codes')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchCodes()
  }, [fetchCodes])

  function openCreateDialog() {
    setEditingCode(null)
    setForm(EMPTY_FORM)
    setFormError(null)
    setIsDialogOpen(true)
  }

  function openEditDialog(promo: PromoCode) {
    setEditingCode(promo)
    setForm({
      code: promo.code,
      description: promo.description || '',
      maxRedemptions: promo.max_redemptions?.toString() || '',
      expiresAt: promo.expires_at ? promo.expires_at.split('T')[0] : '',
    })
    setFormError(null)
    setIsDialogOpen(true)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.code.trim()) {
      setFormError('Code is required')
      return
    }

    setSubmitting(true)
    setFormError(null)

    try {
      const maxRedemptions = form.maxRedemptions ? parseInt(form.maxRedemptions) : null
      const expiresAt = form.expiresAt ? new Date(form.expiresAt).toISOString() : null

      if (editingCode) {
        const { error: updateError } = await supabase
          .from('promo_codes')
          .update({
            code: form.code.toUpperCase(),
            description: form.description || null,
            max_redemptions: maxRedemptions,
            expires_at: expiresAt,
          })
          .eq('id', editingCode.id)

        if (updateError) throw updateError
      } else {
        const { error: insertError } = await supabase
          .from('promo_codes')
          .insert({
            code: form.code.toUpperCase(),
            description: form.description || null,
            max_redemptions: maxRedemptions,
            expires_at: expiresAt,
            status: 'active',
          })

        if (insertError) {
          if (insertError.code === '23505') {
            setFormError('This code already exists')
            return
          }
          throw insertError
        }
      }

      setIsDialogOpen(false)
      fetchCodes()
    } catch (err) {
      console.error('Error saving promo code:', err)
      setFormError('Failed to save promo code')
    } finally {
      setSubmitting(false)
    }
  }

  async function confirmExpire() {
    if (!expiringCode) return

    try {
      const { error: updateError } = await supabase
        .from('promo_codes')
        .update({ status: 'expired' })
        .eq('id', expiringCode.id)

      if (updateError) throw updateError

      setExpiringCode(null)
      fetchCodes()
    } catch (err) {
      console.error('Error expiring promo code:', err)
    }
  }

  if (loading) {
    return (
      <Card className="border-gray-200 shadow-sm">
        <CardHeader>
          <CardTitle className="font-[Nunito] font-semibold" style={{ color: BRAND.deepTeal }}>
            Promo codes
          </CardTitle>
          <CardDescription>Loading...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className="border-gray-200 shadow-sm">
        <CardHeader>
          <CardTitle className="font-[Nunito] font-semibold" style={{ color: BRAND.deepTeal }}>
            Promo codes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <p className="text-red-600 mb-4">{error}</p>
            <Button onClick={fetchCodes} variant="outline">
              <RefreshCw className="h-4 w-4 mr-2" />
              Try again
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-gray-200 shadow-sm">
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <CardTitle className="font-[Nunito] font-semibold" style={{ color: BRAND.deepTeal }}>
            Promo codes
          </CardTitle>
          <CardDescription>
            {codes.length} promo {codes.length === 1 ? 'code' : 'codes'}
          </CardDescription>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={fetchCodes}>
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button
            onClick={openCreateDialog}
            className="gap-2 self-start text-white"
            style={{ backgroundColor: BRAND.deepTeal }}
          >
            <Plus className="h-4 w-4" />
            Create code
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {codes.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No promo codes yet. Create one to get started.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead style={{ color: BRAND.charcoal }}>Code</TableHead>
                <TableHead style={{ color: BRAND.charcoal }}>Description</TableHead>
                <TableHead style={{ color: BRAND.charcoal }}>Redemptions</TableHead>
                <TableHead style={{ color: BRAND.charcoal }}>Status</TableHead>
                <TableHead style={{ color: BRAND.charcoal }}>Expires</TableHead>
                <TableHead className="text-right" style={{ color: BRAND.charcoal }}>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {codes.map((promo) => (
                <TableRow key={promo.id} className="hover:bg-gray-50/50">
                  <TableCell className="font-mono font-semibold" style={{ color: BRAND.deepTeal }}>
                    {promo.code}
                  </TableCell>
                  <TableCell className="text-gray-600 max-w-[200px] truncate">
                    {promo.description || '—'}
                  </TableCell>
                  <TableCell>
                    <span className="font-medium" style={{ color: BRAND.charcoal }}>
                      {promo.redemptions}
                    </span>
                    {promo.max_redemptions && (
                      <span className="text-gray-400"> / {promo.max_redemptions}</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {promo.status === "active" ? (
                      <Badge
                        className="border-transparent"
                        style={{ backgroundColor: `${BRAND.teal}26`, color: BRAND.deepTeal }}
                      >
                        Active
                      </Badge>
                    ) : (
                      <Badge className="border-transparent bg-gray-100 text-gray-600">
                        Expired
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-gray-500">
                    {promo.expires_at ? formatDateShort(promo.expires_at) : 'Never'}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="hover:bg-gray-100"
                        onClick={() => openEditDialog(promo)}
                      >
                        <Pencil className="h-4 w-4" style={{ color: BRAND.charcoal }} />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="hover:bg-gray-100"
                        disabled={promo.status === "expired"}
                        onClick={() => setExpiringCode(promo)}
                      >
                        <TimerOff className="h-4 w-4 text-gray-400" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle style={{ color: BRAND.deepTeal }}>
              {editingCode ? "Edit promo code" : "Create promo code"}
            </DialogTitle>
            <DialogDescription>
              {editingCode ? "Update the details for this code" : "Set up a new promo code for signups"}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="promo-code" style={{ color: BRAND.charcoal }}>Code *</Label>
              <Input
                id="promo-code"
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                placeholder="e.g., FOUNDING"
                className="font-mono uppercase border-gray-200"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="promo-desc" style={{ color: BRAND.charcoal }}>Description</Label>
              <Textarea
                id="promo-desc"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="e.g., Founding member access"
                className="border-gray-200"
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="promo-max" style={{ color: BRAND.charcoal }}>Max redemptions</Label>
              <Input
                id="promo-max"
                type="number"
                min="1"
                value={form.maxRedemptions}
                onChange={(e) => setForm({ ...form, maxRedemptions: e.target.value })}
                placeholder="Leave empty for unlimited"
                className="border-gray-200"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="promo-expiry" style={{ color: BRAND.charcoal }}>Expiry date</Label>
              <Input
                id="promo-expiry"
                type="date"
                value={form.expiresAt}
                onChange={(e) => setForm({ ...form, expiresAt: e.target.value })}
                className="border-gray-200"
              />
            </div>

            {formError && (
              <p className="text-sm text-red-600">{formError}</p>
            )}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                className="border-gray-200"
                onClick={() => setIsDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="text-white"
                style={{ backgroundColor: BRAND.deepTeal }}
                disabled={submitting}
              >
                {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {editingCode ? "Save changes" : "Create code"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!expiringCode} onOpenChange={(open) => !open && setExpiringCode(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle style={{ color: BRAND.deepTeal }}>Expire promo code?</AlertDialogTitle>
            <AlertDialogDescription>
              <span className="font-mono font-semibold" style={{ color: BRAND.charcoal }}>
                {expiringCode?.code}
              </span>{" "}
              will stop working immediately. Users who already redeemed it keep their access.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-gray-200">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmExpire}
              className="bg-gray-600 text-white hover:bg-gray-700"
            >
              Expire code
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  )
}
