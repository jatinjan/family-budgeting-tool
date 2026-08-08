# Family Budgeting Tool — Codebase Research

_Documented as-is. This describes only what exists in the code today._

## High-Level Summary

The project is a client-side **Next.js 16 (App Router, Turbopack)** single-page web/PWA application called "My Balanced Family Finances" that helps a family map annual expenses and plan potential savings. There is **no backend, API route, or server component logic**; every page is a `"use client"` component and all data is persisted locally in the browser via **Dexie (IndexedDB)** (`lib/db.ts`). The domain is modeled as three parallel entity families — **Children, Adults, and Household** — each with its own profile table, category table, and expense-item table, plus shared default category templates. The app has seven routes reachable from a fixed bottom navigation bar: a landing/"Balance" page (`/`), three data-entry areas (`/children`, `/adults`, `/household`) with per-entity budget detail pages (`/categories`, `/adult-categories`, `/household-categories`), and three cross-entity analysis pages (`/dashboard`, `/planning`, `/summary`). Money math flows from item `cost × quantity → total (annual)`, with an optional percentage-based "Miscellaneous" category and a separate "forward planning" adjustment model layered on top for the Planning and Summary pages. The UI is built from a large set of shadcn/ui (Radix) primitives, Tailwind CSS v4, `lucide-react` icons, and `recharts` for charts.

---

## Project Structure & Configuration

- **Framework / tooling**: `next@16.0.10`, `react@19.2.0`, `react-dom@19.2.0`, `typescript@5.9.3`, Tailwind CSS v4 (`@tailwindcss/postcss`), `dexie@^4` + `dexie-react-hooks`, `recharts@^2.15`, `lucide-react`, many `@radix-ui/*` packages. See `package.json:1-39`.
- **Scripts**: `dev` (`next dev`), `build` (`next build`), `start` (`next start`), `lint` (`eslint .`). `package.json:2-7`.
- **Next config**: TypeScript build errors are ignored (`ignoreBuildErrors: true`) and images are unoptimized. `next.config.mjs:1-11`.
- **TypeScript**: strict mode on, path alias `@/*` → `./*`, target ES6, `moduleResolution: bundler`. `tsconfig.json:1-41`.
- **shadcn/ui config**: style `new-york`, RSC enabled, base color neutral, icon library lucide, aliases for components/ui/lib/hooks. `components.json:1-22`.
- **PWA**: `public/manifest.json:1-22` (standalone display, theme color `#5A9E9E`, icons 192/512). Wired via metadata + `<head>` tags in `app/layout.tsx:11-47`.
- **Styling tokens**: `app/globals.css:1-129` defines oklch light/dark CSS variables plus `@theme inline` mapping brand colors (primary teal `hsl(180 27% 49%)`, secondary coral `hsl(340 75% 65%)`, accent sky `hsl(200 70% 60%)`). A second, unreferenced stylesheet exists at `styles/globals.css` (the layout imports `app/globals.css` at `app/layout.tsx:4`).
- **Fonts**: Google `Nunito` and `Inter` loaded as CSS variables in `app/layout.tsx:8-9`, applied on `<body>` (`font-sans`) at `app/layout.tsx:48`.

---

## Data Layer — `lib/db.ts`

The single Dexie database `"FamilyBudgetingApp"` (schema `version(1)`) defines ten tables and their TypeScript interfaces.

### Entity / table model
- **Profiles**: `Child` (`lib/db.ts:3-10`: name, age, schoolLevel, optional `region`, createdAt), `Adult` (`lib/db.ts:12-17`), `Household` (`lib/db.ts:19-25`: name, housingType, members, createdAt).
- **Categories**: `Category` (childId) `lib/db.ts:27-36`, `AdultCategory` (adultId) `lib/db.ts:38-47`, `HouseholdCategory` (householdId) `lib/db.ts:49-58`. All share `name`, `description`, `order`, and optional `confidencePercent`, `isPercentageBased`, `percentageValue`.
- **Expense items**: `ExpenseItem` `lib/db.ts:60-70` (child frequencies: `monthly|term|annual|weekly`), `AdultExpenseItem` `lib/db.ts:72-82` and `HouseholdExpenseItem` `lib/db.ts:84-94` (frequencies: `monthly|quarterly|annual|weekly|bi-monthly`). Each item has `categoryId`, `name`, `cost`, `frequency`, `quantity`, `total`, optional `needWant` (`need|want`) and optional `adjustedTotal`.
- **Settings**: `Settings` (`key`/`value`) `lib/db.ts:96-99`; table declared at `lib/db.ts:125` but not read or written anywhere in the app pages.
- **Schema/index declaration**: `lib/db.ts:115-126`.

