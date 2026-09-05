# Tab Switch Loading

**Status:** Spec for implementation  
**Priority:** P1  
**Surface:** Customer `/dashboard`, `/planning`, `/summary` only  
**Related:** [`cross-device-sync-fix.md`](./cross-device-sync-fix.md) (background sync must not blank these pages)

---

## Overview

Dashboard, Planning, and Summary remount on every tab click. Each page starts `useState(true)` and paints a full-page “Loading dashboard/planning/summary…” even when Dexie already has data. Household, Children, and Adults already skip this: they render the page shell and fill lists from IndexedDB without a full-page gate.

Production E2E usually sees a **0.4–0.9s** flash; one run measured **~10s**. That is a navigation bug, not a missing-data state.

The first-login **“Preparing your budget…”** copy comes from `SyncOwnershipGate` (owner not READY). That gate is a different surface and **must stay**.

This is a remount / loading-flag change. Data source stays Dexie. Sync, login pull-first, and aggregation stay as they are.

---



## 1. Why the current UI fails


| Cause | Effect |
| ----- | ------ |
| Next.js remounts `app/*/page.tsx` on each tab | Local React state is thrown away |
| `useState(true)` for `loading` on every mount | Warm visits look like a first load |
| Full-page early return (`Loading …`) | App chrome is replaced by a spinner-only view |
| Dexie already hydrated after first visit | The wait is cache-read + aggregation, not “no data” |
| Household / Children / Adults have no loading gate | Those tabs feel instant; these three do not |


---



## 2. Product rules


| Rule | Behaviour |
| ---- | --------- |
| Warm tab switch | Session already hydrated, owner READY: do **not** show a full-page loading gate on Dashboard / Planning / Summary. Keep chrome + last content, or render the page shell immediately. |
| First visit this session | No last snapshot **and** the Dexie read has not finished: a full-page loader is allowed. |
| Empty family / $0 totals | Show the real empty UI (`No Data Available` / $0 cards). Never an infinite loader. |
| Background sync refresh | Keep `setLoading((isFirst) => isFirst)` and `useReloadOnSync`. Do not blank charts or the page on sync. |
| Data source | These pages keep reading Dexie only. Do not add a new cloud fetch on navigation. |
| Freshness | Numbers after navigation must match a fresh Dexie read. Stale-while-revalidate is OK: show last snapshot, then replace. |
| Login / reconnect | Do not change pull-first (`reconcileBudget('login')`). |
| Other customer lists | Do not change Household / Children / Adults / category pages unless a shared helper is strictly needed. |
| Admin | Consultation views are out of scope. |


### 2.1 Out of scope

- Changing middleware `getUser()`
- Speed-rewriting Dexie aggregation (optional follow-up). A tiny `Promise.all` is allowed only if needed to keep the first-load loader honest
- New Next.js route group or persistent layout for these three pages
- New provider mounted above the pages, unless that is cheaper than a snapshot cache (prefer the cache)
- SyncOwnershipGate / “Preparing your budget…” copy or timing
- Admin `/admin/families/[id]/view/**` consultation screens
- Household, Children, Adults, and category pages (unless a shared helper is strictly required)

---



## 3. Preferred implementation

Use a **small in-memory last-snapshot cache** (module-level, or a tiny hook used only by these three pages).

1. After a successful Dexie load, remember the page’s render snapshot (lists, totals inputs, selection ids / open sections as needed so last content can paint).
2. On remount, if a snapshot exists, `loading` starts **false** and the UI renders that snapshot.
3. Existing `useEffect` + `useReloadOnSync` still re-read Dexie and replace the snapshot.

**Alternative (only if cheaper):** lift the read into an existing provider already mounted above these pages. Do **not** add a new route group / persistent layout unless a snapshot cache is impossible.

The cache is in-memory for this JS session. A new device or a full reload has no snapshot, so first paint may still use the page loader — after `SyncOwnershipGate` has already finished.

Do not change login/reconnect pull-first. Do not change middleware. Do not rewrite aggregation in this spec.

---



## 4. Acceptance

- [x] Warm Dashboard ↔ Planning ↔ Summary: no full-page “Loading …” (or it is gone before paint of the spinner as the only content).
- [x] First login / empty device: “Preparing your budget…” still appears from `SyncOwnershipGate`.
- [x] After tab switch, totals/lists still populate from Dexie (not frozen forever on a stale snapshot if data changed).
- [x] Empty family / $0 totals show the real empty UI, not a loader.
- [x] Background sync does not blank these pages (existing `setLoading((isFirst) => isFirst)` behaviour).
- [x] Household / Children / Adults behaviour is unchanged.

---



## 5. Spec-based order

1. Agree this spec (this file).
2. Add a minimal snapshot helper if it avoids copy-paste.
3. Wire Dashboard, Planning, and Summary only: `loading` starts false when a snapshot exists; Dexie re-read still updates.
4. Browser-check warm tab switches and confirm first-login gate is unchanged.
5. Then ship as a navigation-only change.
