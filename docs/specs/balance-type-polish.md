# Balance Type Polish Specification

**Status:** Implemented — confirm visually on `/` logged-out and logged-in.  
**Priority:** P1 (MVP polish)  
**Dependencies:** [`balance-home.md`](./balance-home.md)  
**Scope:** Typography on Balance `/` only (plus `PageHeader` when rendered on that page)

---

## Overview

Small hierarchy polish for the Balance first screen before MVP launch. Goal: clearer reading order and one consistent display face — **not** a new brand system, not pixel-matching v0, not app-wide redesign.

---

## 1. Product rules

| Rule | Behaviour |
|------|-----------|
| Balance only | Change type on `/` and shared `PageHeader` classes used there. Do not restyle Planning, Dashboard, admin, etc. |
| Two faces only | **Display:** Nunito. **Body / UI:** Inter. |
| Drop mixed serif | Remove `font-serif` on Balance / PageHeader headings; use Nunito instead. |
| No copy changes | Keep all Balance wording from [`balance-home.md`](./balance-home.md). |
| No layout redesign | Same cards and order; type classes / theme mapping only. |
| Calm finance tone | Soft hierarchy — clearer, not louder marketing. |

### 1.1 Out of scope

- New font vendors / paid fonts  
- Changing goal list content or adding Start Planning back  
- Guest auth CTA redesign (separate UX pass)  
- Global `globals.css` colour redesign  
- Matching v0 bottom-nav labels  

---

## 2. Font roles

| Role | Family | How to apply |
|------|--------|----------------|
| Display (titles) | Nunito (`--font-nunito` already loaded in `app/layout.tsx`) | `font-[family-name:var(--font-nunito)]` **or** map Tailwind `font-serif` → Nunito in theme for this pass (prefer explicit Nunito utility on Balance/PageHeader) |
| Body / labels / goals / inputs | Inter (body already `font-sans` + `--font-inter`) | Default; do not put Nunito on long paragraphs or goal rows |

**Note:** Today Balance/PageHeader use `font-serif` without mapping `--font-serif` to Nunito, so headings may fall back to the browser serif. This polish fixes that.

---

## 3. Type scale (Balance page)

Locked Tailwind-oriented scale. Use these classes (or equivalent tokens) on `/`.

| Element | Family | Size / weight | Tailwind guidance |
|---------|--------|---------------|-------------------|
| App name (`PageHeader` h1) | Nunito | 28px / bold | `text-[1.75rem] sm:text-3xl font-bold tracking-tight` + Nunito |
| Tagline (`PageHeader`) | Inter | 13–14px / regular | `text-sm text-muted-foreground` (keep) |
| Welcome title | Nunito | 24–26px / semibold | `text-2xl font-semibold` + Nunito (replace `font-serif`) |
| Welcome body | Inter | 16px / regular | `text-base leading-relaxed text-muted-foreground` |
| Card titles (goal, intention, How My BFF) | Nunito | 20px / semibold | `text-xl font-semibold` + Nunito (replace `font-serif`) |
| Card helper / lead-in | Inter | 13–14px / regular | `text-sm text-muted-foreground` |
| Goal option label | Inter | 14px / medium when selected, regular otherwise | `text-sm`; selected `font-medium` |
| Field labels | Inter | 14px / medium | `text-sm font-medium` |
| Intention helper / guest auth line | Inter | 12–13px / regular | `text-xs` or `text-sm` muted — prefer `text-xs` for guest line so it doesn’t compete with CTA |
| How-it-works step body | Inter | 14px / regular | `text-sm leading-relaxed text-muted-foreground` |
| Step number badge | Inter | 12px / semibold | keep `text-xs font-semibold` |
| Closing line | Nunito | 18px / semibold | `text-lg font-semibold` + Nunito (replace `font-serif`) |
| Primary button label | Inter | default Button size | unchanged |

---

## 4. Hierarchy rules

1. **App name** is the strongest wordmark; Welcome title is the strongest *content* heading.  
2. Card titles are clearly below Welcome (20px vs 24–26px).  
3. Helpers stay muted and smaller than titles — never `font-semibold` on helpers.  
4. Selected goal row may use `font-medium`; unselected stays regular + muted.  
5. Closing line is quieter than Welcome (18px), not equal to card titles.

---

## 5. Files to touch

| File | Change |
|------|--------|
| `docs/specs/balance-type-polish.md` | This spec |
| `docs/specs/README.md` | Index |
| `components/page-header.tsx` | App name → Nunito + scale; keep tagline Inter |
| `app/page.tsx` | Replace `font-serif` with Nunito utilities; apply §3 sizes |
| `scripts/verify-balance-type-polish.mjs` | Optional: assert no `font-serif` on Balance page / PageHeader |

Optional (only if needed for clean utilities):

| File | Change |
|------|--------|
| `app/globals.css` | Map `--font-sans` → Inter and/or add a `font-display` token → Nunito |

Prefer local class changes on Balance + PageHeader over a risky global theme rewrite.

---

## 6. Acceptance checklist

- [ ] No `font-serif` on Balance `/` or `PageHeader` headings  
- [ ] App name and card titles render in **Nunito**  
- [ ] Body, goals, helpers render in **Inter**  
- [ ] Welcome title visually larger/heavier than card titles  
- [ ] Guest auth helper under intention is quieter than the button  
- [ ] Content/copy unchanged  
- [ ] Planning / Dashboard / admin pages visually unchanged (spot-check)  
- [ ] Mobile + desktop Balance still readable; no overflow on long goal lines  

---

## 7. Implementation order

1. This spec + README index  
2. `PageHeader` display face + app-name size  
3. `app/page.tsx` heading/body classes per §3  
4. Visual check on `/` logged-out and logged-in  
5. Optional verify script  

---

## 8. Non-goals reminder

If copy, CTA, or “How My BFF” accordion changes are desired later, open a separate UX spec. This file is **type only**.
