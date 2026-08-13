# Protected Routes Specification

**Status:** Ready for implementation  
**Priority:** P0  
**Dependencies:** Auth flow

---

## Overview

This spec defines route protection logic to ensure unauthenticated users cannot access app features and non-admin users cannot access admin features.

---

## 1. Route Categories

### 1.1 Public Routes (No Auth Required)

| Route | Description |
|-------|-------------|
| `/` | Landing page |
| `/signup` | User registration |
| `/login` | User login |
| `/admin/login` | Admin login |

### 1.2 Protected Routes (Auth Required)

| Route | Description | Redirect If Unauth |
|-------|-------------|-------------------|
| `/household` | Household setup | `/login` |
| `/children` | Manage children | `/login` |
| `/adults` | Manage adults | `/login` |
| `/dashboard` | Main dashboard | `/login` |
| `/categories` | Child budget entry | `/login` |
| `/adult-categories` | Adult budget entry | `/login` |
| `/household-categories` | Household budget | `/login` |
| `/planning` | Planning mode | `/login` |
| `/summary` | Budget summary | `/login` |

### 1.3 Admin Routes (Admin Role Required)

| Route | Description | Redirect If Not Admin |
|-------|-------------|----------------------|
| `/admin` | Admin dashboard | `/dashboard` |
| `/admin/families/[id]` | Family briefing | `/dashboard` |
| `/admin/families/[id]/view/*` | Family consultation (read-only) | `/dashboard` |

---

## 2. Protection Implementation

### 2.1 Middleware Approach (Server-Side)

```typescript
// middleware.ts
import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const supabase = createMiddlewareClient({ req, res });
  
  const {
    data: { session },
  } = await supabase.auth.getSession();
  
  const path = req.nextUrl.pathname;
  
  // Public routes - allow all
  if (isPublicRoute(path)) {
    return res;
  }
  
  // No session - redirect to login
  if (!session) {
    const redirectUrl = new URL('/login', req.url);
    redirectUrl.searchParams.set('redirect', path);
    return NextResponse.redirect(redirectUrl);
  }
  
  // Admin routes - check admin role
  if (isAdminRoute(path)) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', session.user.id)
      .single();
    
    if (!profile?.is_admin) {
      return NextResponse.redirect(new URL('/dashboard', req.url));
    }
  }
  
  return res;
}

function isPublicRoute(path: string): boolean {
  const publicRoutes = ['/', '/signup', '/login', '/admin/login'];
  return publicRoutes.includes(path);
}

function isAdminRoute(path: string): boolean {
  return path.startsWith('/admin') && path !== '/admin/login';
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\..*|api).*)',
  ],
};
```

### 2.2 Client-Side Protection (Backup)

```typescript
// hooks/use-protected-route.ts
export function useProtectedRoute(requiredRole?: 'admin') {
  const router = useRouter();
  const pathname = usePathname();
  const { user, profile, loading } = useAuth();
  
  useEffect(() => {
    if (loading) return;
    
    // Not logged in
    if (!user) {
      router.replace(`/login?redirect=${encodeURIComponent(pathname)}`);
      return;
    }
    
    // Admin required but not admin
    if (requiredRole === 'admin' && !profile?.is_admin) {
      router.replace('/dashboard');
      return;
    }
  }, [user, profile, loading, router, pathname, requiredRole]);
  
  return { isAuthorized: !!user && (requiredRole !== 'admin' || profile?.is_admin) };
}
```

### 2.3 Usage in Pages

```typescript
// app/dashboard/page.tsx
'use client';

export default function DashboardPage() {
  const { isAuthorized } = useProtectedRoute();
  
  if (!isAuthorized) {
    return <LoadingSpinner />; // Show while redirecting
  }
  
  return <Dashboard />;
}
```

```typescript
// app/admin/page.tsx
'use client';

export default function AdminPage() {
  const { isAuthorized } = useProtectedRoute('admin');
  
  if (!isAuthorized) {
    return <LoadingSpinner />;
  }
  
  return <AdminDashboard />;
}
```

---

## 3. Auth-Aware Layout

### 3.1 Layout with Auth Check

