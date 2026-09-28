# Coach Editing Specification

**Status:** Ready for review  
**Priority:** P0  
**Dependencies:** [`admin-consultation-view.md`](./admin-consultation-view.md), [`cross-device-sync-fix.md`](./cross-device-sync-fix.md), [`sync-layer.md`](./sync-layer.md), [`auth-flow.md`](./auth-flow.md), [`soft-launch-invite.md`](./soft-launch-invite.md)  
**Related:** [`admin-panel.md`](./admin-panel.md), [`budget-calculations.md`](./budget-calculations.md)

---

## Overview

Niral needs to enter budget data for clients who are not comfortable doing it themselves. Two situations:

1. **Setup** — a new client who has not logged in yet. She creates the family, fills in the budget, then invites them. When they log in, the budget is already there.
2. **Assist** — a client who already uses the app, is part-way through, and does not know some answers. They let her fill in the gaps, then carry on.

Both use **one mechanism: an edit lease.** For any family, exactly one party may write the budget at a time — the family, or one coach holding a lease. The database enforces this. The UI only reflects it.

This does not replace consultation. Consultation stays read-only for any admin without a lease.

---

## 1. Product rules

| Rule | Behaviour |
|------|-----------|
| One writer | At any moment, either the family or one coach may write a family's budget. Never both. |
| Database enforced | Postgres rejects writes from whoever does not hold the pen. Hidden buttons are not the boundary. |
| No impersonation | The coach stays signed in as herself. `auth.uid()` is always the real person. No family session on her machine. No Dexie in admin. |
| Cloud is the copy | Coach writes go straight to Supabase. The family app pulls them like any other cloud change. |
| Consent for assist | An existing client must accept on their own device before a coach can write. They can take back the pen at any time. |
| Setup ends on claim | A setup lease ends automatically the first time the family signs in. |
| Assist is time-boxed | An assist lease lasts 90 minutes from acceptance unless ended earlier. |
| Whole-budget lock | The lock covers all budget tables for that family, not one profile or category. |
| Audited | Every coach write records who wrote it. Lease start/end is in the activity log. |
| Same data shape | Rows the coach creates are identical in shape to rows the family app creates (templates, labels, totals). |

### 1.1 Out of scope (v1)

- Coach editing Balance intention (`profiles.balance_goal` etc.)
- Coach editing Planning-sheet forward-planning fields
- Extending an assist lease (end it and request again)
- Per-profile or per-category locks
- Showing "added by your coach" markers in the family app (the data is recorded; the UI comes later)
- Propose-and-confirm (family approves each change)
- Multiple coaches / coach roles other than `is_admin`

---

## 2. User flows

### 2.1 Setup (new client)

```
Admin → Users → "Add family"
  → enter family name + email → Create
  → server creates the auth user (no password, no email yet)
  → setup lease starts automatically (coach = me)
  → /admin/families/[id]/edit  — fill household, adults, children, costs
  → "Send invite" (any time; can resend)
  → client gets "Set your password" email → sets password → signs in
  → claim_family_budget() ends the setup lease
  → client app pulls the budget; client now holds the pen
```

- She can fill in before or after sending the invite.
- If the client claims while she is still typing, her next save is rejected with **"This family has signed in and taken over their budget."** Everything saved before that is kept.
- She can end the setup lease herself (**Stop editing**). While the family is unclaimed she can start a new setup lease again from the family page.

### 2.2 Assist (existing client)

```
Admin → family → "Ask to help"
  → lease status = requested (no write access yet)
Client app → banner: "Niral would like to fill in part of your budget."
  → [Let Niral help]  [Not now]
  → Let Niral help: app checks it has finished saving → family_respond_assist(accept)
  → lease status = active, expires in 90 min
  → client app turns view-only; shows her entries live
Admin → /admin/families/[id]/edit — fill the gaps
  → "Done"  (or client taps "Take back editing", or 90 min passes)
  → lease ends
Client app → cloud pull → unlocks
```

- A request not answered within **15 minutes** expires.
- **Not now** declines. She can ask again.

---

## 3. Data model

New migration: `supabase/migrations/20261001_coach_edit_lease.sql`. Mirror into `supabase/schema.sql`.

### 3.1 `budget_edit_leases`

