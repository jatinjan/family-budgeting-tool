import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import type { Database } from '@/types/database'

export interface AuthUser {
  id: string
  email: string
  isAdmin: boolean
}

export interface AuthResult {
  user: AuthUser | null
  error: string | null
}

export interface AuthGuardOptions {
  requireAdmin?: boolean
}

/**
 * Creates a Supabase server client for use in API routes and server actions.
 * This client has access to the user's session via cookies.
 */
export async function createServerSupabaseClient() {
  const cookieStore = await cookies()
  
  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing sessions.
          }
        },
      },
    }
  )
}

/**
 * Validates the current user's authentication status.
 * Returns the user if authenticated, or null if not.
 * 
 * IMPORTANT: Uses getUser() which validates the JWT with Supabase servers,
 * rather than getSession() which only validates locally.
 */
export async function getCurrentUser(): Promise<AuthResult> {
  try {
    const supabase = await createServerSupabaseClient()
    
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return { user: null, error: 'Not authenticated' }
    }
    
    // Fetch the profile to get admin status
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single()
    
    if (profileError) {
      console.error('Error fetching profile:', profileError.message)
      return { 
        user: {
          id: user.id,
          email: user.email || '',
          isAdmin: false,
        },
        error: null 
      }
    }
    
    return {
      user: {
        id: user.id,
        email: user.email || '',
        isAdmin: profile?.is_admin === true,
      },
      error: null,
    }
  } catch (error) {
    console.error('Auth guard error:', error)
    return { user: null, error: 'Authentication error' }
  }
}

/**
 * Requires authentication for an API route or server action.
 * Returns the authenticated user or a 401 response.
 * 
 * Usage in API routes:
 * ```
 * export async function GET() {
 *   const auth = await requireAuth()
 *   if (auth.response) return auth.response
 *   
 *   // auth.user is guaranteed to exist here
 *   const { user } = auth
 *   // ... handle request
 * }
 * ```
 */
export async function requireAuth(options: AuthGuardOptions = {}): Promise<{
  user: AuthUser | null
  response: NextResponse | null
}> {
  const { user, error } = await getCurrentUser()
  
  if (!user) {
    return {
      user: null,
      response: NextResponse.json(
        { error: error || 'Unauthorized', code: 'UNAUTHORIZED' },
        { status: 401 }
      ),
    }
  }
  
  if (options.requireAdmin && !user.isAdmin) {
    return {
      user: null,
      response: NextResponse.json(
        { error: 'Admin access required', code: 'FORBIDDEN' },
        { status: 403 }
      ),
    }
  }
  
  return { user, response: null }
}

/**
 * Requires admin role for an API route or server action.
 * Shorthand for requireAuth({ requireAdmin: true })
 */
export async function requireAdmin() {
  return requireAuth({ requireAdmin: true })
}

/**
 * Validates that the current user owns the specified resource.
 * Use this before accessing or modifying user-specific data.
 * 
 * Usage:
 * ```
 * const auth = await requireAuth()
 * if (auth.response) return auth.response
 * 
 * const ownership = await verifyOwnership(auth.user!.id, resourceUserId)
 * if (ownership.response) return ownership.response
 * ```
 */
export async function verifyOwnership(
  currentUserId: string,
  resourceUserId: string
): Promise<{ allowed: boolean; response: NextResponse | null }> {
  if (currentUserId !== resourceUserId) {
    return {
      allowed: false,
      response: NextResponse.json(
        { error: 'Resource not found', code: 'NOT_FOUND' },
        { status: 404 }
      ),
    }
  }
  
  return { allowed: true, response: null }
}

/**
 * Validates that the current user is either the resource owner OR an admin.
 * Admins get read-only access; actual modification is blocked by RLS policies.
 */
export async function verifyOwnershipOrAdmin(
  currentUser: AuthUser,
  resourceUserId: string
): Promise<{ allowed: boolean; response: NextResponse | null }> {
  // Admins can view any resource (RLS enforces read-only)
  if (currentUser.isAdmin) {
    return { allowed: true, response: null }
  }
  
  // Regular users can only access their own resources
  if (currentUser.id !== resourceUserId) {
    return {
      allowed: false,
      response: NextResponse.json(
        { error: 'Resource not found', code: 'NOT_FOUND' },
        { status: 404 }
      ),
    }
  }
  
  return { allowed: true, response: null }
}

/**
 * Standard error response helpers for consistent API responses.
 */
export const AuthErrors = {
  unauthorized: () => 
    NextResponse.json(
      { error: 'Unauthorized', code: 'UNAUTHORIZED' },
      { status: 401 }
    ),
  
  forbidden: () => 
    NextResponse.json(
      { error: 'Forbidden', code: 'FORBIDDEN' },
      { status: 403 }
    ),
  
  notFound: (resource = 'Resource') => 
    NextResponse.json(
      { error: `${resource} not found`, code: 'NOT_FOUND' },
      { status: 404 }
    ),
  
  validationError: (message: string) => 
    NextResponse.json(
      { error: message, code: 'VALIDATION_ERROR' },
      { status: 422 }
    ),
  
  serverError: (message = 'Internal server error') => 
    NextResponse.json(
      { error: message, code: 'SERVER_ERROR' },
      { status: 500 }
    ),
}