### Default templates (seed data)
- `defaultCategories` (children) — 9 categories, `lib/db.ts:131-491`: Education, Child Communication and Subscriptions, Extracurricular, Medical & Special Needs, Clothing & Toys, Entertainment/Events, Parties & Social, Holiday, Miscellaneous (percentage-based, `percentageValue: 15`).
- `defaultAdultCategories` — 10 categories, `lib/db.ts:523-820`: Education, Fitness, Adult Communications & Subscriptions, Medical, Vehicles/Transport, Personal Debt Repayment, Personal, Gifting, Adult Holidays/ Solo Travel, Miscellaneous.
- `defaultHouseholdCategories` — 11 categories, `lib/db.ts:823-1274`: Housing, Utilities, Scheduled Maintenance, Insurance, Communications & Subscriptions, Groceries & Household Supplies, Entertainment & Recreation, Eating Out, Pets, Family Holidays, Miscellaneous.
- Each non-Miscellaneous category carries a list of seed items with `cost: 0`, a `frequency`, a default `quantity`, and (usually) a `needWant` tag. Each Miscellaneous category is `isPercentageBased: true, percentageValue: 15, confidencePercent: 0.1, items: []`.

### Calculation helpers
- `calculateAnnualCost(cost, frequency, quantity)` `lib/db.ts:494-515`: every branch returns `cost * quantity` (frequency does not change the arithmetic; the quantity encodes the annual count, e.g. weekly→52, monthly→12, term→4, quarterly→4, annual→1).
- `calculateMiscellaneousTotal(percentageValue, otherCategoriesTotal)` `lib/db.ts:518-520`: returns `(percentageValue/100) * otherCategoriesTotal`.

### Seeding functions
- `initializeChildData(childId)` `lib/db.ts:1277-1323`, `initializeAdultData(adultId)` `lib/db.ts:1326-1372`, `initializeHouseholdData(householdId)` `lib/db.ts:1375-1421`. Each iterates its template list, inserts the category, then either inserts a single computed "Miscellaneous" item (for percentage-based categories) or inserts each seed item with a computed `total`. Note: for percentage-based categories these functions compute the misc total against `db.items`/`db.adultItems`/`db.householdItems` filtered by `categoryId != categoryId` across the whole table (not scoped to the new entity), at seed time when seed costs are all 0.

---

## App Config & Shared Utilities

- `lib/config.ts:1-17` — `APP_CONFIG`: app name "My Balanced Family Finances", tagline, CTA text/URL (`#workshop`), location "Australia", currency AUD/`$`/`en-AU`, and a THEME block.
- `formatCurrency(amount, showDecimals=true)` `lib/config.ts:20-27` — `Intl.NumberFormat` in `en-AU`/AUD.
- `lib/utils.ts:1-6` — `cn()` = `twMerge(clsx(...))`.

---

## Layout, Navigation & Shared Components

- **`app/layout.tsx:35-59`** — root layout: sets metadata/viewport, renders `children` inside a padded wrapper, and always renders `<BottomNav />`. Theme color `#5A9E9E` (`app/layout.tsx:27`).
- **`components/bottom-nav.tsx:8-79`** — fixed bottom nav with 7 items (`navItems` `bottom-nav.tsx:8-44`): Balance `/`, Children `/children`, Adults `/adults`, Household `/household`, Dashboard `/dashboard`, Planning `/planning`, Summary `/summary`. Active-state logic (`bottom-nav.tsx:56-59`) also treats `/categories`, `/adult-categories`, `/household-categories` as belonging to their parent list items.
- **`components/page-header.tsx:3-14`** — centered title/tagline pulled from `APP_CONFIG`.
- **`components/theme-provider.tsx`** — present in the tree (not imported by the layout).
- **`components/ui/*`** — ~50 shadcn/ui primitives (accordion, dialog, alert-dialog, select, card, table, tabs, collapsible, chart, etc.). `hooks/use-toast.ts` (`hooks/use-toast.ts:171-192`) and `components/ui/toaster.tsx` (`toaster.tsx:3`) exist but no route mounts the toaster.