| Column | Type | Notes |
|--------|------|-------|
| `id` | `uuid` PK | `gen_random_uuid()` |
| `user_id` | `uuid` not null → `profiles(id)` on delete cascade | The family |
| `coach_id` | `uuid` not null → `profiles(id)` | Must be `is_admin` |
| `mode` | `text` check `('setup','assist')` | |
| `status` | `text` check `('requested','active','ended','declined')` | |
| `requested_at` | `timestamptz` default `now()` | |
| `request_expires_at` | `timestamptz` null | Assist only: `requested_at + 15 min` |
| `granted_at` | `timestamptz` null | |
| `expires_at` | `timestamptz` null | Assist: `granted_at + 90 min`. Setup: null |
| `ended_at` | `timestamptz` null | |
| `ended_by` | `uuid` null | Who ended it (null for expiry) |
| `end_reason` | `text` null check `('coach_done','family_took_back','claimed','declined','cancelled')` | |

Constraint: partial unique index on `(user_id)` where `status in ('requested','active')`. One open lease per family.

**Effective state** (never trust `status` alone; expiry is computed, no cron needed):

- **Active coach lease** = `status = 'active' and (expires_at is null or expires_at > now())`
- **Pending request** = `status = 'requested' and request_expires_at > now()`

### 3.2 `profiles` additions

| Column | Type | Notes |
|--------|------|-------|
| `created_by_coach_id` | `uuid` null | Set when the family was created by a coach |
| `claimed_at` | `timestamptz` null | Set on first family sign-in for coach-created families. Self-signups: set at signup |

Backfill: `claimed_at = created_at` for all existing profiles.

### 3.3 Budget tables

Add `updated_by uuid` to `households`, `adults`, `children`, `categories`, `expense_items`. A `BEFORE INSERT OR UPDATE` trigger sets `NEW.updated_by = auth.uid()`. Clients cannot set it.

---

## 4. Enforcement (database)

### 4.1 Helper functions (`SECURITY DEFINER`, `search_path = public`)

- `coach_lease_active(p_user uuid) returns boolean` — any active coach lease for that family.
- `holds_coach_lease(p_user uuid) returns boolean` — active lease for that family where `coach_id = auth.uid()` and the caller is `is_admin`.

### 4.2 Write guard trigger

`enforce_budget_edit_lease()` — `BEFORE INSERT OR UPDATE OR DELETE` on all five budget tables. Uses `coalesce(NEW.user_id, OLD.user_id)` as the family.

| Caller | Condition | Result |
|--------|-----------|--------|
| `auth.uid() is null` (service role / ops) | — | Allow |
| `auth.uid() = family` | `coach_lease_active(family)` | Raise `BUDGET_LOCKED` (SQLSTATE `P0001`, message `BUDGET_LOCKED`) |
| `auth.uid() = family` | no active lease | Allow (RLS still applies) |
| Anyone else | `holds_coach_lease(family)` | Allow |
| Anyone else | otherwise | Raise `COACH_LEASE_REQUIRED` |

A trigger gives a named error. RLS alone would turn a blocked `UPDATE` into "0 rows", which the sync coordinator would misread as a version conflict.

On `UPDATE`, also reject changing `user_id`.

### 4.3 RLS

Family policies are unchanged (`FOR ALL`, `auth.uid() = user_id`). The trigger adds the lock.

Add coach write policies on each budget table, `FOR INSERT`, `FOR UPDATE`, `FOR DELETE`:

```sql
USING (public.holds_coach_lease(user_id))
WITH CHECK (public.holds_coach_lease(user_id))
```

Existing admin `SELECT` policies stay. Admins without a lease still cannot write.

`budget_edit_leases`: RLS on. `SELECT` for the family (`user_id = auth.uid()`) and for admins. **No** direct `INSERT/UPDATE/DELETE` for clients. All changes go through the RPCs below.

Existing parent-ownership triggers (`20260904_cloud_first_integrity.sql`) still apply to coach writes. The coach must write `user_id = family`.

### 4.4 RPCs (`SECURITY DEFINER`, each writes an `activity_log` row)

