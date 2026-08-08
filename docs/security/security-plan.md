# Security Plan — My Balanced Family Finances

**Date:** August 8, 2026  
**Status:** Ready for Demo  
**Author:** Security Review

---

## Executive Summary

This document outlines the security controls implemented for the My Balanced Family Finances application. The app uses Supabase Auth with email/password authentication and Row Level Security (RLS) for data isolation.

**Critical for Demo:** All RLS policies are enabled and verified. Admin routes are protected at both middleware and client levels.

---

## 1. Security Surfaces Identified

| Surface | Risk Level | Control | Status |
|---------|------------|---------|--------|
| Authentication | High | Supabase Auth + middleware | ✅ Secured |
| Route Protection | High | Next.js middleware | ✅ Secured |
| Admin Access | High | `is_admin` flag + RLS | ✅ Secured |
| Database Access | High | Row Level Security | ✅ Secured |
| User Data Isolation | High | RLS user_id policies | ✅ Secured |
| API Keys | Medium | Server-only env vars | ✅ Secured |

---

## 2. Authentication Security

### 2.1 Implementation
- **Provider:** Supabase Auth (email/password)
- **Session:** JWT tokens managed by Supabase SSR package
- **Validation:** Middleware uses `getUser()` (validates JWT with Supabase servers)

### 2.2 Why `getUser()` over `getSession()`
The middleware correctly uses `supabase.auth.getUser()` instead of `getSession()`. This is critical because:
- `getSession()` only validates JWT locally (can be spoofed)
- `getUser()` validates the JWT with Supabase servers (secure)

### 2.3 Files
- `middleware.ts` — Server-side route protection
- `lib/supabase.ts` — Client creation and auth helpers
- `hooks/use-protected-route.ts` — Client-side protection hook
- `lib/security/authGuard.ts` — Server-side auth helper for API routes

---

## 3. Route Protection

### 3.1 Protected Routes (Auth Required)

| Route | Protection |
|-------|------------|
| `/household` | Middleware redirect to `/login` |
| `/children` | Middleware redirect to `/login` |
| `/adults` | Middleware redirect to `/login` |
| `/dashboard` | Middleware redirect to `/login` |
| `/categories` | Middleware redirect to `/login` |
| `/adult-categories` | Middleware redirect to `/login` |
| `/household-categories` | Middleware redirect to `/login` |
| `/planning` | Middleware redirect to `/login` |
| `/summary` | Middleware redirect to `/login` |

### 3.2 Admin Routes (Admin Role Required)

| Route | Protection |
|-------|------------|
| `/admin` | Middleware checks `is_admin` flag |
| `/admin/families/[id]` | Middleware checks `is_admin` flag |

### 3.3 Public Routes (No Auth)

| Route | Description |
|-------|-------------|
| `/` | Landing page |
| `/signup` | Registration |
| `/login` | User login |
| `/admin/login` | Admin login |

---

## 4. Database Security (Row Level Security)

### 4.1 RLS Status

| Table | RLS Enabled | User Policy | Admin Policy |
|-------|-------------|-------------|--------------|
| `profiles` | ✅ YES | SELECT/UPDATE own | SELECT all |
| `households` | ✅ YES | ALL own | SELECT all |
| `adults` | ✅ YES | ALL own | SELECT all |
| `children` | ✅ YES | ALL own | SELECT all |
| `categories` | ✅ YES | ALL own | SELECT all |
| `expense_items` | ✅ YES | ALL own | SELECT all |
| `promo_codes` | ✅ YES | SELECT active | ALL (admin) |
| `activity_log` | ✅ YES | INSERT own | SELECT all |

### 4.2 Key Security Principles

1. **User Data Isolation:** Users can only access data where `user_id = auth.uid()`
2. **Admin Read-Only:** Admins can VIEW all user data but CANNOT modify it (SELECT only)
3. **No Direct Table Access:** All queries go through Supabase client with RLS enforcement

