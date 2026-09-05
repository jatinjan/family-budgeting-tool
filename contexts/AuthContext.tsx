"use client"

import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { User, Session } from '@supabase/supabase-js'
import { supabase, getProfile, signIn as supabaseSignIn, signUp as supabaseSignUp, signOut as supabaseSignOut } from '@/lib/supabase'
import type { Profile } from '@/types/database'

interface AuthContextType {
  user: User | null
  profile: Profile | null
  session: Session | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>
  signUp: (email: string, password: string, metadata?: { family_name?: string; promo_code_used?: string }) => Promise<{ error: Error | null; needsEmailConfirmation?: boolean }>
  signOut: () => Promise<{ error: Error | null }>
  refreshProfile: () => Promise<void>
  isAdmin: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchProfile = useCallback(async (userId: string) => {
    const { data, error } = await getProfile(userId)
    if (error) {
      console.error('Error fetching profile:', error.message)
      return null
    }
    return data
  }, [])

  const refreshProfile = useCallback(async () => {
    if (user) {
      const profileData = await fetchProfile(user.id)
      if (profileData) setProfile(profileData)
    }
  }, [user, fetchProfile])

  useEffect(() => {
    // Get initial session
    const initializeAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        setSession(session)
        setUser(session?.user ?? null)
        
        if (session?.user) {
          const profileData = await fetchProfile(session.user.id)
          if (profileData) setProfile(profileData)
        }
      } catch (error) {
        console.error('Error initializing auth:', error)
      } finally {
        setLoading(false)
      }
    }

    initializeAuth()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state changed:', event)
      setSession(session)
      setUser(session?.user ?? null)
      
      if (session?.user) {
        setProfile((prev) => (prev?.id === session.user.id ? prev : null))
        const profileData = await fetchProfile(session.user.id)
        if (profileData) setProfile(profileData)
      } else {
        setProfile(null)
      }
      
      setLoading(false)
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [fetchProfile])

  const signIn = async (email: string, password: string) => {
    const { error } = await supabaseSignIn(email, password)
    return { error: error ? new Error(error.message) : null }
  }

  const signUp = async (email: string, password: string, metadata?: { family_name?: string; promo_code_used?: string }) => {
    const { data, error } = await supabaseSignUp(email, password, metadata)
    
    if (error) {
      return { error: new Error(error.message) }
    }
    
    // Check if email confirmation is required
    const needsEmailConfirmation = Boolean(data.user && !data.session)
    return { error: null, needsEmailConfirmation }
  }

  const signOut = async () => {
    setLoading(true)
    const { error } = await supabaseSignOut()
    if (!error) {
      setUser(null)
      setProfile(null)
      setSession(null)
    }
    setLoading(false)
    return { error: error ? new Error(error.message) : null }
  }

  const isAdmin = profile?.is_admin ?? false

  return (
    <AuthContext.Provider value={{
      user,
      profile,
      session,
      loading,
      signIn,
      signUp,
      signOut,
      refreshProfile,
      isAdmin,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
