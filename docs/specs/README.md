# Implementation Specifications

**Project:** My Balanced Family Finances  
**Generated:** August 7, 2026  
**Based On:** Engineering Document v1.0

---

## Overview

These specifications provide detailed, actionable implementation guidance for building the production-ready version of My Balanced Family Finances. Each spec is self-contained and can be handed to a developer to build without ambiguity.

---

## Spec Files

| File | Description | Priority |
|------|-------------|----------|
| [`supabase-schema.sql`](./supabase-schema.sql) | Complete database schema ready to run in Supabase SQL Editor | P0 |
| [`auth-flow.md`](./auth-flow.md) | Sign up, sign in, sign out, session management | P0 |
| [`sync-layer.md`](./sync-layer.md) | IndexedDB ↔ Supabase bidirectional sync with state machine | P0 |
| [`protected-routes.md`](./protected-routes.md) | Route protection, middleware, redirects | P0 |
| [`budget-calculations.md`](./budget-calculations.md) | Frequency multipliers, category totals, planning mode | P0 |
| [`planning-sheet.md`](./planning-sheet.md) | Which Planning categories get Current/Forward vs Need/Want | P0 |
| [`admin-panel.md`](./admin-panel.md) | Admin dashboard, user management, promo codes, activity log | P0 |
| [`admin-consultation-view.md`](./admin-consultation-view.md) | Read-only family consultation workspace (same information as the customer) | P0 |
| [`data-migration.md`](./data-migration.md) | Migrate existing IndexedDB data on signup | P0 |
| [`error-handling.md`](./error-handling.md) | Error categories, notifications, retry logic, boundaries | P1 |

---

## Implementation Order

### Phase 1: Foundation (Days 1-3)

1. **Run Supabase Schema** (`supabase-schema.sql`)
   - Creates all tables, indexes, RLS policies, triggers
   - Seeds default promo codes
   - One-time setup in Supabase SQL Editor

2. **Auth Flow** (`auth-flow.md`)
   - AuthContext provider
   - Sign up with promo code validation
   - Sign in, sign out
   - Session persistence

3. **Protected Routes** (`protected-routes.md`)
   - Middleware for server-side protection
   - Client-side route guards
   - Admin role checks

### Phase 2: Core Features (Days 4-5)

4. **Sync Layer** (`sync-layer.md`)
   - Sync state machine
   - Push to cloud, pull from cloud
   - Offline detection
   - Retry with exponential backoff

5. **Data Migration** (`data-migration.md`)
   - Check for existing IndexedDB data
   - Migration prompt on signup
   - Import or start fresh

6. **Budget Calculations** (`budget-calculations.md`)
   - Frequency multipliers
   - Category and entity totals
   - Planning mode calculations

### Phase 3: Admin & Polish (Days 6-7)

7. **Admin Panel** (`admin-panel.md`)
   - Replace mock data with real Supabase queries
   - Users, promo codes, activity tabs
   - Family detail view

8. **Admin Consultation View** (`admin-consultation-view.md`)
   - Read-only query hook for one family
   - Consultation shell (banner + nav)
   - Dashboard, planning, summary, profile, category displays

9. **Error Handling** (`error-handling.md`)
   - Error boundaries
   - Toast notifications
   - Offline banner
   - Form validation

---

## Environment Setup

Copy `.env.example` to `.env.local` and fill in:

```env
# Required
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# Optional
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

---

## Quick Start

1. **Deploy Database:**
   ```
   Supabase Dashboard → SQL Editor → Paste docs/specs/supabase-schema.sql → Run
   ```

2. **Set Environment:**
   ```bash
   cp .env.example .env.local
   # Fill in Supabase credentials
   ```

3. **Start Development:**
   ```bash
   npm run dev
   ```

4. **Create Admin User:**
   ```sql
   UPDATE profiles SET is_admin = TRUE WHERE email = 'your-email@example.com';
   ```

---

## Files Created/Modified Per Spec

### supabase-schema.sql
- `docs/specs/supabase-schema.sql` — Run in Supabase

### auth-flow.md
- `lib/supabase.ts` — Supabase client + auth helpers
- `contexts/AuthContext.tsx` — Auth state provider
- `components/providers.tsx` — Provider wrapper
- `app/signup/page.tsx` — Real auth signup
- `app/login/page.tsx` — User login page
- `hooks/use-auth.ts` — Convenience hook

### sync-layer.md
- `lib/sync.ts` — Sync logic
- `lib/db.ts` — Add sync metadata
- `contexts/SyncContext.tsx` — Sync state provider
- `hooks/use-sync.ts` — Sync hook
- `components/sync-indicator.tsx` — Status UI
- `components/offline-banner.tsx` — Offline notification

### protected-routes.md
- `middleware.ts` — Server-side protection
- `hooks/use-protected-route.ts` — Client-side protection
- `app/(app)/layout.tsx` — Protected layout
- `app/admin/layout.tsx` — Admin layout

### budget-calculations.md
- `lib/utils/calculations.ts` — Calculation functions
- `lib/utils/formatters.ts` — Currency/date formatting
- `lib/utils/validators.ts` — Input validation

### admin-panel.md
- `app/admin/login/page.tsx` — Admin login
- `app/admin/page.tsx` — Real data queries
- `app/admin/families/[id]/page.tsx` — Real data
- `app/admin/components/*.tsx` — Real queries

### planning-sheet.md
- `lib/planning-categories.ts` — Forward-planning and need/want category lists
- `app/planning/page.tsx` — Family Planning layouts
- `app/summary/page.tsx` — Same classification
- `lib/consultation-totals.ts` — Shared planning totals

### admin-consultation-view.md
- `hooks/use-family-budget.ts` — Read-only family query
- `contexts/ConsultationContext.tsx` — Consultation data provider
- `lib/planning-categories.ts` — Shared planning category lists (see planning-sheet.md)
- `app/admin/families/[id]/view/**` — Consultation shell and screens
- `app/admin/families/[id]/page.tsx` — Open consultation CTA

### data-migration.md
- `lib/migration.ts` — Migration logic
- `components/migration-prompt.tsx` — Migration dialog

### error-handling.md
- `types/errors.ts` — Error types
- `lib/utils/error-handler.ts` — Error mapping
- `lib/utils/retry.ts` — Retry logic
- `components/error-boundary.tsx` — Error boundary
- `components/global-error-fallback.tsx` — Fallback UI

---

## Verification Checklist

After implementing all specs, verify:

- [ ] New user can sign up with promo code
- [ ] User can sign in and see synced data
- [ ] Data persists across sessions
- [ ] Offline edits sync when back online
- [ ] Admin can view all users (read-only)
- [ ] Admin can open a family's consultation view (same information, including drafts)
- [ ] Admin can manage promo codes
- [ ] Activity log shows real events
- [ ] Errors handled gracefully with user feedback
