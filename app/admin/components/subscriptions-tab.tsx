"use client"

import { useState, useEffect, useCallback } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Skeleton } from "@/components/ui/skeleton"
import { supabase } from "@/lib/supabase"
import { formatRelativeTime } from "@/lib/utils/formatters"
import type { Profile } from "@/types/database"
import { Users, CheckCircle, TrendingUp, Tag, Star, RefreshCw } from "lucide-react"

const BRAND = {
  teal: "#63A8A3",
  deepTeal: "#2F6B66",
  sand: "#EBC79A",
  charcoal: "#4A4A4A",
}

const STAT_STYLES = [
  { bg: `${BRAND.teal}15`, color: BRAND.teal },
  { bg: `${BRAND.sand}26`, color: "#8a6837" },
  { bg: `${BRAND.deepTeal}15`, color: BRAND.deepTeal },
  { bg: `${BRAND.charcoal}12`, color: BRAND.charcoal },
]

const STAT_ICONS = [Users, CheckCircle, TrendingUp, Tag]

interface StatsData {
  totalFamilies: number
  activeThisWeek: number
  completedOnboarding: number
  signupsViaPromo: number
  statusCounts: Record<string, number>
  promoCounts: Record<string, number>
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

export function SubscriptionsTab() {
  const [users, setUsers] = useState<Profile[]>([])
  const [stats, setStats] = useState<StatsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    try {
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .order('signed_up_at', { ascending: false })

      if (profilesError) throw profilesError

      const allProfiles = profiles || []
      setUsers(allProfiles)

      const sevenDaysAgo = new Date()
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

      const statusCounts: Record<string, number> = {}
      const promoCounts: Record<string, number> = {}
      let activeThisWeek = 0
      let completedOnboarding = 0
      let signupsViaPromo = 0

      for (const profile of allProfiles) {
        statusCounts[profile.onboarding_status] = (statusCounts[profile.onboarding_status] || 0) + 1

        if (new Date(profile.last_active_at) >= sevenDaysAgo) {
          activeThisWeek++
        }

        if (profile.onboarding_status === 'plan_complete') {
          completedOnboarding++
        }

        if (profile.promo_code_used) {
          signupsViaPromo++
          promoCounts[profile.promo_code_used] = (promoCounts[profile.promo_code_used] || 0) + 1
        }
      }

      setStats({
        totalFamilies: allProfiles.length,
        activeThisWeek,
        completedOnboarding,
        signupsViaPromo,
        statusCounts,
        promoCounts,
      })

      setError(null)
    } catch (err) {
      console.error('Error fetching stats:', err)
      setError('Failed to load statistics')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="border-gray-200 shadow-sm">
              <CardContent className="p-4">
                <Skeleton className="h-16 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
        <Card className="border-gray-200 shadow-sm">
          <CardContent className="p-6">
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (error) {
    return (
      <Card className="border-gray-200 shadow-sm">
        <CardContent className="py-8 text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <Button onClick={fetchData} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Try again
          </Button>
        </CardContent>
      </Card>
    )
  }

  const statCards = [
    { label: "Total families", value: stats?.totalFamilies.toString() || "0" },
    { label: "Completed onboarding", value: stats?.completedOnboarding.toString() || "0" },
    { label: "Active this week", value: stats?.activeThisWeek.toString() || "0" },
    { label: "Signups via promo", value: stats?.signupsViaPromo.toString() || "0" },
  ]

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold" style={{ color: BRAND.deepTeal }}>
          Overview
        </h2>
        <Button variant="ghost" size="sm" onClick={fetchData}>
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat, i) => {
          const Icon = STAT_ICONS[i]
          const style = STAT_STYLES[i]
          return (
            <Card key={stat.label} className="border-gray-200 shadow-sm">
              <CardContent className="flex items-center gap-4 p-4">
                <div
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg"
                  style={{ backgroundColor: style.bg }}
                >
                  <Icon className="h-5 w-5" style={{ color: style.color }} />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-gray-500 uppercase tracking-wide">{stat.label}</p>
                  <p className="text-xl font-semibold truncate" style={{ color: BRAND.deepTeal }}>
                    {stat.value}
                  </p>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {stats && Object.keys(stats.promoCounts).length > 0 && (
        <Card className="border-gray-200 shadow-sm">
          <CardHeader>
            <CardTitle className="font-[Nunito] font-semibold text-base" style={{ color: BRAND.deepTeal }}>
              Signups by Promo Code
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              {Object.entries(stats.promoCounts)
                .sort(([, a], [, b]) => b - a)
                .map(([code, count]) => (
                  <Badge
                    key={code}
                    className="gap-2 border-transparent py-1.5 px-3 font-mono"
                    style={{ backgroundColor: `${BRAND.sand}30`, color: "#8a6837" }}
                  >
                    <Star className="h-3 w-3" />
                    {code}: {count}
                  </Badge>
                ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="border-gray-200 shadow-sm">
        <CardHeader>
          <CardTitle className="font-[Nunito] font-semibold" style={{ color: BRAND.deepTeal }}>
            All Families
          </CardTitle>
          <CardDescription>
            {users.length} registered {users.length === 1 ? 'family' : 'families'}
          </CardDescription>
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
                  <TableHead style={{ color: BRAND.charcoal }}>Last active</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id} className="hover:bg-gray-50/50">
                    <TableCell className="font-medium" style={{ color: BRAND.charcoal }}>
                      {user.family_name || 'Unnamed Family'}
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
                      {formatRelativeTime(user.last_active_at)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