---

## Route-by-Route Findings

### `/` — Landing / "Balance" (`app/page.tsx:7-127`)
Static marketing-style page with informational cards ("A clearer picture of your year", "Plan with purpose", "How it works", "Designed for real families") and two "Start planning"/"Start your plan" buttons linking to `/household` (`app/page.tsx:19,118`).

### `/children` — Children list (`app/children/page.tsx:29-284`)
- State + `loadChildren()` sorts by `createdAt` desc (`children/page.tsx:45-48`).
- Add/edit form fields: name, age (0–25), schoolLevel from `schoolLevels` (`children/page.tsx:27`). Submit (`handleSubmit` `children/page.tsx:66-92`): updates existing child, or adds child then calls `initializeChildData(childId)` to seed categories/items.
- `confirmDelete()` `children/page.tsx:94-109` cascades: deletes items per category, then categories, then the child.
- "View Budget" navigates to `/categories?childId=<id>` (`children/page.tsx:111-113`).
- Note: `region` field exists on `Child` but is not collected by this form.

### `/categories` — Child budget detail (`app/categories/page.tsx:43-559`)
- Reads `childId` from search params (wrapped in `<Suspense>` `categories/page.tsx:547-559`); `loadData()` `categories/page.tsx:72-87` loads the child, categories sorted by `order`, and items grouped by categoryId.
- Item CRUD via dialog: `handleItemSubmit` `categories/page.tsx:108-138` computes `total` with `calculateAnnualCost`; frequency selection auto-fills default quantity (`categories/page.tsx:471-483`, weekly 52 / monthly 12 / term 4 / annual 1).
- Inline cost editing (`handleInlineCostUpdate` `categories/page.tsx:159-167`) recomputes `total`.
- Percentage/Miscellaneous editing (`handleMiscPercentageUpdate` `categories/page.tsx:151-157`).
- Totals: `getCategoryTotal` `categories/page.tsx:169-185` (percentage categories computed from the sum of all other category item totals), `getGrandTotal` `categories/page.tsx:187-194`. Grand total card shows annual + `/12` monthly (`categories/page.tsx:243-244`).
- Frequency labels via `getFrequencyLabel` `categories/page.tsx:198-211` (weekly/monthly/term/annual only).

### `/adults` — Adults list (`app/adults/page.tsx:26-297`)
- Same pattern as `/children` (form fields: name, age 18–120; `adults/page.tsx:164-187`).
- Adds a **Reset** action (`confirmReset` `adults/page.tsx:110-126`) that deletes all categories/items for the adult and re-runs `initializeAdultData` to restore default templates. Delete cascade at `adults/page.tsx:89-104`.
- "View Budget" → `/adult-categories?adultId=<id>` (`adults/page.tsx:106-108`).

### `/adult-categories` — Adult budget detail (`app/adult-categories/page.tsx:43-563`)
- Structurally identical to `/categories` but against `db.adults` / `db.adultCategories` / `db.adultItems` (`adult-categories/page.tsx:72-87`).
- Frequency set includes `bi-monthly` and `quarterly`; default quantities weekly 52 / bi-monthly 6 / monthly 12 / quarterly 4 / annual 1 (`adult-categories/page.tsx:471-484`). Labels at `adult-categories/page.tsx:196-211`.

