# Cross-Device Sync Fix Specification

**Status:** Cloud-first implementation contract
**Priority:** P0  
**Dependencies:** [`sync-layer.md`](./sync-layer.md), [`balance-intention-sync.md`](./balance-intention-sync.md), [`data-migration.md`](./data-migration.md)  
**Related:** [`balance-home.md`](./balance-home.md)

---

## Overview

Same login on two devices must show the same family members and the same Balance intention. Client reports (Niral, Aug 2026) were **two production bugs**, not a login failure:

1. **Adults appear on the other device; children and household often do not.**
2. **Balance intention is blank after re-login / on a second device.**

This spec is the contract for the fix. Multi-select goals and Dashboard mobile charts are **out of scope**.

---

## 1. Product rules

| Rule | Behaviour |
|------|-----------|
| Same account, two devices | After online sync, Adults, Children, Household (and their categories/items) match. |
| Intention survives re-login | Logged-in **Set your intention** writes `profiles`; a new device hydrates from the profile. |
| Dexie is a cache | IndexedDB is this-browser only. Cloud is source of truth when logged in. |
| Preserve UI labels | Push the family-app dropdown strings. If Postgres CHECK rejects them, retry with short enums. Pull reverse-maps enums back to UI labels. |
| Owner before sync | No local budget row is pushed until the IndexedDB cache is associated with the authenticated user. |
| Cloud is authoritative | For an authenticated user, Supabase is authoritative. Dexie is an owner-scoped cached snapshot and durable offline outbox only. |
| Trigger-aware coordination | Login, manual sync, retry, reconnect, realtime, and local writes use one serialized coordinator with trigger-specific phases. |
| Cloud snapshot | Bootstrap/reconnect pulls all cloud budget tables before any queued write; realtime invalidates and pulls only. |
| Lists refresh after sync | A successful local reconciliation publishes one data revision; pages do not infer data changes from spinner state. |
| Failed rows retry on next login | `fullSync` resets `FAILED` → `PENDING` so previously rejected children/households retry after this fix. |
| Failed rows cannot block pull | Exhausted or invalid rows remain visible as failures, but cloud hydration continues. |
| Deletes propagate | Local deletes create account-scoped tombstones and are applied to Supabase bottom-up. |
| Offline conflicts | A queued mutation carries the version it was based on. The server rejects stale versions; the client must not silently overwrite newer cloud data. |
| Single goal | Balance goals stay **one choice**. Not a sync bug. |

### 1.1 Out of scope

- Multi-select Balance goals
- Dashboard chart axis polish (flicker from full-page reload on sync **is** in scope — §2.7)
- SMTP / email
- Admin editing intention

---

## 2. Bug 1 — children and household never reach the other device

### 2.1 Cause

Adults push `name` + `age` (no string CHECK). Children and households push **product dropdown strings** that some production CHECKs reject (`23514`). The row stays `FAILED` locally. The other device’s pull never sees it.

| Field | UI (IndexedDB) | Strict cloud CHECK (if present) |
|-------|----------------|----------------------------------|
| `school_level` | `Preschool`, `Primary School`, `Secondary School`, `High School`, `University` | `preschool`, `primary`, `secondary`, `university`, `other` |
| `housing_type` | `House - Owned`, `House - Rented`, `Apartment - Owned`, `Apartment - Rented`, `Townhouse - Owned`, `Townhouse - Rented`, `Other` | `rent`, `own`, `other` |
| `frequency` | `weekly`, `fortnightly`, `monthly`, `quarterly`, `term`, `annual`, `bi-monthly` | Some dumps omit `fortnightly` or `bi-monthly` |

### 2.2 Amplifiers

1. **`fullSync` skipped pull** when every local push failed. Leftover guest rows on a phone could block cloud data entirely.
2. **List pages loaded Dexie once on mount.** Opening Children/Household while pull was still running left an empty list until a manual refresh.

### 2.3 Push behaviour

