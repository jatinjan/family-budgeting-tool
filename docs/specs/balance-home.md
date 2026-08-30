# Balance Home Specification

**Status:** Implemented — Balance `/` matches this draft. Confirm guest + logged-in locally before push.  
**Priority:** P0  
**Dependencies:** Auth (`useAuth`), IndexedDB `settings`, hybrid nav ([`app-navigation.md`](./app-navigation.md))  
**Related:** [`auth-flow.md`](./auth-flow.md) (guest Sign in / Sign up), client v0 Balance UI (`Niral_mbff-v0-ui`)

---

## Overview

The Balance route (`/`) is the family app home. Production adopts the **client v0 Balance content** (welcome, yearly goal, saving intention, How My BFF works) while keeping production auth, hybrid navigation, and family setup paths.

Source UI: https://v0-child-budgeting-tool.vercel.app/ (and local `Niral_mbff-v0-ui/app/page.tsx`).  
Do **not** replace production with the v0 repo wholesale.

---

## 1. Product rules

| Rule | Behaviour |
|------|-----------|
| One home for everyone | Guests and logged-in users see the same Balance content structure (§3). |
| Guest cannot persist | No IndexedDB writes when logged out. **Set your intention** sends guests to auth. |
| Logged-in persists locally + cloud | Dexie cache + Supabase `profiles` — see [`balance-intention-sync.md`](./balance-intention-sync.md). |
| No Start Planning CTA | Bottom **Start Planning** button is removed; users continue via Family nav. |
| Keep hybrid nav | Top/bottom chrome from [`app-navigation.md`](./app-navigation.md). Do not import v0 bottom-nav labels. |
| Keep PageHeader | App name / tagline; guest Sign in / Sign up; mobile Sign out when logged in. |
| Shared copy lists | Goal options and How-it-works steps live in `lib/balance-home.ts`. |

### 1.1 Out of scope

- Changing Planning, Dashboard, or category entry
- v0 “Child Details”-only IA
- Email / SMTP
- Replacing hybrid nav with v0 bottom bar

Cloud sync + admin read for intention: [`balance-intention-sync.md`](./balance-intention-sync.md).

---

## 2. Audience behaviour

### 2.1 Guest (logged out)

- See full Balance UI (welcome, goals, intention fields, steps, CTA).
- May select goals and type amounts in React state only.
- **Set your intention** → `/signup` (primary). PageHeader still offers Sign in / Sign up.
- Optional helper text near the intention button: sign up or sign in to save your intention.

### 2.2 Logged in

- Load/save:

| Setting key | Meaning |
|-------------|---------|
| `balanceGoal` | Selected preset goal text, or custom goal text |
| `yearlySavingsGoal` | Optional string (yearly amount) |
| `monthlyBuffer` | Optional string (monthly amount) |

- **Set your intention** requires a resolved goal (preset or non-empty custom); then writes the three keys; shows Saved.
- Continue into the app via hybrid **Family** / other nav (no Start Planning button).

---

## 3. Page structure (top → bottom)

1. **PageHeader** (existing)  
2. **Welcome card** — title “Welcome to My Balanced Family Finances”; short supporting line from v0.  
3. **Goal card** — “What matters most to you this year?”  
   - Preset radio list from `BALANCE_GOALS`  
   - “Something else” + “In your own words” text field  
4. **Saving intention card** — “Set your saving intention”  
   - Yearly savings goal (optional)  
   - Monthly buffer (optional)  
   - **Set your intention** button  
5. **How My BFF works** — five steps from `BALANCE_HOW_IT_WORKS_STEPS`  
6. **Closing line** — “A more balanced year begins with clarity.” (no Start Planning button)

Visual tone: existing soft gradient / cards / serif headings (match current app, port layout from v0).

---

## 4. Locked content lists

### 4.1 Goals (`BALANCE_GOALS`)

1. Reduce financial stress  
2. Build a safety buffer  
3. Save for a holiday  
4. Understand our real spending  
5. Reduce overspending  
6. Make better decisions about kids' activities  
7. Improve communication about money  

Plus UI option **Something else** (not stored as that label — store the custom text in `balanceGoal`).

### 4.2 How it works (`BALANCE_HOW_IT_WORKS_STEPS`)

1. Add your known expenses for household, adults, and children.  
2. Add estimates of your irregular or average-based expenses to complete your picture.  
3. Review your total family spending in the Dashboard.  
4. Explore adjustments in the Planning Sheet.  
5. See your potential savings and the impact of your choices.

---

## 5. Files

| File | Action |
|------|--------|
| `docs/specs/balance-home.md` | This spec |
| `docs/specs/README.md` | Index |
| `lib/balance-home.ts` | Create — goals, steps, setting keys, helpers |
| `app/page.tsx` | Replace marketing home with Balance intention UI |
| `scripts/verify-balance-home.mjs` | Create — static checks |

---

## 6. Verification checklist

- [ ] Spec indexed in README  
- [ ] Guest `/` shows new sections (goals, intention, How My BFF works)  
- [ ] Guest has no bottom/top family chrome (nav spec)  
- [ ] Guest Set intention → `/signup`  
- [ ] Logged-in can save intention; Saved indicator appears  
- [ ] No Start Planning button on Balance  
- [ ] Reload logged-in restores saved goal / amounts  
- [ ] Hybrid nav unchanged  
- [ ] `node scripts/verify-balance-home.mjs` passes  

---

## 7. Implementation order

1. This spec + README  
2. `lib/balance-home.ts`  
3. `app/page.tsx`  
4. Verify script + browser check  
