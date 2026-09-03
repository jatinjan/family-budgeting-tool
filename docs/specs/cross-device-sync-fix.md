# Cross-Device Sync Fix Specification

**Status:** Ready for implementation  
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
| Login always pulls | `fullSync` is push then pull even when some local rows fail. |
| Lists refresh after sync | Family list pages re-read Dexie when a sync cycle finishes. |
| Failed rows retry on next login | `fullSync` resets `FAILED` → `PENDING` so previously rejected children/households retry after this fix. |
| Single goal | Balance goals stay **one choice**. Not a sync bug. |

### 1.1 Out of scope

- Multi-select Balance goals
- Dashboard chart axis polish
- Scoping IndexedDB by `user_id` / clearing on account switch (follow-up)
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

- `fullSync`: reset `FAILED` → `PENDING`, **push then always pull**.
- `useReloadOnSync` on Adults, Children, Household, category screens, Dashboard, Planning, Summary: re-run the page loader when `SYNCING` ends.

### 2.6 Database (ops)

Run `supabase/migrations/20260901_sync_constraint_relax.sql` on the **production** project:

- Re-assert intention columns on `profiles`
- Drop school/housing CHECKs so original UI strings store
- Allow both `bi-monthly` and `fortnightly` on `expense_items`
- `NOTIFY pgrst, 'reload schema'`

Until this runs, CHECK retry (2.3) still lets children/households sync as short enums.

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
| `scripts/verify-sync-field-map.mjs` | Static checks |
| `scripts/verify-cross-device-sync-fix.mjs` | Spec + wiring checks |
| `scripts/verify-balance-intention-sync.mjs` | Existing intention checks |

---

## 5. Verification checklist

- [ ] `node scripts/verify-cross-device-sync-fix.mjs` passes
- [ ] `node scripts/verify-sync-field-map.mjs` passes
- [ ] `node scripts/verify-balance-intention-sync.mjs` passes
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

1. Spec + index README
2. Field map + sync push/pull + always-pull + list reload
3. Intention save/hydrate harden
4. Constraint-relax migration file
5. Verify scripts + build
6. Run SQL on production, deploy, then client retry on the **source** device

---

## 7. Client retry (after deploy)

Open the app **on the device that already has the data**, stay online until sync is not failed, then refresh the other device. Tap **Set your intention** once and confirm Saved.

Draft:

> Adults were saving to the cloud, but children and household were rejected because the app labels (e.g. “Primary School”, “House - Owned”) did not match what the database allowed. Balance goals save to your profile — please tap **Set your intention** once after the update.
>
> Goals are still one choice at a time. Dashboard charts on mobile are a separate piece of work.
