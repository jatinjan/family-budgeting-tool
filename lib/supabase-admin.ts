import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

/**
 * Server-only Supabase clients for route handlers. The service-role key
 * bypasses RLS: never import this module from client components.
 */
if (typeof window !== 'undefined') {
  throw new Error('lib/supabase-admin must only be imported on the server')
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

export class RouteError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message)
    this.name = 'RouteError'
  }
}

export function getServiceClient(): SupabaseClient<Database> {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceKey) {
    throw new RouteError(500, 'Server is missing SUPABASE_SERVICE_ROLE_KEY.')
  }
  return createClient<Database>(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

/** A client that acts as the caller, so auth.uid() and RLS apply to their JWT. */
export function getCallerClient(accessToken: string): SupabaseClient<Database> {
  if (!url || !anonKey) throw new RouteError(500, 'Server is missing Supabase settings.')
  return createClient<Database>(url, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
  })
}

export interface AdminCaller {
  userId: string
  accessToken: string
}

export async function requireAdmin(request: Request): Promise<AdminCaller> {
  const header = request.headers.get('authorization') || ''
  const accessToken = header.startsWith('Bearer ') ? header.slice(7) : ''
  if (!accessToken) throw new RouteError(401, 'Sign in again.')

  const service = getServiceClient()
  const { data: userData, error: userError } = await service.auth.getUser(accessToken)
  if (userError || !userData.user) throw new RouteError(401, 'Sign in again.')

  const { data: profile } = await service
    .from('profiles')
    .select('is_admin')
    .eq('id', userData.user.id)
    .maybeSingle()
  if (!profile?.is_admin) throw new RouteError(403, 'Admin access required.')

  return { userId: userData.user.id, accessToken }
}

export function appUrl(request: Request): string {
  return (process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin).replace(/\/$/, '')
}

export function routeErrorResponse(error: unknown): Response {
  if (error instanceof RouteError) {
    return Response.json({ error: error.message }, { status: error.status })
  }
  console.error('Admin route failed', error)
  return Response.json({ error: 'Something went wrong. Try again.' }, { status: 500 })
}
