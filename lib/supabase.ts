import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '@/types/database'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

// Create a single supabase client for the browser using SSR package
// This ensures cookies are handled correctly for middleware
export const supabase = createBrowserClient<Database>(supabaseUrl, supabaseAnonKey)

// Helper to get current user
export async function getCurrentUser() {
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error) {
    console.error('Error getting user:', error.message)
    return null
  }
  return user
}

// Helper to get current session
export async function getSession() {
  const { data: { session }, error } = await supabase.auth.getSession()
  if (error) {
    console.error('Error getting session:', error.message)
    return null
  }
  return session
}

// Auth helpers
export async function signUp(email: string, password: string, metadata?: { family_name?: string; promo_code_used?: string }) {
  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL ||
    (typeof window !== 'undefined' ? window.location.origin : '')

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: metadata,
      emailRedirectTo: `${appUrl}/auth/callback`,
    },
  })
  return { data, error }
}

export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })
  return { data, error }
}

export async function signOut() {
  const { error } = await supabase.auth.signOut()
  return { error }
}

// Profile helpers
export async function getProfile(userId: string) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()
  return { data, error }
}

export async function updateProfile(
  userId: string,
  updates: Database['public']['Tables']['profiles']['Update'],
) {
  const { data, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', userId)
    .select()

  if (error) return { data: null, error }
  const row = data?.[0] ?? null
  if (!row) {
    return {
      data: null,
      error: { message: 'Profile was not updated. Try signing out and back in.' } as { message: string },
    }
  }
  return { data: row, error: null }
}

// Check if user is admin
export async function isAdmin(userId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', userId)
    .single()
  
  if (error || !data) return false
  return data.is_admin === true
}