1. Map local → cloud with the **original UI string** for `school_level` / `housing_type`.
2. Insert or update.
3. On CHECK failure (`23514` / “violates check”), retry with `withCloudSafeFields`:
   - school: `Primary School` → `primary`, `High School` → `secondary`, unknown → `other`
   - housing: contains `rent` → `rent`, contains `own` → `own`, else `other`
   - frequency: known values pass through; unknown → `annual`
4. On households unique violation (`user_id`), attach the existing cloud household id and update it.
5. Signup import (`lib/migration.ts`) uses the same CHECK-safe mappers.

### 2.4 Pull behaviour

- If the cloud value is already a UI label (e.g. contains ` - `), keep it.
- If it is a short enum, reverse-map (`primary` → `Primary School`, `own` → `House - Owned`).
- Enum rows synced **before** this fix may show a simpler housing label (`House - Owned` instead of `Apartment - Owned`). Expected.

### 2.5 Login / UI

- Resolve the authenticated owner before reading or writing the budget cache.
- New/changed owner: quarantine unowned rows, clear the visible cache, then pull cloud before rendering family data.
- Same owner online: hydrate cloud before sending queued mutations, then refetch after successful writes.
- Same owner offline with a previously hydrated cache: render that cache immediately and leave mutations queued.
- `useReloadOnSync` reacts to a **data revision**, not intermediate `SYNCING` transitions.
- Dashboard, Planning, and Summary must **not** blank the page on background refresh. First visit may still show a loader.

### 2.6 Database (ops)

Run `supabase/migrations/20260901_sync_constraint_relax.sql` on the **production** project:

- Re-assert intention columns on `profiles`
- Drop school/housing CHECKs so original UI strings store
- Allow both `bi-monthly` and `fortnightly` on `expense_items`
- `NOTIFY pgrst, 'reload schema'`

Until this runs, CHECK retry (2.3) still lets children/households sync as short enums.

Also run:

- `20260904_sync_coordinator_contract.sql` for server-maintained `updated_at`
  versions used by compare-and-swap writes.
- `20260904_cloud_first_integrity.sql` for explicit RLS `WITH CHECK` ownership
  and server-enforced category/item parent ownership.

### 2.7 Dashboard flicker (customer app)

Login `fullSync` is push then pull. Each cycle used to blank Dashboard and unmount Recharts (donut appears and disappears). Admin does not use Dexie, so admin does not flicker.

---

## 2.8 Account ownership and legacy recovery

Dexie is one database per browser. The database therefore stores an `ownerUserId`.

1. **Empty cache, no owner:** bind it to the signed-in user and hydrate cloud.
2. **Known matching owner:** reconcile normally.
3. **Known different owner:** quarantine the old cache, clear visible budget rows/outbox, bind the new owner, then hydrate cloud. Never upload old rows to the new user.
4. **Legacy cache, no owner:** quarantine it and require an online cloud hydrate. Never infer ownership from partial ID overlap and never automatically upload it.
5. Quarantined data is never displayed or uploaded while another user owns the cache.
6. Restoring quarantined data is a supervised, dry-runnable, idempotent support operation. It is not an in-app bulk-upload button.

The signup migration prompt remains the normal guest → new-account path.

## 2.9 Cloud-first coordination sequence

`reconcileBudget(trigger)` is serialized. One cycle has one start and one terminal state.

1. Verify owner.
2. If offline and the stored owner matches a previously hydrated cache, render the cache, keep the outbox pending, and stop.
3. For login, reconnect, and manual refresh, pull a cloud snapshot **before** processing queued mutations.
4. For realtime events, pull only. A remote event must never trigger an outbound write.
5. For an explicit local write or retry, process only owner-scoped queued mutations.
6. Process DELETE mutations bottom-up: items → categories → entities.
7. Process create/update mutations top-down: entities → categories → items.
8. Every mutation has a stable client operation ID and expected server version. Replaying it is idempotent; a stale version returns a conflict instead of overwriting cloud state.
9. Missing parent identity is a typed dependency failure, not a silent skip.
10. Pull households, adults, children, categories, and expense items for `auth.uid()` and validate all parent links.
11. In one Dexie transaction:
   - upsert cloud rows;
   - remove stale **synced** local rows absent from the cloud snapshot, bottom-up;
   - retain unresolved outbox operations separately from the cached snapshot.
