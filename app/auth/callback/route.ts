import { createServerClient } from '@supabase/ssr'
import { type EmailOtpType } from '@supabase/supabase-js'
import { NextResponse, type NextRequest } from 'next/server'
import type { Database } from '@/types/database'

/**
 * Completes email confirmation (and similar auth links).
 * Supports:
 * - token_hash + type → verifyOtp (recommended for email links / PKCE SSR)
 * - code → exchangeCodeForSession (OAuth / some redirect flows)
 *
 * See docs/specs/auth-flow.md §1.6.3
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const token_hash = searchParams.get('token_hash')
  const type = searchParams.get('type') as EmailOtpType | null
  const next = searchParams.get('next') ?? '/household'
  const safeNext = next.startsWith('/') ? next : '/household'

  const successRedirect = NextResponse.redirect(new URL(safeNext, origin))

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            successRedirect.cookies.set(name, value, options)
          })
        },
      },
    }
  )

  // Preferred path for confirmation emails (works across devices/browsers)
  if (token_hash && type) {
    const { error } = await supabase.auth.verifyOtp({ type, token_hash })
    if (!error) {
      return successRedirect
    }
    console.error('Auth callback verifyOtp failed:', error.message)
    return NextResponse.redirect(
      new URL(
        `/login?error=confirmation_failed&detail=${encodeURIComponent(error.message)}`,
        origin
      )
    )
  }

  // PKCE code exchange (same-browser OAuth / some redirects)
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      return successRedirect
    }
    console.error('Auth callback exchangeCodeForSession failed:', error.message)
    return NextResponse.redirect(
      new URL(
        `/login?error=confirmation_failed&detail=${encodeURIComponent(error.message)}`,
        origin
      )
    )
  }

  return NextResponse.redirect(
    new URL('/login?error=confirmation_failed&detail=missing_token', origin)
  )
}
