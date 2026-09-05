# Dashboard Category Bars

**Status:** Spec for implementation (not started)  
**Priority:** P1  
**Surface:** Customer Dashboard `/dashboard` only  
**Related:** [`budget-calculations.md`](./budget-calculations.md), mockup `canvases/dashboard-category-bars.canvas.tsx`

---

## Overview

Replace the broken **Children by Category** and **Adults by Category** stacked vertical charts with full-width **horizontal category-total bars**. A family user must be able to answer “where does kids’ / adults’ money go?” on both desktop and phone.

This is a layout and chart-type change. Totals stay annual AUD from existing Dashboard loaders. Person-level comparison stays in **Detailed Breakdown**.

---

## 1. Why the current UI fails

| Cause | Effect |
|-------|--------|
| `lg:grid-cols-2` half-width cards | Too narrow for 8–12 long category names |
| Vertical `BarChart`, `angle={-45}`, `interval={0}` | Labels rotate, truncate, overlap |
| One `<Bar>` per person, `stackId="a"` | Legend fills with names (or `e2e-…` IDs); plot area collapses |
| Y-axis `$${(value / 1000).toFixed(0)}k` | Totals under ~$1,000 look empty (`$0k`) |
| In-chart `<Legend />` inside 350px height | Bars disappear; labels float |

Household below is already “one bar per category” but still uses the same rotated X-axis. This spec **includes Household** so all three category cards use one pattern.

---

## 2. Product rules

| Rule | Behaviour |
|------|-----------|
| Question the card answers | Category totals for that group, not per-person stacks |
| Sort | Highest annual total first |
| Names | Full category labels, no 45° ticks (e.g. `Adult Communications & Subscriptions`) |
| Money | `formatCurrency` on labels/tooltips. Axis uses dollars, not `$Xk`, when the max bar is under $5,000 |
| Colour | Children bars: children blue. Adults bars: adults pink. Household bars: existing category colours or teal |
| Caption | `Across N children` / `Across N adults` / household name or `Shared household costs`. No person-ID legend |
| Person split | Tooltip may list `Name $x` when more than one person has that category. Full compare stays in Detailed Breakdown |
| Hide empty | Do not render a group card if that group’s annual total is $0 |
| Zero categories | If a group has money in only one category, still show one horizontal bar (no empty grid chrome) |
| Chart flicker | Do not unmount the chart on background sync refresh (same rule as existing Dashboard donut) |

### 2.1 Out of scope

- Changing sync, Dexie, or category totals
- Cleaning leftover `e2e-…` names (data, not this UI)
- Multi-select Balance goals
- Admin consultation charts (admin is a separate surface)
- Redesigning the overview donut or Detailed Breakdown tabs

---

## 3. Desktop vs mobile (one component, two viewports)

Use **one card stack**, not two chart implementations.

| | Desktop (≥ `md`, ~768px+) | Mobile (< `md`) |
|--|---------------------------|-----------------|
| Card width | Full content width (`max-w-5xl` column), **not** two columns | Full width, 16px side padding |
| Layout | Title + caption, then chart | Same; no side-by-side Children/Adults |
| Chart | Recharts `BarChart` `layout="vertical"` | Same chart, shorter plot if needed |
| Y-axis (categories) | Width 140–180px so long names wrap to 2 lines | Width 112–128px; wrap 2 lines; never rotate |
| X-axis (money) | Ticks `$0`, mid, max | 2–3 ticks only |
| Height | `max(280, 36px × categoryCount + 48)` | `max(240, 32px × categoryCount + 40)` |
| Touch | Tooltip on tap of a bar | Same; no hover-only information that is required to understand the card |
| Scroll | Page scrolls; chart is not a nested horizontal scroller | Same. If more than **8** categories, show top 7 + **Other** (sum of the rest) |

**Other rule:** when collapsing, `Other` is the sum of categories after the first 7 by amount. Tooltip lists the rolled-up names. Desktop and mobile use the same 8-row cap so the page does not grow without bound.

---

## 4. Data shape

Replace `childrenStackedData` / `adultsStackedData` (per-person keys) with:

```ts
type CategoryTotalBar = {
  category: string
  total: number
  people?: { name: string; amount: number }[]
}
```

- `total` = sum of that category across all children (or all adults, or the household)
- Sort `total` desc; drop rows where `total === 0`
- Apply top-7 + Other after sort

Household today is `flatMap(h => h.categories)` with `name` / `value`. Map to the same `CategoryTotalBar` so one presentational component can render all three cards.

---

## 5. Implementation steps

1. Add `CategoryTotalBars` in `app/dashboard/` (or `components/`) taking `title`, `description`, `caption`, `bars`, `barColor`.
2. Horizontal Recharts bar: `layout="vertical"`, `YAxis` `dataKey="category"` `type="category"`, `XAxis` `type="number"` with a dollar tick formatter that does **not** force `/1000` + `k` below $5,000.
3. Wire children / adults / household cards in a **single-column** `space-y-6` stack (remove `lg:grid-cols-2` for these two cards).
4. Delete stacked helpers and the in-chart `<Legend />` for these cards.
5. Keep Detailed Breakdown as the person drill-down.
6. Verify in the browser: desktop (~1280px) and mobile (390×844), including 1 category, 3 categories, and 10+ categories (Other).

---

## 6. Acceptance

- [ ] On a 1280px desktop, Children and Adults cards are full width; labels are horizontal and readable; bars are visible for amounts like $504.
- [ ] On a 390px phone, the same cards stack; no overlapping 45° text; no horizontal page overflow from the chart.
- [ ] Caption states how many children/adults; no legend of person names or `e2e-…` IDs.
- [ ] Tooltip (or tap) can show per-person split when present; the bar itself is the group total.
- [ ] Household card uses the same horizontal pattern.
- [ ] Empty group (no spend) still hides the card.
- [ ] Overview donut and Detailed Breakdown are unchanged in behaviour.
- [ ] Background sync does not blank these charts.

---

## 7. Spec-based order

1. Agree this spec (this file + the canvas mockup).
2. Implement `CategoryTotalBars` + Dashboard wiring only.
3. Browser-check desktop and mobile (acceptance above).
4. Then ship (Preview, then production) as a UI-only change.