### `/household` — Household list (`app/household/page.tsx:28-323`)
- Form fields: name, housingType from `housingTypes` (`household/page.tsx:26`), members (1–20). Only shows the "Add" button when no household exists yet (`household/page.tsx:151`).
- Same seed/reset/delete pattern as adults (`initializeHouseholdData`, `confirmReset` `household/page.tsx:115-131`, `confirmDelete` `household/page.tsx:94-109`).
- "View Budget" → `/household-categories?householdId=<id>` (`household/page.tsx:111-113`).

### `/household-categories` — Household budget detail (`app/household-categories/page.tsx:43-563`)
- Structurally identical to the adult detail page, against the household tables (`household-categories/page.tsx:72-87`). Same frequency set/labels as adults.

### `/dashboard` — Visual overview (`app/dashboard/page.tsx:52-857`)
- `loadData()` `dashboard/page.tsx:71-221` loads all children/adults/households and, per entity, builds `EntityExpenseData` with per-category totals (percentage categories resolved via `calculateMiscellaneousTotal` against other categories, `dashboard/page.tsx:106-115,148-157,190-199`). Only categories with `total > 0` are pushed (`dashboard/page.tsx:117-124`).
- Aggregates: `totalChildren`, `totalAdults`, `totalHousehold`, `grandTotal` (`dashboard/page.tsx:224-227`).
- Charts (recharts): overview donut `PieChart` (`dashboard/page.tsx:365-420`), stacked `BarChart`s for children and adults (`dashboard/page.tsx:236-268,423-525`), household category `BarChart` (`dashboard/page.tsx:527-574`), and per-entity drill-down pies inside `Tabs` (`dashboard/page.tsx:576-849`) with `Select` dropdowns to pick an individual.
- Palettes: `COLORS` (`dashboard/page.tsx:33-44`) and `ENTITY_COLORS` (`dashboard/page.tsx:46-50`). Empty-state card when no data (`dashboard/page.tsx:285-302`).
- A local shadowing `Label` component is declared at the bottom (`dashboard/page.tsx:855-857`).

