# Balance Intention Sync Specification

**Status:** Implemented in app — run `supabase/migrations/20260830_balance_intention.sql` on the Supabase project before testers rely on admin visibility.  
**Priority:** P0  
**Dependencies:** [`balance-home.md`](./balance-home.md), Auth profile, admin consultation  
**Related:** [`admin-consultation-view.md`](./admin-consultation-view.md) (read-only), [`supabase-schema.sql`](./supabase-schema.sql)

---

## Overview

Balance intention fields (yearly goal, savings amounts) must be stored in **Supabase `profiles`** so:

1. The signed-in family keeps them across devices  
2. Admin consultation can **read** them while testing / advising  

Dexie `settings` remains a **local cache**. Profiles columns are the **cloud source of truth** when logged in. This does **not** go through `lib/sync.ts` (profiles are already outside that pipeline).

---

## 1. Product rules

| Rule | Behaviour |
|------|-----------|
| Cloud columns on `profiles` | `balance_goal`, `yearly_savings_goal`, `monthly_buffer` (nullable TEXT) |
| Family can update own profile | Existing RLS — no new policies |
| Admin read-only | Existing “Admins can view all profiles” — no admin UPDATE |
| Dual-write on save | Logged-in **Set your intention** → Dexie cache + `updateProfile` |
| Hydrate on load | Prefer profile values; mirror into Dexie settings |
| Consultation display | Read-only intention block from `data.profile` |
| No Start Planning change | Unchanged from balance-home spec |

### 1.1 Out of scope

- Syncing via `lib/sync.ts` / Dexie sync queue  
- New tables  
- Admin editing goals  
- SMTP / email  

---

## 2. Schema

```sql
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS balance_goal TEXT,
  ADD COLUMN IF NOT EXISTS yearly_savings_goal TEXT,
  ADD COLUMN IF NOT EXISTS monthly_buffer TEXT;
```

| Column | Dexie settings key | UI |
|--------|-------------------|-----|
| `balance_goal` | `balanceGoal` | Preset or custom goal text |
| `yearly_savings_goal` | `yearlySavingsGoal` | Optional amount string |
| `monthly_buffer` | `monthlyBuffer` | Optional amount string |

Empty optional amounts may be stored as `''` or null; prefer `''` from the form for simplicity.

Ops: run migration SQL in Supabase SQL Editor on the **production** project before testers rely on admin visibility.

---

## 3. Family app behaviour

### 3.1 Save (logged in)

1. Resolve goal (same as balance-home)  
2. `db.settings.put` for the three keys (cache)  
3. `updateProfile(userId, { balance_goal, yearly_savings_goal, monthly_buffer })`  
4. `refreshProfile()`  
5. On cloud error: show error; do not claim fully synced (local cache may still update)  

### 3.2 Load (logged in)

1. If `profile` has any intention field set → use profile and write through to Dexie  
2. Else fall back to Dexie settings (legacy local-only saves)  
3. Guest: React state only (unchanged)

### 3.3 Guest

Unchanged: no cloud write; Set intention → signup.

---

## 4. Admin consultation

- Source: `FamilyBudget.profile` (already `select('*')`)  
- Show a compact **Intention** read-only summary when any field is non-empty:
  - Goal text  
  - Yearly savings (if present)  
  - Monthly buffer (if present)  
- Placement: consultation banner (primary) and family briefing page (secondary)  
- Empty state: omit block or show “No intention set yet”

---

## 5. Files

| File | Action |
|------|--------|
| `docs/specs/balance-intention-sync.md` | This spec |
| `docs/specs/balance-home.md` | Point sync to this spec |
| `docs/specs/README.md` | Index |
| `docs/specs/supabase-schema.sql` | Columns on profiles |
| `supabase/migrations/20260830_balance_intention.sql` | Runnable migration |
| `types/database.ts` | Profile fields |
| `lib/supabase.ts` | `updateProfile` accepts intention fields |
| `lib/balance-home.ts` | Cloud field mapping helpers |
| `app/page.tsx` | Dual-write + hydrate from profile |
| `app/admin/.../consultation-banner.tsx` | Read-only intention |
| `app/admin/families/[id]/page.tsx` | Briefing intention card |
| `scripts/verify-balance-intention-sync.mjs` | Static checks |

---

## 6. Verification checklist

- [ ] Migration applied on target Supabase project  
- [ ] Logged-in save writes profile columns  
- [ ] Reload / other browser with same account shows goal  
- [ ] Admin consultation shows goal for that family  
- [ ] Guest still cannot write cloud  
- [ ] Admin cannot edit intention in UI  
- [ ] `node scripts/verify-balance-intention-sync.mjs` passes  

---

## 7. Implementation order

1. Spec + schema + types  
2. `updateProfile` + Balance page dual-write/hydrate  
3. Consultation + briefing UI  
4. Verify script  
5. Run migration on Supabase, then manual E2E  
