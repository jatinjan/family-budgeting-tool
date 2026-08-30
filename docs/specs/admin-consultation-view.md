# Admin Consultation View Specification

**Status:** Ready for implementation  
**Priority:** P0  
**Dependencies:** Admin panel, Auth flow, Supabase schema, Protected routes, Budget calculations  
**Related:** [`admin-panel.md`](./admin-panel.md) (family briefing), [`budget-calculations.md`](./budget-calculations.md)

---

## Overview

When an admin signs in to the backend, they must be able to open any family and see the **same information** that family sees in the app — including data they are still entering. This is for live consultation (workshops, coaching calls). The feature is always on. Incomplete budgets stay visible.

This is **not** impersonation. The admin stays signed in as admin. Data is loaded from Supabase with existing admin SELECT policies. The admin cannot create, update, or delete family budget rows (FR-07).

The existing family briefing at `/admin/families/[id]` stays. Consultation is a second surface opened from that page.

---

## 1. Product Rules

| Rule | v1 behaviour |
|------|----------------|
| Always on | No feature flag. Every family is openable, including `signed_up` with no budget. |
| Show drafts | Empty categories render as "not started". Do not hide incomplete data. |
| Same information | Same sections, entities, items, and totals the family sees. |
| Read-only | No inputs that write family data. No save/edit/delete actions. |
| No impersonation | `auth.uid()` remains the admin. Do not sign in as the family. Do not load IndexedDB. |
| Stale-if-offline | Admin sees last synced cloud state. Offline-only device edits appear after the family reconnects. |
| Live updates | Consultation subscribes to Supabase Realtime for that family's rows and reloads silently. Refresh stays as a fallback. |

### 1.1 Out of scope (v1.1+)

- Coach notes on a family
- Audit log of who viewed whom
- CSV export from admin
- Disabled clones of customer write forms
- Bidirectional `BudgetRepository` or rewriting customer pages to be dual-mode
- Feature flag to hide incomplete families

---

## 2. User Flow

```
Admin signs in → /admin → Users tab → click family
  → /admin/families/[id]          (existing briefing — keep)
  → "Open consultation"
  → /admin/families/[id]/view/dashboard
  → navigate Children / Adults / Household / Planning / Summary
  → Totals and lists update live as the family syncs
  → Refresh remains as a fallback
  → "Back to briefing" returns to /admin/families/[id]
```

Job to be done: run a consult without asking the family to screenshare.

---

## 3. Routes

All routes below are admin-only. Existing middleware already treats any `/admin/*` path except `/admin/login` as an admin route. No middleware matcher change is required.

| Route | Purpose |
|-------|---------|
| `/admin/families/[id]` | Existing briefing (overview + CTA) |
| `/admin/families/[id]/view` | Redirect to `.../view/dashboard` |
| `/admin/families/[id]/view/dashboard` | Same totals and charts as family dashboard |
| `/admin/families/[id]/view/children` | Children profile (display) |
| `/admin/families/[id]/view/children/categories` | Child category + item breakdown |
| `/admin/families/[id]/view/adults` | Adults profile (display) |
| `/admin/families/[id]/view/adults/categories` | Adult category + item breakdown |
| `/admin/families/[id]/view/household` | Household profile (display) |
| `/admin/families/[id]/view/household/categories` | Household category + item breakdown |
| `/admin/families/[id]/view/planning` | Need/want + forward plan (display) |
| `/admin/families/[id]/view/summary` | Current vs plan vs savings (display) |

`[id]` is the family's `profiles.id` (auth user id).

---

## 4. Consultation Shell

### 4.1 Layout

```
app/admin/families/[id]/view/layout.tsx
```

Wraps every consultation screen. Responsibilities:

1. Confirm the signed-in user is admin (existing admin session is enough; middleware already gates `/admin`).
2. Load family budget via `useFamilyBudget(id)`.
3. Provide that data to child screens through `ConsultationContext`.
4. Render the consultation banner and consultation nav.
5. Hide the customer `BottomNav` (already hidden for `/admin/*` in `AppShell`).

### 4.2 Banner

Always visible at the top of consultation screens:

