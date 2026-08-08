import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

const PUBLIC_ROUTES = ['/', '/signup', '/login', '/admin/login', '/auth/callback']

const PROTECTED_ROUTES = [
  '/household',
  '/children',
  '/adults',
  '/dashboard',
  '/categories',
  '/adult-categories',
  '/household-categories',
  '/planning',
  '/summary',
]

const ADMIN_ROUTES_PREFIX = '/admin'

function isPublicRoute(path: string): boolean {
  return PUBLIC_ROUTES.includes(path)
}

function isAdminRoute(path: string): boolean {
  return path.startsWith(ADMIN_ROUTES_PREFIX) && path !== '/admin/login'
}

function isProtectedRoute(path: string): boolean {
  return PROTECTED_ROUTES.some(route => path.startsWith(route))
}

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // IMPORTANT: Use getUser() instead of getSession() for security
  // getUser() validates the JWT with Supabase servers
  const { data: { user }, error } = await supabase.auth.getUser()

  const path = request.nextUrl.pathname

  // Allow public routes without auth
  if (isPublicRoute(path)) {
    // If user is logged in and visiting login pages, redirect appropriately
    if (user && path === '/login') {
      return NextResponse.redirect(new URL('/household', request.url))
    }
    if (user && path === '/admin/login') {
      // Check if admin
      const { data: profile } = await supabase
        .from('profiles')
        .select('is_admin')
        .eq('id', user.id)
        .single()

      if (profile?.is_admin) {
        return NextResponse.redirect(new URL('/admin', request.url))
      }
    }
    return supabaseResponse
  }

  // No user and trying to access protected route
  if (!user && (isProtectedRoute(path) || isAdminRoute(path))) {
    const redirectUrl = new URL('/login', request.url)
    redirectUrl.searchParams.set('redirect', path)
    return NextResponse.redirect(redirectUrl)
  }

  // User exists, check admin routes
  if (user && isAdminRoute(path)) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single()

    if (!profile?.is_admin) {
      return NextResponse.redirect(new URL('/household', request.url))
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\..*|api).*)',
  ],
}
