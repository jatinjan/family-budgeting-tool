# App Navigation Specification

**Status:** Implemented — hybrid chrome matches this spec. Confirm on logged-in mobile + desktop.  
**Priority:** P0  
**Dependencies:** Auth visibility (`AppShell` logged-in chrome), existing family routes  
**Related:** [`admin-consultation-view.md`](./admin-consultation-view.md) (mirror IA), [`auth-flow.md`](./auth-flow.md) (Sign out), [`protected-routes.md`](./protected-routes.md)

---

## Overview

The family app uses **hybrid navigation**:

- **Desktop / tablet (`md` and up):** sticky **top bar** with primary links; **Family** opens a small dropdown.
- **Mobile (below `md`):** **bottom nav** with the same primary items; **Family** opens a **sheet** (not a direct route).

Guests, auth pages, and `/admin` do **not** show family chrome (unchanged `AppShell` gating).

Source of labels: product hybrid-nav plan (client v0 bottom bar collapsed into Family for production Household / Children / Adults).

---

## 1. Product rules

| Rule | Behaviour |
|------|-----------|
| Hybrid only | Top bar on `md+`; bottom nav below `md`. Never show both at once. |
| Five primary items | Balance, Family, Dashboard, Planning, Summary. |
| Family is a group | Household, Children, Adults — no new routes. |
| Shared config | Family app + consultation import `lib/app-nav.ts`. |
| Active includes categories | Family (or child item) stays active on category entry routes. |
| Logged-in only | Same as today’s `shouldShowUserChrome`. |
| Account | Desktop: Sign out on top bar. Mobile: Sign out remains on `PageHeader` (no duplicate on desktop). |
| Calm UI | Soft border, teal active state — not a heavy mega-menu. |

### 1.1 Out of scope

- Balance home content (see [`balance-home.md`](./balance-home.md))
- Renaming or adding routes
- Sync / schema / auth flow changes
- Pointing production deploy at the v0 prototype repo
- Admin impersonation

---

## 2. Information architecture

### 2.1 Primary items (family app)

| Label | Kind | Route / behaviour |
|-------|------|-------------------|
| Balance | link | `/` |
| Family | group | Opens dropdown (desktop) or sheet (mobile) |
| Dashboard | link | `/dashboard` |
| Planning | link | `/planning` |
| Summary | link | `/summary` |

### 2.2 Family sub-items

| Label | Route | Also active on |
|-------|-------|----------------|
| Household | `/household` | `/household-categories` |
| Children | `/children` | `/categories` |
| Adults | `/adults` | `/adult-categories` |

Order in dropdown/sheet: **Household**, **Children**, **Adults**.

### 2.3 Active-state rules

- A link item is active when `pathname === href` (exact for Balance `/`).
- Family **group** is active when any Family sub-item (or its category route) matches.
- Planning / Summary / Dashboard: exact path match for their `href`.

### 2.4 Visibility

Show family chrome only when:

- User is logged in, and
- Path is not `/admin…`, `/login`, `/signup`, or `/auth/…`

Otherwise no TopNav and no BottomNav.

---

## 3. Desktop top bar (`md+`)

Layout:

```
[ App name ]   Balance · Family ▾ · Dashboard · Planning · Summary   [ Sign out ]
```

- Sticky, light border-bottom, `z-50`.
- Family dropdown: three links with short optional description (one column).
- Hide bottom nav entirely at this breakpoint.
- Content padding: top offset for sticky bar (no large bottom padding for nav).

---

## 4. Mobile bottom nav (below `md`)

- Five equal tabs matching §2.1.
- Tapping **Family** opens a bottom sheet listing §2.2; does **not** navigate until a sub-link is chosen.
- Sheet closes after navigation.
- Content keeps bottom safe-area padding for the bar.

---

## 5. Consultation mirror

Admin consultation (`/admin/families/[id]/view/*`) uses the **same IA**:

| Label | Behaviour |
|-------|-----------|
| Family | Group: Household, Children, Adults under `.../view/...` |
| Dashboard | `.../view/dashboard` |
| Planning | `.../view/planning` |
| Summary | `.../view/summary` |

Balance is **not** in consultation nav (read-only workspace is not the marketing/home tab). Consultation remains a horizontal top-style nav (admin desktop workflow).

Category active paths:

- Children → `.../view/children` and `.../view/children/categories`
- Adults → `.../view/adults` and `.../view/adults/categories`
- Household → `.../view/household` and `.../view/household/categories`

---

## 6. Shared module

```typescript
// lib/app-nav.ts
export type AppNavLink = { kind: 'link'; id: string; label: string; href: string }
export type AppNavFamily = { kind: 'family'; id: 'family'; label: 'Family'; children: AppNavFamilyChild[] }
export type AppNavFamilyChild = { id: string; label: string; href: string; activePrefixes: string[] }
export type AppNavItem = AppNavLink | AppNavFamily

export const FAMILY_NAV_CHILDREN: AppNavFamilyChild[]
export const APP_NAV_ITEMS: AppNavItem[]

export function isFamilyChildActive(pathname: string, child: AppNavFamilyChild): boolean
export function isFamilyGroupActive(pathname: string): boolean
export function isNavLinkActive(pathname: string, href: string): boolean
```

Consultation builds absolute hrefs from the same child `id`s / relative segments.

---

## 7. Files

| File | Action |
|------|--------|
| `docs/specs/app-navigation.md` | This spec |
| `lib/app-nav.ts` | Create — shared IA |
| `components/top-nav.tsx` | Create — desktop bar |
| `components/family-nav-sheet.tsx` | Create — mobile Family sheet |
| `components/bottom-nav.tsx` | Update — 5 items + sheet |
| `components/app-shell.tsx` | Update — hybrid switch + padding |
| `components/page-header.tsx` | Update — hide Sign out on `md+` when TopNav shows it |
| `app/admin/families/[id]/view/components/consultation-nav.tsx` | Update — Family group |
| `scripts/verify-app-navigation.mjs` | Create — static checks |
| `docs/specs/README.md` | Index this spec |
| `docs/specs/admin-consultation-view.md` | §4.3 aligned with this spec |

---

## 8. Verification checklist

- [ ] Spec indexed in `docs/specs/README.md`
- [ ] `lib/app-nav.ts` labels/hrefs match §2
- [ ] Logged-out `/` has no TopNav / BottomNav
- [ ] Logged-in mobile: bottom nav; Family opens sheet with Household / Children / Adults
- [ ] Logged-in desktop: top bar; no bottom nav; Family dropdown works
- [ ] `/categories` highlights Family (and Children in sheet/dropdown)
- [ ] `/adult-categories` and `/household-categories` same for Adults / Household
- [ ] Sign out works from top bar (desktop) and PageHeader (mobile)
- [ ] Consultation reaches Household, Children, Adults, Dashboard, Planning, Summary
- [ ] `node scripts/verify-app-navigation.mjs` passes

---

## 9. Implementation order

1. This spec + README + consultation §4.3  
2. `lib/app-nav.ts` + verify script  
3. Family sheet + BottomNav  
4. TopNav + AppShell  
5. PageHeader account cleanup  
6. Consultation nav  
7. Browser verify (mobile + desktop)  