| Function | Caller | Rules |
|----------|--------|-------|
| `coach_start_setup(p_family uuid)` | admin | Family `claimed_at is null`; no open lease. Creates `mode=setup, status=active`. |
| `coach_request_assist(p_family uuid)` | admin | Family `claimed_at is not null`; no open lease (expired rows are closed first). Creates `mode=assist, status=requested`. |
| `family_respond_assist(p_lease uuid, p_accept boolean)` | family | Lease is the caller's, pending, not expired. Accept → `active`, `granted_at=now()`, `expires_at=now()+90 min`. Decline → `declined`. |
| `end_edit_lease(p_lease uuid)` | lease coach or family | Sets `ended`, `ended_by`, reason `coach_done` / `family_took_back` / `cancelled` (coach cancels a request). |
| `claim_family_budget()` | family | Sets `claimed_at` if null. Ends any open setup lease with reason `claimed`. Idempotent. |
| `get_my_edit_state()` | family | Returns `{ locked, lease_id, mode, coach_name, expires_at, pending_request }` using effective state. |

Before creating a lease, each RPC closes the family's stale rows (expired requests, expired active leases) so the unique index never blocks a new lease.

Activity events: `coach_family_created`, `coach_invite_sent`, `coach_setup_started`, `family_claimed`, `coach_assist_requested`, `coach_assist_accepted`, `coach_assist_declined`, `coach_lease_ended`.

### 4.5 Realtime

Add `budget_edit_leases` to the `supabase_realtime` publication (`supabase/realtime.sql`). Family app and admin subscribe filtered by `user_id`.

---

## 5. Creating a family and inviting (server)

The app has no server routes today. Coach-created accounts need the Supabase service role, which must never reach the browser.

New route handlers:

| Route | Action |
|-------|--------|
| `POST /api/admin/families` | Body `{ family_name, email }`. Verify caller's JWT and `is_admin`. `auth.admin.createUser({ email, email_confirm: true, user_metadata: { family_name, created_by_coach_id } })` with no password. The existing `handle_new_user` trigger creates the profile. Set `created_by_coach_id`, leave `claimed_at` null. Call `coach_start_setup`. Return `{ user_id }`. |
| `POST /api/admin/families/[id]/invite` | Verify admin; family unclaimed. Send the password-setup email via the Supabase recovery flow (`redirectTo = {APP_URL}/auth/set-password`). Log `coach_invite_sent`. Rate-limit: one per family per 60 s. |

- `lib/supabase-admin.ts` — server-only service-role client (`import 'server-only'`). Env: `SUPABASE_SERVICE_ROLE_KEY` (server only, Vercel encrypted). Add to `.env.example` without a value.
- Duplicate email → `409` **"That email already has an account."** No account merge in v1.
- Coach-created families skip the promo requirement. Attribution source is `coach`. They do not consume FOUNDING20 redemptions.
- Email template: the Supabase "Reset password" template is shared with real password resets. Word it neutrally ("Set your password for My Balanced Family Finances").
- **Prerequisite:** custom SMTP in Supabase. The default mailer is rate-limited and often lands in spam.

### 5.1 `/auth/set-password`

Shared with family password reset. Behaviour is defined in [`auth-flow.md`](./auth-flow.md) §5. Coach invite is journey B on that page: recovery session, new password (same rules as signup), then `/`. Sign-in triggers `claim_family_budget()` (§6.1).

---

## 6. Family app

### 6.1 Claim

In the auth bootstrap, after the owner is verified and before the first reconcile: if `profile.claimed_at` is null, call `claim_family_budget()`, then refresh the profile. Existing ownership rules apply. A guest/unowned Dexie cache is quarantined and never uploaded into a coach-created account.

### 6.2 Edit lock state

New `contexts/BudgetEditLockContext.tsx` + `hooks/use-budget-edit-lock.ts`:

- Source: `get_my_edit_state()` on bootstrap, on reconnect, and on every `budget_edit_leases` realtime event. Also re-check when a known `expires_at` passes.
- Exposes `{ locked, pendingRequest, coachName, expiresAt, accept(), decline(), takeBack() }`.
- **Offline while locked:** stay locked, even after `expires_at`. Show **"Reconnect to continue editing."** Unlock only after a successful server check **and** a completed cloud pull. The device must hold the coach's rows before it can edit again.

### 6.3 Enforcing the lock locally

- In `lib/sync.ts` `attachSyncWriteHooks`, the Dexie `creating` / `updating` / `deleting` hooks throw `BudgetLockedError` for budget tables while locked. No page can bypass it.
- Hooks must still allow writes from the sync pull itself (`runWithoutSyncOutbox`), so her rows can land in the cache.
- UI: budget inputs, add/delete buttons and item editors are disabled while locked. One banner across the family app:
  - Assist active: **"Niral is filling in your budget. You can watch changes appear. Editing returns when she's done."** + **Take back editing**
  - Setup cannot be seen by the family (they have not signed in).