| Element | Source |
|---------|--------|
| Label | `Viewing [family_name or email] — Consultation (read-only)` |
| Status badge | `onboarding_status` (same badges as users tab) |
| Last updated | Relative time from `max(updated_at)` across households, categories, and expense items. If none, use `profiles.last_active_at`. |
| Live | Green pulse when the Realtime channel is subscribed. |
| Refresh | Button. Calls `refresh()` on the query hook. Disabled while loading. Fallback if Realtime is off. |
| Back | Link to `/admin/families/[id]` |
| Intention | Read-only Balance goal / savings from `profiles` when set — see [`balance-intention-sync.md`](./balance-intention-sync.md) |

Banner copy must make it obvious this is not the admin's own budget.

### 4.3 Consultation nav

Mirror the family app information architecture from [`app-navigation.md`](./app-navigation.md) (not the marketing Balance tab). Balance is omitted in consultation.

| Label | Behaviour |
|-------|-----------|
| Family | Group: Household → `.../view/household`, Children → `.../view/children`, Adults → `.../view/adults` (active also on each `.../categories` path) |
| Dashboard | `.../view/dashboard` |
| Planning | `.../view/planning` |
| Summary | `.../view/summary` |

Shared labels and family child order come from `lib/app-nav.ts`. Consultation remains a horizontal top-style nav for the admin workspace.

From a profile screen, a secondary control opens that entity's categories (same relationship as `/children` → `/categories` in the family app).

---

## 5. Read-Only Query Hook

Customer pages keep talking to IndexedDB. Consultation does **not** change that. Admin gets a read-only hook only.

### 5.1 API

```typescript
// hooks/use-family-budget.ts

interface FamilyBudget {
  profile: Profile
  household: Household | null
  children: Child[]
  adults: Adult[]
  categories: Category[]
  expenseItems: ExpenseItem[]
  lastUpdatedAt: string | null
}

interface UseFamilyBudgetResult {
  data: FamilyBudget | null
  loading: boolean
  error: string | null
  refresh: () => Promise<void>
}

function useFamilyBudget(userId: string): UseFamilyBudgetResult
```

No `save`, `update`, `create`, or `delete` methods. If a future screen needs a write, it does not belong in this hook.

### 5.2 Query

```typescript
async function fetchFamilyBudget(userId: string): Promise<FamilyBudget> {
  const [
    profileResult,
    householdResult,
    childrenResult,
    adultsResult,
    categoriesResult,
    itemsResult,
  ] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', userId).single(),
    supabase.from('households').select('*').eq('user_id', userId).maybeSingle(),
    supabase.from('children').select('*').eq('user_id', userId).order('name'),
    supabase.from('adults').select('*').eq('user_id', userId).order('name'),
    supabase.from('categories').select('*').eq('user_id', userId).order('sort_order'),
    supabase.from('expense_items').select('*').eq('user_id', userId),
  ]);

  if (profileResult.error || !profileResult.data) {
    throw new Error('Family not found');
  }

  const timestamps = [
    householdResult.data?.updated_at,
    ...((itemsResult.data || []).map(item => item.updated_at)),
  ].filter(Boolean) as string[];

  return {
    profile: profileResult.data,
    household: householdResult.data || null,
    children: childrenResult.data || [],
    adults: adultsResult.data || [],
    categories: categoriesResult.data || [],
    expenseItems: itemsResult.data || [],
    lastUpdatedAt: timestamps.sort().at(-1) || profileResult.data.last_active_at,
  };
}
```

Reuse the same tables and RLS as the family briefing page. Do not add new tables.

### 5.3 Context

```typescript
// contexts/ConsultationContext.tsx

interface ConsultationContextValue extends UseFamilyBudgetResult {
  userId: string
}

// Provided by view/layout.tsx
// Child screens call useConsultation() and must not query Supabase themselves
```

---

## 6. Calculations (must match the family app)

All totals use [`budget-calculations.md`](./budget-calculations.md) and `lib/utils/calculations.ts`.