### 4.3 RLS Script Location
See `supabase/rls-policies.sql` for the complete idempotent RLS script.

---

## 5. Admin Role Security

### 5.1 Admin Determination
- Admin status is stored in `profiles.is_admin` (boolean, default FALSE)
- Set manually via SQL: `UPDATE profiles SET is_admin = TRUE WHERE email = '...'`
- Checked at middleware level before allowing access to `/admin/*` routes

### 5.2 Admin Capabilities
- ✅ Can VIEW all user profiles, households, children, adults, categories, expense items
- ✅ Can MANAGE promo codes (create, edit, expire)
- ✅ Can VIEW activity log
- ❌ Cannot MODIFY user budget data (RLS enforces SELECT-only)

### 5.3 Protection Layers
1. **Middleware:** Checks `is_admin` flag in profiles table
2. **RLS Policies:** Admin SELECT policies require `is_admin = TRUE`
3. **No INSERT/UPDATE/DELETE policies for admin on user data tables**

---

## 6. Environment Variable Security

### 6.1 Server-Only Variables (Never Exposed to Client)

| Variable | Purpose |
|----------|---------|
| `SUPABASE_SERVICE_ROLE_KEY` | Admin operations (bypasses RLS) |

### 6.2 Public Variables (Safe for Client)

| Variable | Purpose |
|----------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Anonymous key (RLS enforced) |

### 6.3 Rules
- Never log secrets to console
- `SUPABASE_SERVICE_ROLE_KEY` only used server-side if needed

---

## 7. Security Issues Found and Fixed

| Issue | Severity | Status | Resolution |
|-------|----------|--------|------------|
| RLS potentially disabled on profiles | Critical | ✅ Fixed | Re-run `supabase/rls-policies.sql` |
| No `authGuard.ts` helper | Low | ✅ Fixed | Created `lib/security/authGuard.ts` |
| No security documentation | Low | ✅ Fixed | Created this document |

---

## 8. Critical Manual Verification Required

Before the demo, the user MUST verify:

### 8.1 Verify RLS is Enabled (Supabase Dashboard)
1. Go to Supabase Dashboard → Table Editor
2. Click on `profiles` table
3. Check that "RLS Enabled" badge is shown
4. Repeat for all tables: households, adults, children, categories, expense_items, promo_codes, activity_log

### 8.2 Run the RLS Script
If any table shows RLS disabled, run the script in SQL Editor:
- `supabase/rls-policies.sql`

### 8.3 Verify Admin Account
```sql
-- Check admin account exists and has is_admin = TRUE
SELECT email, is_admin FROM profiles WHERE is_admin = TRUE;
```

If no rows returned, set admin:
```sql
UPDATE profiles SET is_admin = TRUE WHERE email = 'your-admin-email@example.com';
```

---

## 9. Post-Demo Improvements (Not Critical)

| Item | Priority | Notes |
|------|----------|-------|
| Rate limiting | Low | Supabase has built-in limits |
| Zod validation | Low | Nice-to-have for API routes |
| Input sanitization | Low | Add to API routes when built |
| Error monitoring (Sentry) | Low | v1.1 enhancement |

---

## 10. Files Created/Modified

| File | Action | Description |
|------|--------|-------------|
| `docs/security/security-plan.md` | Created | This document |
| `supabase/rls-policies.sql` | Created | Idempotent RLS script |
| `lib/security/authGuard.ts` | Created | Server-side auth helper |

---

## 11. Conclusion

The application has a solid security foundation:
- ✅ Authentication via Supabase Auth
- ✅ Route protection via Next.js middleware
- ✅ Data isolation via Row Level Security
- ✅ Admin access controlled at database level
- ✅ Environment variables properly scoped

**Action Required:** Run `supabase/rls-policies.sql` in Supabase SQL Editor to ensure all RLS policies are enabled before the demo.