### 6.4 Accepting a request

**Let Niral help** runs these checks first:

1. Online and owner verified.
2. `reconcileBudget('manual')` completes with state `SYNCED`.
3. `getPendingCount() === 0` and no operations in `FAILED` or `CONFLICT`.

If any check fails: **"We're still saving your changes. Try again in a moment."** Do not call the RPC. This prevents the family's older edits from uploading over hers later.

### 6.5 Sync coordinator

- A write rejected with `BUDGET_LOCKED` is a typed `LOCKED` outcome. The operation stays queued (not `FAILED`) and is retried after unlock. This covers another device of the same family that queued an edit just before the lock.
- After unlock, queued updates still carry their expected `updated_at`. If the coach changed that row, the update returns `CONFLICT` instead of overwriting (existing compare-and-swap contract).
- Lease end → `reconcileBudget('manual')` (pull first) → then unlock.

---

## 7. Admin (coach) app

### 7.1 Entry points

- **Users tab:** **Add family** (§5).
- **Family briefing** (`/admin/families/[id]`):
  - Unclaimed: **Edit budget** (starts/resumes setup lease), **Send invite** / **Resend invite**, status "Not signed in yet".
  - Claimed, no lease: **Ask to help**.
  - Request pending: "Waiting for [family] to accept…" + **Cancel**. Countdown to request expiry.
  - Assist active (mine): **Edit budget** + time remaining + **Done**.
  - Lease held by another admin: read-only notice.

### 7.2 Editor — `/admin/families/[id]/edit`

As built: one page with its own sticky header (mode, time remaining, **Done**) and Household / Adults / Children tabs. Each person or household card shows its categories and items inline, so there are no separate category routes.

Screens:

- Household: create/edit name, housing type, members.
- Adults / Children: add, rename, age, school level (same dropdown labels as the family app), delete.
- Categories (inline): per item cost, frequency, quantity, need/want; add/delete items; Miscellaneous percentage.
- A write that matches 0 rows is checked against the lease: lease gone means "session ended", lease still held means "changed elsewhere, reloaded".

Rules:

- Writes go through a new `lib/coach-budget-writer.ts`: Supabase only, no Dexie, `user_id = family`.
- New entity → create default categories and items from **shared templates** (§7.3) in one server call. Use an RPC `coach_create_entity(p_family, p_entity_type, p_fields jsonb)` that inserts the entity, categories and items in one transaction, so a half-created profile is never visible.
- Every update sends the row's expected `updated_at`. On mismatch, show **"This changed since you opened it"** and reload the row.
- Totals use the same functions as the family app (`calculateAnnualCost`, misc percentage) from `lib/budget-calculations` / `lib/consultation-totals.ts`.
- `BUDGET_LOCKED` never applies to the coach. `COACH_LEASE_REQUIRED` means the lease ended: switch the editor to read-only with the reason (Done / family took back / expired / family signed in).
- Realtime on the family's budget rows keeps the editor current (consultation already does this).

### 7.3 Shared templates

Move `defaultCategories`, `defaultAdultCategories`, `defaultHouseholdCategories` out of `lib/db.ts` into `lib/budget-templates.ts` (pure data, no Dexie).

- `lib/db.ts` `initialize*Data` imports them. No behaviour change for the family app.
- `coach_create_entity` receives the template as `jsonb` from the writer, so the database does not hold a second copy.

---

## 8. Failure cases

| Case | Behaviour |
|------|-----------|
| Family phone offline when she asks | Request waits up to 15 min, then expires. She asks again later. |
| Family phone goes offline during assist | Phone stays locked. On reconnect: check state, pull, then unlock if the lease has ended. |
| Coach closes the tab without Done | Assist expires at 90 min. Setup stays open until claim or Stop editing (no family is writing). |
| Family takes back mid-save | Her in-flight write gets `COACH_LEASE_REQUIRED`. Editor goes read-only. Earlier saves remain. |
| Family has two devices | The lock applies to every device (DB trigger + realtime). A queued edit on the second device gets `LOCKED` and waits. |
| Two admins | Only the lease holder writes. Others see a notice. |
| Coach has two tabs | Both hold the lease. Compare-and-swap on `updated_at` stops silent overwrites. |
| Client claims during setup | Setup lease ends. Coach editor goes read-only with "family signed in". |
| Invite email not received | **Resend invite**. Check SMTP / spam (see §5 prerequisite). |

