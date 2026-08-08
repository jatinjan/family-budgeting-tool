"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { UsersTab } from "./components/users-tab"
import { PromoCodesTab } from "./components/promo-codes-tab"
import { ActivityTab } from "./components/activity-tab"
import { SubscriptionsTab } from "./components/subscriptions-tab"
import { supabase } from "@/lib/supabase"
import { Heart, Users, Ticket, ScrollText, CreditCard, LogOut, Loader2 } from "lucide-react"

const BRAND = {
  teal: "#63A8A3",
  deepTeal: "#2F6B66",
  sand: "#EBC79A",
  charcoal: "#4A4A4A",
}

export default function AdminDashboardPage() {
  const router = useRouter()
  const [adminEmail, setAdminEmail] = useState<string | null>(null)
  const [loggingOut, setLoggingOut] = useState(false)

  useEffect(() => {
    async function loadUser() {
      const { data: { user } } = await supabase.auth.getUser()
      setAdminEmail(user?.email || null)
    }
    loadUser()
  }, [])

  async function handleLogout() {
    setLoggingOut(true)
    try {
      await supabase.auth.signOut()
      router.push("/admin/login")
    } catch (err) {
      console.error('Logout error:', err)
    } finally {
      setLoggingOut(false)
    }
  }

  return (
    <div 
      className="min-h-screen"
      style={{ 
        background: `linear-gradient(180deg, ${BRAND.teal}08 0%, ${BRAND.sand}0a 100%)` 
      }}
    >
      <div className="mx-auto max-w-6xl px-4 py-8">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 rounded-lg bg-white p-1.5 shadow-sm">
              <div 
                className="flex h-8 w-8 items-center justify-center rounded-md"
                style={{ backgroundColor: BRAND.deepTeal }}
              >
                <Heart className="h-4 w-4 text-white fill-white" />
              </div>
            </div>
            <div className="flex items-baseline gap-1.5">
              <span 
                className="font-[Nunito] text-xl font-semibold"
                style={{ color: BRAND.teal }}
              >
                My Balanced
              </span>
              <span 
                className="font-[Nunito] text-xl font-medium"
                style={{ color: BRAND.charcoal }}
              >
                Admin
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Badge 
              className="border-transparent text-xs font-medium"
              style={{ 
                backgroundColor: `${BRAND.sand}40`,
                color: "#8a6837"
              }}
            >
              Admin
            </Badge>
            {adminEmail && (
              <span 
                className="hidden text-sm sm:inline"
                style={{ color: BRAND.charcoal }}
              >
                {adminEmail}
              </span>
            )}
            <Button 
              variant="outline" 
              size="sm" 
              className="gap-2 border-gray-200 hover:bg-gray-50"
              style={{ color: BRAND.charcoal }}
              onClick={handleLogout}
              disabled={loggingOut}
            >
              {loggingOut ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <LogOut className="h-4 w-4" />
              )}
              Sign out
            </Button>
          </div>
        </div>

        <h1 
          className="mb-6 font-[Nunito] text-2xl font-semibold"
          style={{ color: BRAND.deepTeal }}
        >
          Dashboard
        </h1>

        <Tabs defaultValue="users" className="w-full space-y-6">
          <TabsList className="mb-4 grid h-auto w-full grid-cols-2 gap-1 bg-white/80 p-1 shadow-sm sm:grid-cols-4">
            <TabsTrigger 
              value="users" 
              className="gap-2 py-2.5 data-[state=active]:shadow-sm"
            >
              <Users className="h-4 w-4" />
              Users
            </TabsTrigger>
            <TabsTrigger value="promos" className="gap-2 py-2.5 data-[state=active]:shadow-sm">
              <Ticket className="h-4 w-4" />
              Promo Codes
            </TabsTrigger>
            <TabsTrigger value="activity" className="gap-2 py-2.5 data-[state=active]:shadow-sm">
              <ScrollText className="h-4 w-4" />
              Activity Log
            </TabsTrigger>
            <TabsTrigger value="subscriptions" className="gap-2 py-2.5 data-[state=active]:shadow-sm">
              <CreditCard className="h-4 w-4" />
              Overview
            </TabsTrigger>
          </TabsList>

          <TabsContent value="users">
            <UsersTab />
          </TabsContent>
          <TabsContent value="promos">
            <PromoCodesTab />
          </TabsContent>
          <TabsContent value="activity">
            <ActivityTab />
          </TabsContent>
          <TabsContent value="subscriptions">
            <SubscriptionsTab />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