```typescript
// app/(app)/layout.tsx
'use client';

import { useAuth } from '@/contexts/AuthContext';
import { redirect } from 'next/navigation';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  
  if (!user) {
    redirect('/login');
  }
  
  return (
    <div className="min-h-screen">
      <BottomNav />
      <main className="pb-20">{children}</main>
    </div>
  );
}
```

### 3.2 Admin Layout

```typescript
// app/admin/layout.tsx
'use client';

import { useAuth } from '@/contexts/AuthContext';
import { redirect } from 'next/navigation';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, isAdmin, loading } = useAuth();
  
  if (loading) {
    return <LoadingSpinner />;
  }
  
  if (!user) {
    redirect('/admin/login');
  }
  
  if (!isAdmin) {
    redirect('/dashboard');
  }
  
  return (
    <div className="min-h-screen bg-gray-50">
      <AdminHeader />
      <main className="p-6">{children}</main>
    </div>
  );
}
```

---

## 4. Redirect After Login

### 4.1 Capture Redirect URL

```typescript
// app/login/page.tsx
export default function LoginPage() {
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get('redirect') || '/dashboard';
  
  async function handleLogin(email: string, password: string) {
    const { error } = await signIn(email, password);
    
    if (!error) {
      router.push(redirectTo);
    }
  }
  
  // ...
}
```

### 4.2 Onboarding Redirect Logic

```typescript
// After successful login, check onboarding status
async function handlePostLogin(user: User) {
  const { data: profile } = await supabase
    .from('profiles')
    .select('onboarding_status')
    .eq('id', user.id)
    .single();
  
  switch (profile?.onboarding_status) {
    case 'signed_up':
      return '/household';
    case 'profile_complete':
      return '/children';
    case 'budget_started':
      return '/dashboard';
    case 'plan_complete':
    default:
      return '/dashboard';
  }
}
```

---

## 5. Loading States

### 5.1 AuthLoading Component

```typescript
// components/auth-loading.tsx
export function AuthLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-teal-50 to-amber-50">
      <div className="text-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#2F6B66] mx-auto mb-4" />
        <p className="text-gray-600">Loading...</p>
      </div>
    </div>
  );
}
```

### 5.2 Skeleton Loading

```typescript
// components/dashboard-skeleton.tsx
export function DashboardSkeleton() {
  return (
    <div className="space-y-4 p-4">
      <Skeleton className="h-8 w-48" />
      <div className="grid grid-cols-3 gap-4">
        <Skeleton className="h-24 rounded-lg" />
        <Skeleton className="h-24 rounded-lg" />
        <Skeleton className="h-24 rounded-lg" />
      </div>
      <Skeleton className="h-64 rounded-lg" />
    </div>
  );
}
```

---

## 6. Error Boundaries

### 6.1 Auth Error Boundary

```typescript
// components/auth-error-boundary.tsx
'use client';

import { Component, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class AuthErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };
  
  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }
  
  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="flex min-h-screen items-center justify-center">
          <Card className="max-w-md">
            <CardHeader>
              <CardTitle>Authentication Error</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 mb-4">
                There was a problem with authentication. Please try signing in again.
              </p>
              <Button onClick={() => window.location.href = '/login'}>
                Go to Login
              </Button>
            </CardContent>
          </Card>
        </div>
      );
    }
    
    return this.props.children;
  }
}
```

---

## 7. Files to Create/Modify

| File | Action | Description |
|------|--------|-------------|
| `middleware.ts` | Create | Server-side route protection |
| `hooks/use-protected-route.ts` | Create | Client-side protection hook |
| `app/(app)/layout.tsx` | Create | Protected app routes layout |
| `app/admin/layout.tsx` | Modify | Admin-only layout |
| `components/auth-loading.tsx` | Create | Loading state component |
| `components/auth-error-boundary.tsx` | Create | Error boundary |

---

## 8. Acceptance Criteria

- [ ] Unauthenticated users redirected from protected routes to `/login`
- [ ] Non-admin users redirected from admin routes to `/dashboard`
- [ ] Redirect URL preserved in query param for post-login redirect
- [ ] Loading state shown while checking auth
- [ ] Auth errors handled gracefully with user-friendly message
- [ ] Deep links work (user goes to /planning → login → redirected back to /planning)
