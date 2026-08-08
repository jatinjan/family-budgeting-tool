"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { supabase } from "@/lib/supabase"
import { formatRelativeTime, formatDateTime } from "@/lib/utils/formatters"
import type { ActivityLog } from "@/types/database"
import {
  LogIn,
  FileEdit,
  Ticket,
  CheckCircle2,
  UserPlus,
  Settings,
  Search,
  RefreshCw,
  LogOut,
} from "lucide-react"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

const BRAND = {
  teal: "#63A8A3",
  deepTeal: "#2F6B66",
  sand: "#EBC79A",
  charcoal: "#4A4A4A",
}

function getEventIcon(eventType: string) {
  switch (eventType) {
    case 'login':
      return <LogIn className="h-4 w-4" style={{ color: BRAND.teal }} />
    case 'logout':
      return <LogOut className="h-4 w-4 text-gray-500" />
    case 'signup':
      return <UserPlus className="h-4 w-4" style={{ color: BRAND.deepTeal }} />
    case 'budget_update':
      return <FileEdit className="h-4 w-4" style={{ color: BRAND.deepTeal }} />
    case 'promo_redemption':
      return <Ticket className="h-4 w-4" style={{ color: "#8a6837" }} />
    case 'payment':
      return <CheckCircle2 className="h-4 w-4 text-emerald-600" />
    default:
      return <Settings className="h-4 w-4" style={{ color: BRAND.charcoal }} />
  }
}

function getEventBadge(eventType: string) {
  switch (eventType) {
    case 'signup':
      return (
        <Badge className="border-transparent bg-green-100 text-green-700 text-xs">
          Signup
        </Badge>
      )
    case 'login':
      return (
        <Badge className="border-transparent bg-blue-100 text-blue-700 text-xs">
          Login
        </Badge>
      )
    case 'logout':
      return (
        <Badge className="border-transparent bg-gray-100 text-gray-600 text-xs">
          Logout
        </Badge>
      )
    case 'budget_update':
      return (
        <Badge className="border-transparent bg-amber-100 text-amber-700 text-xs">
          Budget Update
        </Badge>
      )
    case 'promo_redemption':
      return (
        <Badge
          className="border-transparent text-xs"
          style={{ backgroundColor: `${BRAND.sand}40`, color: "#8a6837" }}
        >
          Promo Redemption
        </Badge>
      )
    default:
      return (
        <Badge className="border-transparent bg-gray-100 text-gray-600 text-xs">
          {eventType}
        </Badge>
      )
  }
}

export function ActivityTab() {
  const [search, setSearch] = useState("")
  const [activity, setActivity] = useState<ActivityLog[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchActivity = useCallback(async () => {
    try {
      let query = supabase
        .from('activity_log')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100)

      if (search.trim()) {
        query = query.or(`family_name.ilike.%${search}%,message.ilike.%${search}%`)
      }

      const { data, error: fetchError } = await query

      if (fetchError) throw fetchError

      setActivity(data || [])
      setError(null)
    } catch (err) {
      console.error('Error fetching activity:', err)
      setError('Failed to load activity')
    } finally {
      setLoading(false)
    }
  }, [search])

  useEffect(() => {
    fetchActivity()
  }, [fetchActivity])

  useEffect(() => {
    const debounce = setTimeout(() => {
      if (!loading) {
        setLoading(true)
        fetchActivity()
      }
    }, 300)

    return () => clearTimeout(debounce)
  }, [search])

  if (loading && activity.length === 0) {
    return (
      <Card className="border-gray-200 shadow-sm">
        <CardHeader>
          <CardTitle className="font-[Nunito] font-semibold" style={{ color: BRAND.deepTeal }}>
            Activity log
          </CardTitle>
          <CardDescription>Loading...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error && activity.length === 0) {
    return (
      <Card className="border-gray-200 shadow-sm">
        <CardHeader>
          <CardTitle className="font-[Nunito] font-semibold" style={{ color: BRAND.deepTeal }}>
            Activity log
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <p className="text-red-600 mb-4">{error}</p>
            <Button onClick={fetchActivity} variant="outline">
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
            Activity log
          </CardTitle>
          <CardDescription>Recent user activity across all families</CardDescription>
        </div>
        <div className="flex gap-2 items-center">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search families or events..."
              className="pl-9 border-gray-200"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Button variant="ghost" size="sm" onClick={fetchActivity}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="divide-y divide-gray-100">
          {activity.length === 0 && (
            <p className="py-8 text-center text-sm text-gray-500">No events found.</p>
          )}
          {activity.map((ev) => (
            <div
              key={ev.id}
              className="flex items-start gap-3 py-3 transition-colors hover:bg-gray-50/50"
            >
              <div
                className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
                style={{ backgroundColor: `${BRAND.teal}15` }}
              >
                {getEventIcon(ev.event_type)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium" style={{ color: BRAND.charcoal }}>
                    {ev.family_name || "System"}
                  </span>
                  {getEventBadge(ev.event_type)}
                </div>
                <p className="text-sm text-gray-600 mt-0.5">{ev.message}</p>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <p className="text-xs text-gray-400 mt-0.5 cursor-help">
                        {formatRelativeTime(ev.created_at)}
                      </p>
                    </TooltipTrigger>
                    <TooltipContent>
                      {formatDateTime(ev.created_at)}
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