12. Publish one `dataRevision`.
13. Terminal state is `SYNCED`, `PENDING`, `FAILED`, or `CONFLICT` with per-operation reasons.

Cloud hydration always runs even when one queued mutation fails. Permanently failed operations do not block reads.

## 2.10 Triggers and observability

All triggers call the same coordinator:

| Trigger | Required mode |
|---|---|
| Login | owner check + cloud pull → queued writes → cloud refetch |
| Manual cloud button | cloud pull → queued writes → cloud refetch |
| Retry | cloud pull → retry eligible operations → cloud refetch |
| Browser online | cloud pull → queued writes → cloud refetch |
| Realtime event | coalesced cloud pull only |
| Local write | online cloud write first; otherwise durable outbox operation |

Each development cycle logs: cycle id, trigger, owner id suffix, per-table pushed/pulled/deleted/skipped/failed counts, duration, and final state. Logs must not contain names, email, costs, or access tokens.

---

## 3. Bug 2 — Balance intention blank on re-login

### 3.1 Cause

Intention is **not** in `lib/sync.ts`. It is `profiles.balance_goal` / `yearly_savings_goal` / `monthly_buffer`. Dexie `settings` is a **same-browser cache** (Safari/iOS may evict IndexedDB).

Blank on a second device means the **cloud write did not stick**, or hydrate never ran:

| Check | Why |
|-------|-----|
| Columns missing | Migration not applied |
| PostgREST cache stale | After `ALTER TABLE`, API still 404s the column until `NOTIFY pgrst` |
| User never clicked **Set your intention** | Form does not auto-save |
| `updateProfile` used `.single()` | Zero-row UPDATE looked like total failure |
| Profile fetch error set `profile` to `null` | Wiped in-memory hydrate; fallback is Dexie on this device only |

If admin consultation is also empty for that family, the Supabase profile row is empty — not a UI-only bug.

### 3.2 Save (logged in)

Unchanged contract from [`balance-intention-sync.md`](./balance-intention-sync.md), plus:

1. Dual-write Dexie then `updateProfile` (no `.single()` — treat empty `select()` as error with a clear message).
2. On cloud error: show error; do **not** claim fully synced. Local cache may still update.
3. Catch unexpected throws and show error.
4. `refreshProfile()` only replaces profile when fetch returns a row — **never** set `profile` to `null` on a fetch error while still signed in.

### 3.3 Load (logged in)

1. If `profile` has any intention field → use it and mirror Dexie.
2. Else fall back to Dexie (legacy / this-browser cache).
3. Guest: React state only.

Do **not** auto write-through Dexie → profile on load. Settings are not account-scoped; that could copy another person’s cache onto a new login. User taps **Set your intention** after deploy if cloud was empty.

---

## 4. Files

| File | Action |
|------|--------|
| `docs/specs/cross-device-sync-fix.md` | This spec |
| `docs/specs/sync-layer.md` | Point §11 at this spec |
| `docs/specs/balance-intention-sync.md` | Point §8 at this spec |
| `docs/specs/README.md` | Index |
| `lib/sync-field-map.ts` | UI ↔ CHECK mappers, CHECK/unique helpers |
| `lib/sync.ts` | Original-string push, CHECK retry, household unique attach, always-pull |
| `lib/migration.ts` | Same school/housing mappers on signup import |
| `hooks/use-reload-on-sync.ts` | Reload lists when sync cycle ends |
| `app/{adults,children,household,...}/page.tsx` | `useReloadOnSync` |
| `lib/supabase.ts` | `updateProfile` without `.single()` |
| `contexts/AuthContext.tsx` | Do not wipe profile on fetch error |
| `app/page.tsx` | Dual-write + hydrate + save errors |
| `supabase/migrations/20260901_sync_constraint_relax.sql` | Ops SQL |
| `supabase/migrations/20260904_sync_coordinator_contract.sql` | Server row versions |
| `supabase/migrations/20260904_cloud_first_integrity.sql` | Parent ownership + write RLS |
| `scripts/verify-sync-field-map.mjs` | Static checks |
| `scripts/verify-cross-device-sync-fix.mjs` | Spec + wiring checks |
| `scripts/verify-balance-intention-sync.mjs` | Existing intention checks |

