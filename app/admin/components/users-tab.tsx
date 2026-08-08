"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Skeleton } from "@/components/ui/skeleton"
import { supabase } from "@/lib/supabase"
import { formatRelativeTime } from "@/lib/utils/formatters"
import type { Profile } from "@/types/database"
import { ChevronRight, Loader2, RefreshCw, Star } from "lucide-react"

const BRAND = {
  teal: "#63A8A3",
  deepTeal: "#2F6B66",
  sand: "#EBC79A",
  charcoal: "#4A4A4A",
}

type OnboardingStatus = 'signed_up' | 'profile_complete' | 'budget_started' | 'plan_complete'

const ONBOARDING_LABELS: Record<OnboardingStatus, string> = {
  signed_up: 'Just Registered',
  profile_complete: 'Profile Complete',
  budget_started: 'Budget In Progress',
  plan_complete: 'Plan Complete',
}

function onboardingBadge(status: OnboardingStatus) {
  const label = ONBOARDING_LABELS[status] || status

  switch (status) {
    case "plan_complete":
      return (
        <Badge
          className="border-transparent text-xs"
          style={{ backgroundColor: `${BRAND.teal}20`, color: BRAND.deepTeal }}
        >
          {label}
        </Badge>
      )
    case "budget_started":
      return (
        <Badge className="border-transparent bg-amber-100 text-amber-700 text-xs">
          {label}
        </Badge>
      )
    case "profile_complete":
      return (
        <Badge className="border-transparent bg-sky-100 text-sky-700 text-xs">
          {label}
        </Badge>
      )
    case "signed_up":
    default:
      return (
        <Badge className="border-transparent bg-gray-100 text-gray-600 text-xs">
          {label}
        </Badge>
      )
  }
}

export function UsersTab() {
  const router = useRouter()
  const [users, setUsers] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchUsers = useCallback(async () => {
    try {
      const { data, error: fetchError } = await supabase
        .from('profiles')
        .select('*')
        .order('signed_up_at', { ascending: false })

      if (fetchError) throw fetchError

      setUsers(data || [])
      setError(null)
    } catch (err) {
      console.error('Error fetching users:', err)
      setError('Failed to load users')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchUsers()
  }, [fetchUsers])

  function handleRowClick(userId: string) {
    router.push(`/admin/families/${userId}`)
  }

  if (loading) {
    return (
      <Card className="border-gray-200 shadow-sm">
        <CardHeader>
          <CardTitle className="font-[Nunito] font-semibold" style={{ color: BRAND.deepTeal }}>
            Families
          </CardTitle>
          <CardDescription>Loading...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
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
            Families
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <p className="text-red-600 mb-4">{error}</p>
            <Button onClick={fetchUsers} variant="outline">
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
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="font-[Nunito] font-semibold" style={{ color: BRAND.deepTeal }}>
            Families
          </CardTitle>
          <CardDescription>
            {users.length} registered {users.length === 1 ? 'family' : 'families'}. Click a row to view details.
          </CardDescription>
        </div>
        <Button variant="ghost" size="sm" onClick={fetchUsers}>
          <RefreshCw className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent>
        {users.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No families registered yet.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead style={{ color: BRAND.charcoal }}>Family</TableHead>
                <TableHead style={{ color: BRAND.charcoal }}>Email</TableHead>
                <TableHead style={{ color: BRAND.charcoal }}>Promo Code</TableHead>
                <TableHead style={{ color: BRAND.charcoal }}>Progress</TableHead>
                <TableHead style={{ color: BRAND.charcoal }}>Signed up</TableHead>
                <TableHead style={{ color: BRAND.charcoal }}>Last active</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow
                  key={user.id}
                  className="cursor-pointer hover:bg-[#63A8A3]/5"
                  onClick={() => handleRowClick(user.id)}
                >
                  <TableCell className="font-medium" style={{ color: BRAND.charcoal }}>
                    <div className="flex items-center gap-2">
                      {user.family_name || 'Unnamed Family'}
                      <ChevronRight className="h-4 w-4 text-gray-400" />
                    </div>
                  </TableCell>
                  <TableCell className="text-gray-500">{user.email}</TableCell>
                  <TableCell>
                    {user.promo_code_used ? (
                      <Badge
                        className="gap-1 border-transparent font-mono"
                        style={{ backgroundColor: `${BRAND.sand}40`, color: "#8a6837" }}
                      >
                        <Star className="h-3 w-3" />
                        {user.promo_code_used}
                      </Badge>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {onboardingBadge(user.onboarding_status as OnboardingStatus)}
                  </TableCell>
                  <TableCell className="text-gray-500">
                    {formatRelativeTime(user.signed_up_at)}
                  </TableCell>
                  <TableCell className="text-gray-500">
                    {formatRelativeTime(user.last_active_at)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  )
}