| Value | Rule |
|-------|------|
| Item annual | `calculateAnnualTotal(cost, frequency, quantity)` or stored `expense_items.total` if already annualised |
| Category annual | Sum of item annuals. Percentage-based Miscellaneous uses `calculateMiscellaneousTotal` |
| Entity annual | Sum of that entity's categories |
| Family annual | Children + adults + household |
| Fortnightly | `Math.round(familyAnnual / 26)` |
| Planning current | Item `total` (current situation) |
| Planning forward | `adjusted_total ?? total` on forward-planning categories; needs only on need/want categories |
| Potential savings | Current − forward |

### 6.1 Shared planning constants

Which categories use Current/Forward vs Need/Want is defined in [`planning-sheet.md`](./planning-sheet.md). Consultation imports `lib/planning-categories.ts`. Do not duplicate the name lists here.

---

## 7. Screens

Consultation screens are **display views**. They consume `useConsultation()`. They do not mount cost/frequency/quantity inputs, need/want toggles, or save buttons.

Prefer extracting a display-only presentational component from a customer page when that is cheap. Do **not** add a `mode: 'local' | 'consultation'` flag to customer pages. Do **not** point customer pages at this hook.

### 7.1 Dashboard — `.../view/dashboard`

Match the family dashboard information:

- Family annual total
- Per-entity totals (each child, each adult, household)
- Category breakdown charts / bars for the selected entity
- Empty chart state when an entity has no costs yet

Use the same currency formatting as the family app (`formatCurrency`).

### 7.2 Profile displays

**Children** — name, age, school level. If none: "No children added yet".

**Adults** — name, age. If none: "No adults added yet".

**Household** — name, housing type, member count. If none: "Household not set up yet".

Each profile screen has a control to open that entity's category view.

### 7.3 Category displays

Group by entity, then category `sort_order`, then items.

Per category:

| Field | Display |
|-------|---------|
| Name | Text |
| Annual total | Currency |
| Progress | `items with cost > 0` / `item count` |
| Empty | "(not started)" — still listed |

Per item:

| Field | Display |
|-------|---------|
| Name | Text |
| Cost | Currency |
| Frequency | Label from `FREQUENCY_LABELS` |
| Quantity | Number |
| Annual | Currency |
| Need / want | Badge, or em dash if null |
| Adjusted (planning) | Show if `adjusted_total` is not null |

No add/edit/delete item controls. No inline cost editors.

### 7.4 Planning — `.../view/planning`

Same sections as the family planning page:

- Per entity: current situation, forward plan, potential savings
- Forward-planning categories: current vs adjusted
- Need/want categories: need vs want split (read-only badges)
- Family-level current / forward / savings strip

Do not render the family's "Save Plan" or "Reset" actions.

### 7.5 Summary — `.../view/summary`

Same walkthrough as the family summary:

- Children / adults / household sections
- Current situation vs forward plan vs potential savings
- Category and item rows

Print and CSV actions may be omitted in v1 (family summary has them; admin export is deferred).

### 7.6 Empty and error states

| Condition | UI |
|-----------|----|
| Profile missing / invalid id | "Family not found" + back to `/admin` |
| Query error | Error message + Retry |
| Family exists, no household / people / items | Render the screen with empty-state copy. Do not block consultation. |
| Categories exist, all $0 | Show categories as not started. This is a valid in-progress consult. |

---

## 8. Family Briefing CTA

Keep `/admin/families/[id]` as specified in [`admin-panel.md`](./admin-panel.md) §3.

Add a primary button in the header:

```
Open consultation  →  /admin/families/[id]/view/dashboard
```

Do not remove the briefing budget breakdown. Coaches still use it as a one-page overview.

---

## 9. Read-Only Enforcement

Three layers. All three are required.

### 9.1 UI

Consultation screens do not mount writers: text inputs for costs, frequency selects that save, need/want toggles, add/remove entity buttons, save/reset plan.

### 9.2 Hook

`useFamilyBudget` / `ConsultationContext` expose only `data`, `loading`, `error`, `live`, `refresh`. Realtime is subscribe + SELECT only.

### 9.3 Database

Existing admin RLS (SELECT only) stays. Do not add admin INSERT/UPDATE/DELETE policies on `households`, `adults`, `children`, `categories`, or `expense_items`.