---

## 5. Verification checklist

- [ ] `node scripts/verify-cross-device-sync-fix.mjs` passes
- [ ] `node scripts/verify-sync-field-map.mjs` passes
- [ ] `node scripts/verify-balance-intention-sync.mjs` passes
- [ ] `node scripts/test-sync-policy.mjs` passes
- [ ] Automated clean-device test: desktop create → phone hydrate
- [ ] Automated reverse update: phone edit → desktop refresh
- [ ] Failed child/category does not block unrelated cloud pull
- [ ] Same-browser account switch displays no previous-family data
- [ ] Delete on one device disappears on the other
- [ ] Replaying each outbox operation three times produces one cloud effect
- [ ] A stale expected version returns `CONFLICT` and cannot overwrite the newer cloud row
- [ ] Missing parent produces a visible typed failure
- [ ] Realtime performs no inserts, updates, or deletes and increments one data revision after pull
- [ ] Matching-owner cache opens after an offline reload without an ownership spinner
- [ ] Legacy unowned data is quarantined and cannot be automatically uploaded
- [ ] Dashboard, Planning, and Summary charts stay mounted during sync
- [ ] Balance intention hydrates on a clean second device
- [ ] `npm run build` succeeds
- [ ] `20260901_sync_constraint_relax.sql` run on production
- [ ] Source device (already filled in) opened online after deploy; failed rows retry
- [ ] Other device refresh shows children + household
- [ ] **Set your intention** shows Saved (no red error); second device / re-login shows the goal
- [ ] Admin consultation shows intention when the profile row is populated

### 5.1 Ops SQL (confirm Niral’s user after deploy)

```sql
select id, email, balance_goal, yearly_savings_goal, monthly_buffer
from profiles where email = '<niral-email>';

select id, name, age from adults where user_id = '<profile-id>';
select id, name, age, school_level from children where user_id = '<profile-id>';
select id, name, housing_type, members from households where user_id = '<profile-id>';
```

---

## 6. Implementation order

1. Lock this cloud-first contract and make `supabase/schema.sql` canonical.
2. Stabilize ownership: matching caches open offline; unowned caches quarantine.
3. Make login/reconnect/manual pull-first and realtime pull-only.
4. Add stable client UUIDs and expected-`updated_at` compare-and-swap writes.
5. Enforce parent ownership and write ownership in PostgreSQL.
6. Put customer reads/writes behind a typed budget repository, then migrate
   routes incrementally from direct Dexie access.
7. Replace source-string checks with two-context integration tests.
8. Apply migrations in Preview, run the acceptance matrix, canary Niral plus
   one internal account, then deploy broadly.

---

## 7. Client retry (after deploy)

After the cloud-first release, first verify the cloud backup and row counts.
Open the account online on one device, wait for the cloud hydrate, then open
the second device. Do not use an automatic “device data” import; legacy recovery
must be supervised and idempotent. Tap **Set your intention** once and confirm
Saved.

Draft:

> Adults were saving to the cloud, but children and household were rejected because the app labels (e.g. “Primary School”, “House - Owned”) did not match what the database allowed. Balance goals save to your profile — please tap **Set your intention** once after the update.
>
> Goals are still one choice at a time. Dashboard charts on mobile are a separate piece of work.