---

## 9. Files

| File | Action |
|------|--------|
| `docs/specs/coach-editing.md` | This spec |
| `docs/specs/admin-consultation-view.md` | Note: read-only unless a coach lease is held (link here) |
| `docs/specs/admin-panel.md` | Note: admin write only under a coach lease |
| `docs/specs/README.md` | Index |
| `supabase/migrations/20261001_coach_edit_lease.sql` | Table, columns, triggers, policies, RPCs, backfill |
| `supabase/schema.sql` | Mirror |
| `supabase/realtime.sql` | Add `budget_edit_leases` |
| `lib/supabase-admin.ts` | Server-only service-role client |
| `app/api/admin/families/route.ts` | Create family |
| `app/api/admin/families/[id]/invite/route.ts` | Send invite |
| `app/auth/set-password/page.tsx` | Password setup |
| `lib/budget-templates.ts` | Shared templates |
| `lib/db.ts` | Import templates |
| `lib/coach-budget-writer.ts` | Coach Supabase writes |
| `lib/sync.ts` | `BudgetLockedError` hooks, `LOCKED` outcome, pull-before-unlock |
| `contexts/BudgetEditLockContext.tsx`, `hooks/use-budget-edit-lock.ts` | Family lock state |
| `components/budget-edit-lock-banner.tsx` | Request + locked banners |
| Family budget pages/components | Disable inputs while locked |
| `app/admin/page.tsx` (Users tab) | Add family |
| `app/admin/families/[id]/page.tsx` | Lease controls |
| `app/admin/families/[id]/edit/**` | Coach editor |
| `types/database.ts` | Lease + profile fields |
| `.env.example` | `SUPABASE_SERVICE_ROLE_KEY=` |
| `e2e/coach-editing/*.spec.ts` | Two-context tests |

---

## 9.1 Rollback

If families cannot save after the migration, run [`supabase/diagnostics/20261001_coach_edit_lease_rollback.sql`](../../supabase/diagnostics/20261001_coach_edit_lease_rollback.sql) in the SQL Editor. That drops the write guard, lease RPCs, and `budget_edit_leases`. Family budget rows stay. The `is_admin` self-update protection stays. Revert the Vercel deploy if you also want the admin UI gone.

---

## 10. Verification

Database (run against Preview with real JWTs, not service role):

- [ ] Admin with no lease: insert/update/delete on any family budget table fails `COACH_LEASE_REQUIRED`
- [ ] Coach with active lease can write only that family, only with `user_id = family`
- [ ] Family write during active lease fails `BUDGET_LOCKED`; family `SELECT` still works
- [ ] After `expires_at`, coach writes fail and family writes succeed with no cron
- [ ] Second open lease for the same family is rejected
- [ ] Clients cannot insert/update `budget_edit_leases` directly
- [ ] `updated_by` equals the real writer; clients cannot spoof it
- [ ] `claim_family_budget()` is idempotent and ends the setup lease

End-to-end (two browser contexts):

- [ ] Setup: create family → fill a child with costs → invite → set password → family sees identical rows and totals to consultation
- [ ] Claim while coach editing → coach's next save rejected with the "signed in" message; earlier saves present
- [ ] Assist: request → family accepts → family inputs disabled → coach edits appear live on family → Done → family can edit
- [ ] Family **Take back editing** → coach editor goes read-only within one realtime event
- [ ] Accept blocked while family has a pending outbox item
- [ ] Second family device with a queued edit during lock → `LOCKED`, retried after unlock; if the coach touched that row → `CONFLICT`, no overwrite
- [ ] Family offline through expiry → stays locked → reconnect → pulls coach rows → unlocks
- [ ] Coach-created entity has the same categories/items as one created in the family app
- [ ] Service-role key absent from the client bundle (`next build` output grep)
- [ ] `npm run build` succeeds

---

## 11. Implementation order

1. Migration: table, columns, helpers, trigger, policies, RPCs. Run the database checks in Preview.
2. Shared templates extraction (no behaviour change). Ship alone.
3. Family lock: context, Dexie hooks, `LOCKED` outcome, banner, accept checks. Assist can be tested with RPCs from SQL.
4. Admin assist UI + editor + `coach_create_entity`.
5. Server routes, set-password page, claim. Configure SMTP first.
6. Admin setup UI (Add family, Send invite).
7. E2E matrix in Preview, canary with Niral on a test family, then production.