```sql
-- Already deployed. Do not add write policies for admin on these tables.
-- Admins can view all expense items (SELECT)
-- No INSERT/UPDATE/DELETE policy for admins on user budget data
```

If a client bug fires an update, Supabase must reject it.

---

## 10. Privacy

Admin access to family budgets already exists via RLS and the briefing page. Consultation makes that access usable for coaching.

v1 documentation requirement (no new product screen required):

- Spec and any public privacy/terms text must state that authorised admins may view a family's budget, including in-progress entries, for support and consultation.
- Do not add an in-app consent toggle that turns this off (product rule: always on).
- View-audit logging is deferred to v1.1.

---

## 11. Implementation Order

Build in this order. Do not start later slices until the earlier ones work.

| Step | Work | Done when |
|------|------|-----------|
| 1 | `useFamilyBudget` + `ConsultationContext` | Hook loads one family; refresh works; no write methods |
| 2 | `view/layout.tsx` banner + nav | Admin can open shell; non-admin still blocked by middleware |
| 3 | Dashboard, planning, summary | Totals match family app for a seeded family |
| 4 | Profile displays | Children / adults / household render, including empty |
| 5 | Category displays | Items, empty categories, need/want, adjusted totals |
| 6 | Briefing CTA + extract `lib/planning-categories.ts` | Briefing opens consultation; family planning/summary import shared lists |

---

## 12. Files to Create / Modify

| File | Action | Description |
|------|--------|-------------|
| `hooks/use-family-budget.ts` | Create | Read-only Supabase query + refresh |
| `contexts/ConsultationContext.tsx` | Create | Provides hook result to view screens |
| `lib/planning-categories.ts` | Create | Shared forward-planning / need-want lists |
| `app/admin/families/[id]/view/layout.tsx` | Create | Banner, nav, context provider |
| `app/admin/families/[id]/view/page.tsx` | Create | Redirect to `dashboard` |
| `app/admin/families/[id]/view/dashboard/page.tsx` | Create | Read-only dashboard |
| `app/admin/families/[id]/view/children/page.tsx` | Create | Children profile display |
| `app/admin/families/[id]/view/children/categories/page.tsx` | Create | Child category display |
| `app/admin/families/[id]/view/adults/page.tsx` | Create | Adults profile display |
| `app/admin/families/[id]/view/adults/categories/page.tsx` | Create | Adult category display |
| `app/admin/families/[id]/view/household/page.tsx` | Create | Household profile display |
| `app/admin/families/[id]/view/household/categories/page.tsx` | Create | Household category display |
| `app/admin/families/[id]/view/planning/page.tsx` | Create | Read-only planning |
| `app/admin/families/[id]/view/summary/page.tsx` | Create | Read-only summary |
| `app/admin/families/[id]/page.tsx` | Modify | Add "Open consultation" CTA |
| `app/planning/page.tsx` | Modify | Import shared planning category lists |
| `app/summary/page.tsx` | Modify | Import shared planning category lists |
| `docs/specs/protected-routes.md` | Modify | Document new admin routes |

Do **not** modify `lib/db.ts`, `lib/sync.ts`, or customer write pages (`/categories`, `/adult-categories`, `/household-categories`) except the planning-constant extract above.

---

## 13. Acceptance Criteria

- [ ] Admin can open consultation from the family briefing page
- [ ] Non-admin cannot open `/admin/families/[id]/view/*` (redirected by existing middleware)
- [ ] Admin session stays admin — no sign-in as the family, no IndexedDB load of family data
- [ ] Dashboard, planning, and summary totals match the family app for the same synced data
- [ ] Children, adults, and household profile fields are visible
- [ ] Category views show entered items **and** not-started categories
- [ ] Families with `signed_up` / empty budgets are still openable
- [ ] Need/want and `adjusted_total` appear on planning and category display
- [ ] No consultation control writes to `households`, `adults`, `children`, `categories`, or `expense_items`
- [ ] Refresh reloads from Supabase and updates "Last updated"
- [ ] Banner shows family name (or email) and read-only label
- [ ] Back to briefing returns to `/admin/families/[id]`
- [ ] Customer Dexie write paths are unchanged
- [ ] Planning category lists live in one shared module used by family and admin views