### `/planning` — Forward planning (`app/planning/page.tsx:52-882`)
- `loadAllData()` `planning/page.tsx:64-150` loads all three entity types with their categories+items. During load it performs in-place `needWant` migrations: Extracurricular items with `cost > 0 && !needWant` → `need` (`planning/page.tsx:76-83`); Fitness items (`planning/page.tsx:99-109`) and "Subscriptions" items (`planning/page.tsx:125-135`) default to `need` under certain conditions. It opens the first section of each entity type by default (`planning/page.tsx:142-147`).
- Persisted edits: `updateChildItemNeedWant` / `updateChildItemAdjustment` and adult/household equivalents (`planning/page.tsx:165-261`) write `needWant` / `adjustedTotal` to the DB and update local state.
- **Forward-planning model** (`calculateChildTotals` `planning/page.tsx:276-309`, adult `312-345`, household `348-381`):
  - `currentSituationTotal` = sum of all non-misc item `total` + misc% of that sum.
  - `forwardPlanningTotal` = (sum of `adjustedTotal ?? total` over items in the entity's "forward planning" categories) + (needs-only total for the "needs/wants" category) + misc% of those two.
  - `potentialSavings` = current − forward; `wantTotal` = sum of "want" items in the needs/wants category.
- Category-name constants driving the model: children `childForwardPlanningCategories` / `childNeedsWantsCategory="Extracurricular"` (`planning/page.tsx:264-265`); adults `adultForwardPlanningCategories` / `adultNeedsWantsCategory="Fitness"` (`planning/page.tsx:268-269`); household `householdForwardPlanningCategories` / `householdNeedsWantsCategory="Subscriptions"` (`planning/page.tsx:272-273`). Several of these strings differ from the actual seeded category names in `lib/db.ts` (e.g. adult `"Debt Repayment"` vs seed `"Personal Debt Repayment"`; household `"Mortgage/Rent"`, `"Groceries"`, `"Entertainment"`, `"Subscriptions"` vs seed `"Housing"`, `"Groceries & Household Supplies"`, `"Entertainment & Recreation"`, `"Communications & Subscriptions"`).
- Rendering: grand summary cards (`planning/page.tsx:627-652`) and `renderCategoryCard` (`planning/page.tsx:430-608`) which shows only items with `cost > 0` (`planning/page.tsx:442,448-450`), renders editable `$` inputs (on `onBlur`) for forward-planning and needs/wants categories, and Need/Want toggle buttons for the needs/wants category. Collapsible per-entity sections at `planning/page.tsx:654-859`.

### `/summary` — Report & export (`app/summary/page.tsx:73-957`)
- Loads per-entity summaries via `loadChildSummary` (`summary/page.tsx:124-217`), `loadAdultSummary` (`219-310`), `loadHouseholdSummary` (`312-403`, uses only `households[0]`). Each does a two-pass computation mirroring the Planning model, producing per-category `currentSituationTotal`, `forwardPlanningTotal`, `wantTotal`, `potentialSavings`, and includes only items with `cost > 0 || total > 0`.
- Uses the same forward-planning/needs-wants category-name constants at module scope (`summary/page.tsx:63-71`).
- Grand totals for children/adults/household current, forward, and savings (`summary/page.tsx:505-517`).
- Export: `handleExport` (`summary/page.tsx:440-503`) builds a CSV data-URI and triggers a download; `handlePrint` (`summary/page.tsx:436-438`) calls `window.print()`. Print-hidden controls via `print:hidden` classes.
- Rendering: top grand-totals card, per-category tables via `renderCategoryTable` (`summary/page.tsx:548-650`) with a "Modified"/"Want" `Badge` and green savings highlight, inside collapsible per-entity sections (`summary/page.tsx:785-953`).

---

## Cross-Component Connections & Data Flow

1. **Seeding**: Creating a Child/Adult/Household (`/children`, `/adults`, `/household`) calls the matching `initialize*Data()` in `lib/db.ts`, which copies the corresponding `default*Categories` template (categories + zero-cost items) into IndexedDB.
2. **Budget entry**: The detail pages (`/categories`, `/adult-categories`, `/household-categories`) read those categories/items, let the user set `cost`/`frequency`/`quantity`, and store `total = calculateAnnualCost(...)`. Percentage-based "Miscellaneous" categories are computed live from the sum of the other categories' item totals.
3. **Analysis (read-only aggregation)**: `/dashboard` re-reads all entities/categories/items and aggregates totals for charts; it does not write (except nothing).
4. **Planning (adjustment layer)**: `/planning` reads the same data and writes two extra per-item fields — `needWant` and `adjustedTotal` — plus in-load `needWant` migrations. Forward-planning totals use `adjustedTotal ?? total`.
5. **Reporting**: `/summary` recomputes the current-vs-forward comparison from the persisted `needWant`/`adjustedTotal` values and offers CSV export / print. It only ever reads the first household (`summary/page.tsx:108-112`).
6. **Shared contracts**: All pages depend on the interfaces, templates, and helpers in `lib/db.ts`; currency rendering everywhere goes through `formatCurrency` in `lib/config.ts`; headers/nav come from `components/page-header.tsx` and `components/bottom-nav.tsx`.
7. **Category-name coupling**: `/planning` and `/summary` classify categories by matching `category.name` against hard-coded constant arrays; those constants are the single point of coupling between the seed templates in `lib/db.ts` and the forward-planning/needs-wants behavior (with the string differences noted in the `/planning` section above).

## Notable "exists but unused" items
- `settings` table in `lib/db.ts:96-99,125` — never read/written by any page.
- `hooks/use-toast.ts` + `components/ui/toaster.tsx` — no route mounts `<Toaster />`.
- `components/theme-provider.tsx` — not imported by the root layout.
- `styles/globals.css` — duplicate stylesheet; the layout imports `app/globals.css`.
- `Child.region` (`lib/db.ts:8`) — defined but not collected in the `/children` form.
- `app/categories/loading.tsx:1-3` — route `loading` UI that returns `null`.

## Repository state
- The workspace is **not** a git repository (`git` reports "not a git repository"), so there is no commit history to reference. The `.next/` build cache and `node_modules/` are present on disk; `.gitignore`, `package-lock.json`, and `pnpm-lock.yaml` all exist at the project root.
