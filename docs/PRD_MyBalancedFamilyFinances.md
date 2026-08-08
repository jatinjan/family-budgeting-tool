# My Balanced Family Finances — Product Requirements Document

**Date:** August 7, 2026  
**Author:** Product Team  
**Status:** Draft  
**Version:** 1.1  
**Scope:** User Adoption MVP — Free Access, No Payments

---

## Executive Summary

This version focuses on **user adoption** — getting families to sign up, enter their budgets, and demonstrate value. Payment integration is **out of scope**. All users get free access as "Founding Members" (invite only). The admin panel enables the founder to monitor adoption, manage promo codes for attribution tracking, and view what families have entered for coaching purposes.

**Signup Model:** Single tier — "Founding Member" (free, invite only). Users need a valid promo code to sign up, enabling the founder to control access and track attribution (e.g., which workshop or coach referred them).

---

## Table of Contents

1. [Problem](#1-problem)
2. [User](#2-user)
3. [Core Metrics, Prioritisation & Roadmap](#3-core-metrics-prioritisation--roadmap)
4. [MVP Features](#4-mvp-features)
5. [Constraints](#5-constraints)
6. [Technical Requirements](#6-technical-requirements)
7. [Data Architecture](#7-data-architecture)
8. [Security & Privacy](#8-security--privacy)
9. [Evaluation Strategy](#9-evaluation-strategy)
10. [Production Readiness Criteria](#10-production-readiness-criteria)
11. [Assumptions](#11-assumptions)

---

## 1. Problem

### What problem is this solving?

Australian families struggle to understand their true annual cost of living. Expenses are fragmented across different people (children, adults), different frequencies (weekly groceries, term school fees, annual insurance), and different priorities (needs vs wants). Without a clear annual view, families:

- Underestimate total expenses by 20-40% (hidden costs in irregular payments)
- Cannot distinguish between essential and discretionary spending
- Lack visibility into per-child costs for multi-child households
- Have no structured way to plan forward and identify savings opportunities

**My Balanced Family Finances** solves this by providing a structured, category-based budgeting tool that:
1. Consolidates all family expenses into a single annual view
2. Separates costs by entity (each child, each adult, household)
3. Tags expenses as "needs" or "wants" for prioritisation
4. Enables forward planning to model potential savings

### Why is this problem worth solving?

**Quantified pain:**

- 63% of Australian households live paycheck-to-paycheck (ME Bank, 2023)
- Average Australian family underestimates annual expenses by $8,400 (ABS Household Expenditure Survey extrapolation)
- Cost of raising a child in Australia: $170,000 to age 17 (ASIC MoneySmart, 2024)
- Financial stress is the #1 cause of relationship breakdown in Australia (Relationships Australia, 2023)

**Market gap:**

Existing tools (YNAB, Pocketbook, Frollo) focus on transaction tracking and bank feeds. They answer "where did my money go?" but not "how much will I need this year?" and "where can I save?". There is no purpose-built tool for Australian families that:
- Pre-populates expense categories with realistic items
- Handles multiple children with age-appropriate cost templates
- Separates household costs from personal costs
- Provides a forward-planning layer for savings identification

**MOAT:**

1. **Pre-populated Australian templates:** Categories and items specific to Australian family life (school terms, Medicare gaps, OSHC, Opal cards) — not generic US-centric budgeting
2. **Entity-based model:** Unique structure separating children/adults/household enables per-person visibility that transaction trackers cannot provide
3. **Needs/Wants + Forward Planning:** The adjustment layer allows families to model "what if" scenarios without losing their actual budget data
4. **Workshop-ready:** Designed for financial coaches and workshops, not just individual use — creates a B2B distribution channel

### Why a web app (PWA)?

| Dimension | Detail |
|---|---|
| **Why not a spreadsheet?** | Spreadsheets lack structure, pre-population, and mobile accessibility. 78% of family budgeting happens on mobile during spare moments |
| **Why not a native app?** | Cross-platform reach; no app store approval delays; instant updates; PWA provides offline capability and home screen installation |
| **Why client-side first?** | Privacy-first approach builds trust; no account friction for initial use; data stays on device until user opts into sync |

---

## 2. User

### Who are you solving this problem for?

**Primary persona — The Organised Parent**

- **Demographics:** 30–45 years old, 2–4 person household, 1–3 children
- **Household income:** $80,000–$180,000 combined
- **Behaviour:** Uses spreadsheets or mental math; reviews finances monthly; feels "in control" but suspects they're missing costs
- **Pain:** School fees, extracurricular activities, and irregular expenses create cash flow surprises; no clear picture of per-child costs; partner disagreements about "what we can afford"

**Secondary persona — The Financial Coach/Advisor**

- **Role:** Financial counsellor, budgeting workshop facilitator, school P&C financial literacy coordinator
- **Behaviour:** Runs 4–10 family budgeting sessions per month; needs a tool families can use during and after sessions
- **Pain:** Existing tools require account setup before use; spreadsheet templates need manual customisation per family; no way to track client progress

**Tertiary persona — The Overwhelmed New Parent**

- **Demographics:** First child under 3; previously had clear finances as a couple
- **Behaviour:** Shocked by childcare costs; unsure what other expenses are coming
- **Pain:** No framework for what "normal" family spending looks like; making financial decisions blind

---

## 3. Core Metrics, Prioritisation & Roadmap

### How will you know the problem is solved? (Core Metrics)

**North Star Metric:** Percentage of users who complete a full annual budget (all three entities populated with costs)

- **Baseline:** 0% (no existing user base)
- **Target:** ≥ 40% of registered users within 30 days of signup
- **Tracked via:** Database query on completed categories per user

**Primary Metrics:**

| Metric | Baseline | Target | How tracked |
|---|---|---|---|
| Time to first budget entry | — | ≤ 5 minutes from signup | Session timestamp logs |
| Budget completion rate | — | ≥ 40% complete all 3 entities | Categories with items > 0 |
| Forward planning engagement | — | ≥ 25% of users try planning mode | Feature flag + event tracking |
| Monthly active users (MAU) | — | ≥ 60% of registered users | Supabase session analytics |

**Secondary Metrics:**

| Metric | Baseline | Target | How tracked |
|---|---|---|---|
| 30-day user retention | — | ≥ 35% | Supabase session analytics |
| NPS (Net Promoter Score) | — | ≥ 45 | In-app survey quarterly |
| Admin panel logins (founder) | — | Daily usage | Session logs |
| Promo code redemption rate | — | ≥ 70% of distributed codes | Admin panel metrics |
| Support ticket volume | — | ≤ 5% of MAU | Support system tracking |

### Prioritisation

#### Breaking the System into Components

**User-Facing App:**
1. **Component A — User Authentication** (Supabase Auth)
2. **Component B — Profile Management** (Children, Adults, Household CRUD)
3. **Component C — Budget Entry** (Categories + Items with cost/frequency/quantity)
4. **Component D — Dashboard & Visualisation** (Charts, totals, breakdowns)
5. **Component E — Planning Mode** (Needs/Wants tagging, forward adjustments)
6. **Component F — Summary & Export** (CSV export, print view)

**Admin Panel:**
7. **Component G — Admin Authentication** (Supabase Auth with admin role)
8. **Component H — User Management** (View families, activity status)
9. **Component I — Promo Code Management** (Track attribution, which users used which code)
10. **Component J — Activity Monitoring** (Real-time event log)
11. **Component K — Adoption Metrics** (Total users, active users, completion rates)
12. **Component L — Family Detail View** (View user-entered data, coaching signals)

#### Risk Assessment per Component

| Component | Risk Level | Explanation | Mitigation |
|---|---|---|---|
| A — User Auth | Low | Supabase Auth is battle-tested; standard email/password flow | Use Supabase best practices; add social auth in v1.1 |
| B — Profile Management | Low | Simple CRUD operations; well-understood patterns | Validate input; handle edge cases (0 children, single adult) |
| C — Budget Entry | Medium | Core value prop; UX must be frictionless; calculation logic must be accurate | Extensive testing; pre-populate with sensible defaults |
| D — Dashboard | Low | Read-only aggregation; Recharts is mature | Test with large datasets; lazy load charts |
| E — Planning Mode | Medium | Complex state management; adjustment layer adds cognitive load | Clear UI guidance; tooltips; "reset to original" option |
| G — Admin Auth | Medium | Must prevent unauthorised access to all user data | Role-based RLS; separate admin table; audit logging |
| K — Adoption Metrics | Low | Read-only aggregation of user data | Cache metrics; update on activity |
| L — Family Detail View | Low | Read-only; data already exists | RLS ensures admin can only read, not modify user budgets |

#### Prioritised Stories (User Adoption MVP)

| Story ID | Title | Priority | Points | Status |
|---|---|---|---|---|
| US-001 | User authentication (sign up / sign in / sign out) | P0 | 3 | To Do |
| US-002 | Migrate IndexedDB data to Supabase on signup | P0 | 5 | To Do |
| US-003 | Real-time data sync across devices | P0 | 5 | To Do |
| US-004 | Admin authentication with role check | P0 | 3 | To Do |
| US-005 | Admin user management (view all families) | P0 | 4 | To Do |
| US-006 | Promo code management (track who signed up with codes) | P1 | 3 | To Do |
| US-007 | Family detail view (read user budgets) | P0 | 5 | To Do |
| US-008 | Activity log with real-time updates | P1 | 3 | To Do |
| US-009 | User adoption metrics dashboard (total users, active users, completion rate) | P1 | 3 | To Do |
| US-010 | Welcome email on signup | P2 | 2 | Backlog |
| US-011 | Social auth (Google) | P2 | 3 | Backlog |
| US-012 | Data export for user (GDPR compliance) | P2 | 3 | Backlog |

### Roadmap (Simplified — No Payments)

| Release | Features Included | Duration |
|---|---|---|
| **v0.1 — Foundation** | Supabase project setup; all DB tables with RLS; user auth (email/password); admin auth with role | Day 1–2 |
| **v0.2 — Data Layer** | IndexedDB → Supabase migration flow; real-time sync; offline-first with sync queue | Day 3–4 |
| **v0.3 — Admin Production** | Admin panel connected to real DB; user list from DB; promo codes in DB; activity log; family detail view | Day 5–6 |
| **v1.0 — Soft Launch** | Security review; error monitoring; basic analytics; ToS/Privacy Policy | Day 7 |
| **v1.1 — Iteration** | Social auth; email notifications; coaching features | Post-launch |

**Dependencies:**

- Supabase project provisioned (required before v0.1)
- Domain purchased and DNS configured (required before v1.0)
- Simple Terms of Service and Privacy Policy (required before v1.0)

---

## 4. MVP Features

### User Flows

#### Flow 1 — New User → Sign Up → First Budget

```
Landing Page → Click "Get Started" → Email/Password Sign Up 
→ Create Household → Add Family Members → Enter First Category 
→ See Annual Total
```

1. User lands on marketing page; sees value prop and "Get Started Free" CTA
2. Sign up with email/password (or social auth in v1.1)
3. Onboarding wizard: "Let's set up your household"
   - Household name, housing type, number of members
   - Add adults (name, age)
   - Add children (name, age, school level)
4. Redirect to household budget with pre-populated categories
5. User enters first cost (e.g., rent/mortgage)
6. Grand total updates; user sees immediate value

#### Flow 2 — Returning User → Continue Budget

```
Sign In → Dashboard → Select Entity → Continue Entering Costs
```

1. User sees dashboard summary: total annual, per-entity breakdown
2. Progress indicator: "12 of 21 categories completed"
3. Click on any entity to continue entering costs

#### Flow 3 — Planning Mode

```
Dashboard → Click "Plan" → Tag Needs/Wants → Adjust Amounts 
→ See Potential Savings
```

1. User enters Planning mode from navigation
2. For tagged categories, items show Need/Want toggle
3. User can adjust amounts for "what if" scenarios
4. Summary shows: Current Situation vs Forward Plan vs Potential Savings

#### Flow 4 — Admin: Monitor Users

```
Admin Sign In → Dashboard → Users Tab → Click Family → View Details
```

1. Admin signs in with admin-role email
2. Dashboard shows: Total families, active users, completion rates, recent activity
3. Users tab shows all families with onboarding status badges
4. Click any family → full profile and budget breakdown (read-only for coaching)

#### Flow 5 — Admin: Manage Promo Codes (Attribution)

```
Admin Dashboard → Promo Codes Tab → Create Code → Share with Users
```

1. Click "Create promo code"
2. Enter: code name (e.g., "WORKSHOP-MAY", "COACH-SARAH"), max uses, expiry
3. Code appears in table with redemption counter
4. Share code with users (workshop handout, coach referral)
5. When users sign up with code, attribution is tracked for reporting

### Functional Requirements

**User Stories:**

| ID | User Story | Acceptance Criteria | Priority |
|---|---|---|---|
| US-001 | As a parent, I want to sign up and save my budget to the cloud so I can access it from any device | Auth completes in < 5 seconds; data syncs within 2 seconds; works offline with sync on reconnect | P0 |
| US-002 | As a parent, I want to see my total annual family cost broken down by person so I understand where money goes | Dashboard shows: total annual, per-child totals, adult totals, household total; updates in real-time as costs entered | P0 |
| US-003 | As a parent, I want pre-populated categories so I don't have to think of every expense myself | Each entity gets default categories with seed items; items start at $0; user fills in their actual costs | P0 |
| US-004 | As a parent, I want to tag expenses as needs or wants so I can identify potential savings | Planning mode shows Need/Want toggle on tagged categories; savings calculation excludes wants | P1 |
| US-005 | As a founder, I want to see all families and their subscription status so I can manage the business | Admin dashboard shows user table with filters and actions; real-time updates | P0 |
| US-006 | As a founder, I want to create promo codes to incentivise signups | Admin can CRUD promo codes; redemptions tracked; codes validate at signup | P0 |
| US-007 | As a founder, I want to see what families have entered so I can offer coaching | Family detail view shows full profile and budget breakdown; read-only | P1 |
| US-008 | As a coach, I want families to see their budget without needing an account first | Guest mode allows full budget use with IndexedDB; prompt to save after 3 sessions | P1 |

**Functional Requirements Table:**

| ID | Requirement | Priority | Notes |
|---|---|---|---|
| FR-01 | Users must be able to sign up, sign in, and sign out using Supabase Auth | P0 | Support email/password; social auth in v1.1 |
| FR-02 | User data must sync between IndexedDB (offline) and Supabase (cloud) | P0 | Last-write-wins conflict resolution; sync queue for offline changes |
| FR-03 | Budget calculations must be accurate: annual = cost × quantity × frequency multiplier | P0 | Weekly ×52, monthly ×12, quarterly ×4, term ×4, annual ×1 |
| FR-04 | Miscellaneous category must calculate as percentage of other categories | P0 | Default 15%; user-adjustable |
| FR-05 | Admin users must have role-based access to admin panel | P0 | Supabase custom claims or admin table; RLS enforced |
| FR-06 | Promo codes track which users signed up with them (for attribution) | P1 | Optional at signup; stored in user profile |
| FR-07 | Admin must not be able to modify user budget data | P0 | Read-only RLS policy on budget tables for admin role |
| FR-08 | All timestamps must be stored in UTC; displayed in user's local timezone | P1 | Use Intl.DateTimeFormat for display |
| FR-09 | Export must generate valid CSV with all budget data | P2 | Include: entity, category, item, cost, frequency, annual total, need/want |
| FR-10 | All users get free access — no payment required | P0 | Monetisation deferred to future phase |

---

## 5. Constraints

**Performance constraints:**

- Page load time ≤ 3 seconds on 3G connection
- Budget calculation update ≤ 100ms after input
- Data sync to cloud ≤ 2 seconds when online
- Admin dashboard load ≤ 2 seconds with 1,000 users
- Chart rendering ≤ 500ms

**Data constraints:**

- Maximum 10 children per household (practical limit)
- Maximum 5 adults per household
- Maximum 50 items per category
- Maximum 100 custom categories per entity
- Budget amounts: $0 to $999,999 per item

**Scalability constraints:**

- Must handle 1,000 concurrent users at launch
- Architecture must support 10,000 users within 12 months
- Database queries must be indexed for user_id filtering

**Reliability constraints:**

- 99.5% uptime SLA
- Offline mode must work indefinitely with local data
- Sync failures must queue and retry with exponential backoff
- No data loss on sync conflict (keep both versions if necessary)

**Compliance constraints:**

- Australian Privacy Principles (APP) compliance
- GDPR-ready for potential UK/EU expansion
- User can export all their data on request
- User can delete all their data on request
- No selling or sharing of user data with third parties

---

## 6. Technical Requirements

### Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                         CLIENT (Browser/PWA)                        │
├─────────────────────────────────────────────────────────────────────┤
│  Next.js 16 (App Router)  │  React 19  │  TypeScript  │  Tailwind  │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│   ┌──────────────┐    ┌──────────────┐    ┌──────────────┐         │
│   │  IndexedDB   │◄──►│  Sync Layer  │◄──►│   Supabase   │         │
│   │   (Dexie)    │    │              │    │   Client     │         │
│   └──────────────┘    └──────────────┘    └──────────────┘         │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         SUPABASE (Backend)                          │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│   ┌──────────────┐    ┌──────────────┐    ┌──────────────┐         │
│   │     Auth     │    │   Database   │    │   Realtime   │         │
│   │              │    │  (Postgres)  │    │              │         │
│   └──────────────┘    └──────────────┘    └──────────────┘         │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘

Note: Stripe/Payments integration is OUT OF SCOPE for this version.
All users get free access. Monetisation deferred to future phase.
```

### Technology Stack

| Layer | Technology | Rationale |
|---|---|---|
| Frontend Framework | Next.js 16 (App Router) | Already in use; excellent DX; built-in optimisations |
| UI Library | React 19 | Already in use; hooks-based state management |
| Styling | Tailwind CSS v4 | Already in use; utility-first; rapid development |
| Components | shadcn/ui + Radix | Already in use; accessible; customisable |
| Charts | Recharts | Already in use; React-native; responsive |
| Local Storage | Dexie (IndexedDB) | Already in use; reactive queries; offline-first |
| Auth & Database | Supabase | Managed Postgres; built-in auth; RLS; realtime |
| Hosting | Vercel | Next.js native; edge functions; automatic scaling |
| Monitoring (optional) | Sentry | Error tracking; can add post-launch |
| Analytics (optional) | PostHog | Privacy-focused; can add post-launch |

**Not in scope:** Stripe, payment processing, subscription billing.

### Database Schema (Supabase)

```sql
-- Users (extends Supabase auth.users)
CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  email TEXT NOT NULL,
  family_name TEXT,
  is_admin BOOLEAN DEFAULT FALSE,
  promo_code_used TEXT, -- for attribution tracking
  onboarding_status TEXT DEFAULT 'signed_up', -- 'signed_up', 'profile_complete', 'budget_started', 'plan_complete'
  signed_up_at TIMESTAMPTZ DEFAULT NOW(),
  last_active_at TIMESTAMPTZ DEFAULT NOW()
);

-- Households
CREATE TABLE public.households (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  housing_type TEXT,
  members INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Adults
CREATE TABLE public.adults (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  age INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Children
CREATE TABLE public.children (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  age INTEGER,
  school_level TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Categories (unified for all entity types)
CREATE TABLE public.categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL, -- 'child', 'adult', 'household'
  entity_id UUID NOT NULL, -- references child_id, adult_id, or household_id
  name TEXT NOT NULL,
  description TEXT,
  is_percentage_based BOOLEAN DEFAULT FALSE,
  percentage_value NUMERIC DEFAULT 15,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Expense Items
CREATE TABLE public.expense_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  category_id UUID REFERENCES public.categories(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  cost NUMERIC DEFAULT 0,
  frequency TEXT DEFAULT 'monthly',
  quantity INTEGER DEFAULT 1,
  total NUMERIC DEFAULT 0, -- calculated: cost × quantity × frequency_multiplier
  need_want TEXT, -- 'need', 'want', or null
  adjusted_total NUMERIC, -- for forward planning
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Promo Codes (for attribution tracking only - all users get free access)
CREATE TABLE public.promo_codes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  description TEXT, -- e.g., "May 2026 Workshop", "Coach Sarah referral"
  redemptions INTEGER DEFAULT 0,
  max_redemptions INTEGER,
  status TEXT DEFAULT 'active',
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Activity Log
CREATE TABLE public.activity_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  family_name TEXT,
  event_type TEXT NOT NULL,
  message TEXT NOT NULL,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Row Level Security Policies
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.households ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.adults ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.children ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expense_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promo_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;

-- Users can only access their own data
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can CRUD own households" ON public.households FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can CRUD own adults" ON public.adults FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can CRUD own children" ON public.children FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can CRUD own categories" ON public.categories FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can CRUD own items" ON public.expense_items FOR ALL USING (auth.uid() = user_id);

-- Admins can read all user data (but not modify)
CREATE POLICY "Admins can view all profiles" ON public.profiles FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = TRUE)
);
CREATE POLICY "Admins can view all households" ON public.households FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = TRUE)
);
-- ... similar policies for other tables

-- Promo codes are public for validation, but only admins can modify
CREATE POLICY "Anyone can view promo codes" ON public.promo_codes FOR SELECT USING (TRUE);
CREATE POLICY "Admins can manage promo codes" ON public.promo_codes FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = TRUE)
);
```

---

## 7. Data Architecture

### Sync Strategy: IndexedDB ↔ Supabase

**Offline-First with Sync Queue:**

1. All writes go to IndexedDB first (immediate UI update)
2. Sync layer queues changes with timestamps
3. When online, sync queue processes in order
4. Supabase Realtime pushes remote changes to client
5. Conflict resolution: last-write-wins based on `updated_at`

**Migration Flow (existing users):**

```
User signs up → Check IndexedDB for existing data 
→ If exists: prompt "Import existing budget?"
→ If yes: batch insert to Supabase, mark local as synced
→ If no: start fresh, preserve local data separately
```

### Data Relationships

```
Profile (user)
├── Household (1:1)
│   └── HouseholdCategories (1:N)
│       └── HouseholdExpenseItems (1:N)
├── Adults (1:N)
│   └── AdultCategories (1:N)
│       └── AdultExpenseItems (1:N)
└── Children (1:N)
    └── ChildCategories (1:N)
        └── ChildExpenseItems (1:N)
```

---

## 8. Security & Privacy

### Authentication

| Requirement | Implementation |
|---|---|
| Password hashing | Supabase Auth (bcrypt, handled automatically) |
| Session management | Supabase JWT tokens; 1-week expiry; refresh tokens |
| Admin access | `is_admin` flag in profiles table; checked via RLS |
| Rate limiting | Supabase built-in; 100 requests/minute per IP |

### Data Protection

| Requirement | Implementation |
|---|---|
| Encryption at rest | Supabase default (AES-256) |
| Encryption in transit | TLS 1.3 enforced |
| Data isolation | Row Level Security on all tables |
| Backup | Supabase daily backups; point-in-time recovery on Pro |

### Privacy Compliance

| Requirement | Implementation |
|---|---|
| Data minimisation | Only collect necessary data; no analytics PII |
| User consent | Clear ToS acceptance at signup |
| Data export | User can request JSON export of all their data |
| Data deletion | User can delete account; cascade deletes all data |
| No third-party sharing | Budget data never sent to external services |

---

## 9. Evaluation Strategy

### Testing Plan

| Test Type | Scope | Tools | Cadence |
|---|---|---|---|
| Unit tests | Calculation functions, utilities | Vitest | Every commit |
| Integration tests | API routes, Supabase queries | Vitest + Supabase local | Every PR |
| E2E tests | Critical user flows | Playwright | Every release |
| Performance tests | Page load, sync latency | Lighthouse, custom metrics | Weekly |
| Security tests | Auth, RLS policies | Manual + automated scans | Before launch, quarterly |

### Key Test Scenarios

1. **Budget calculation accuracy:** Verify annual totals match expected values across all frequency types
2. **Sync reliability:** Offline changes sync correctly; no data loss on conflict
3. **Auth flow:** Sign up, sign in, sign out, password reset all work
4. **Admin access control:** Admin can view but not modify user data; non-admin blocked from admin routes
5. **Promo code attribution:** Users who sign up with a promo code are tracked correctly

### Success Metrics (30 days post-launch)

| Metric | Target | Measurement |
|---|---|---|
| Sign-up conversion | ≥ 15% of landing page visitors | PostHog funnel |
| Activation rate | ≥ 50% enter at least one cost | Database query |
| Completion rate | ≥ 30% complete full budget | Database query |
| Error rate | ≤ 0.1% of sessions | Sentry |
| Customer support tickets | ≤ 20 total | Support inbox |

---

## 10. Production Readiness Criteria

### Launch Checklist

| Category | Requirement | Status |
|---|---|---|
| **Infrastructure** | Supabase project provisioned | To Do |
| | Vercel production deployment | To Do |
| | Custom domain configured | To Do |
| | SSL certificate active | To Do |
| **Security** | RLS policies tested | To Do |
| | Admin access verified | To Do |
| | Environment variables secured | To Do |
| **Legal** | Terms of Service published | To Do |
| | Privacy Policy published | To Do |
| **Operations** | Support email configured | To Do |
| | Admin accounts created | To Do |

### Go/No-Go Criteria

| Criteria | Threshold | Status |
|---|---|---|
| All P0 stories complete | 100% | — |
| Auth flow working | Sign up, sign in, sign out | — |
| Data sync working | IndexedDB ↔ Supabase | — |
| Admin panel functional | All tabs with real data | — |
| RLS policies verified | Users can only see own data | — |

---

## 11. Assumptions

1. **Supabase free tier is sufficient for initial launch.** Upgrade to Pro if usage grows beyond free limits.

2. **Free access is sufficient for user adoption phase.** Monetisation can be added later once product-market fit is proven.

3. **IndexedDB to Supabase migration is acceptable to users.** Users who started with local-only data can opt-in to cloud sync.

4. **Target users have email addresses.** Social auth (Google) is P2; email/password sufficient for MVP.

5. **Admin is a single founder initially.** Multi-admin with roles is not needed for launch.

6. **Most families have < 200 expense items.** Database and UI can handle this comfortably.

7. **Australian market only at launch.** Currency, date formats, and templates are AU-specific.

8. **Workshop/coaching channel is viable.** Financial coaches will be a key distribution channel.

9. **PWA install rate is low but acceptable.** Most users will use in-browser; native app not needed for v1.

10. **Last-write-wins sync is acceptable.** True conflict resolution (merge) can be added post-launch if needed.

---

## Next Steps

| Step | Task | Duration |
|---|---|---|
| 1 | **Review this PRD** — Confirm scope and priorities | 30 min |
| 2 | **Set up Supabase** — Create project, configure auth | 1 hour |
| 3 | **Create database schema** — Run SQL migrations, set up RLS | 2 hours |
| 4 | **Implement auth flow** — Sign up, sign in, admin role check | 2 hours |
| 5 | **Build sync layer** — IndexedDB ↔ Supabase bidirectional sync | 3 hours |
| 6 | **Connect admin panel** — Replace mock data with real DB queries | 2 hours |
| 7 | **Test critical flows** — Auth, sync, admin access | 1 hour |
| 8 | **Deploy to production** — Vercel, domain, SSL | 1 hour |
| 9 | **Final review** — ToS, Privacy Policy, basic monitoring | 1 hour |

**Total estimated time: ~13 hours (fits in 2 demo-prep days)**

---

*Document version 1.1 — August 7, 2026 — User Adoption Focus (No Payments)*
