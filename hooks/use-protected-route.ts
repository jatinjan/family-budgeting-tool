"use client"

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'

type RequiredRole = 'admin' | undefined

interface UseProtectedRouteOptions {
  requiredRole?: RequiredRole
  redirectTo?: string
}

interface UseProtectedRouteReturn {
  isAuthorized: boolean
  isLoading: boolean
}

export function useProtectedRoute(options: UseProtectedRouteOptions = {}): UseProtectedRouteReturn {
  const { requiredRole, redirectTo } = options
  const router = useRouter()
  const pathname = usePathname()
  const { user, profile, loading, isAdmin } = useAuth()
  const [isChecking, setIsChecking] = useState(true)

  useEffect(() => {
    if (loading) {
      return
    }

    setIsChecking(true)

    if (!user) {
      const loginUrl = redirectTo || `/login?redirect=${encodeURIComponent(pathname)}`
      router.replace(loginUrl)
      setIsChecking(false)
      return
    }

    if (requiredRole === 'admin' && !isAdmin) {
      router.replace('/dashboard')
      setIsChecking(false)
      return
    }

    setIsChecking(false)
  }, [user, profile, loading, router, pathname, requiredRole, isAdmin, redirectTo])

  const isAuthorized = !loading && !!user && (requiredRole !== 'admin' || isAdmin)

  return {
    isAuthorized,
    isLoading: loading || isChecking,
  }
}

export function useRequireAuth() {
  return useProtectedRoute()
}

export function useRequireAdmin() {
  return useProtectedRoute({ requiredRole: 'admin' })
}

export function useRedirectIfAuthenticated(redirectTo = '/dashboard') {
  const router = useRouter()
  const { user, loading } = useAuth()

  useEffect(() => {
    if (!loading && user) {
      router.replace(redirectTo)
    }
  }, [user, loading, router, redirectTo])

  return { isLoading: loading }
}
