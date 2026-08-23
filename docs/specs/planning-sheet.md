# Planning Sheet Specification

**Status:** Implemented — lists and consumers match this spec. Confirm on `/planning` after deploy when those categories have costs.  
**Priority:** P0  
**Dependencies:** Budget calculations, category templates in `lib/db.ts`  
**Related:** [`budget-calculations.md`](./budget-calculations.md) (math), [`admin-consultation-view.md`](./admin-consultation-view.md) (read-only copy)

---

## Overview

The Planning sheet (`/planning`) lets a family see **current situation** (amounts already entered in the budget) and set a **forward plan**. Two card layouts exist today. This spec states **which categories** get which layout.

Source of the category list: client Planning-sheet feedback. Scope is Planning (and the same rules on Summary + admin consultation). Budget entry screens do not change.

---

## 1. Product rules

| Rule | Behaviour |
|------|-----------|
| Two layouts only | Do not invent a third card type. |
| Names from templates | Match `lib/db.ts` category `name` exactly. Client wording is mapped in §3. |
| Shared lists | Family Planning, family Summary, and admin consultation all import `lib/planning-categories.ts`. |
| Empty cards | Categories with no items that have `cost > 0` stay hidden (existing rule). |
| Need/want is a list | More than one category per entity can be Need/Want. |
| Math unchanged | Totals still follow [`budget-calculations.md`](./budget-calculations.md). |

### 1.1 Out of scope

- Budget entry (`/categories`, `/adult-categories`, `/household-categories`)
- New categories or new line items
- Signup, email, admin login
- New formulas

---

## 2. Layouts

### 2.1 Forward planning (Education / Utilities)

Each entered item shows:

- **Current situation** — read-only `item.total` from the budget
- **Forward planning** — editable `adjustedTotal` (defaults to `item.total`)

No Need / Want buttons.

### 2.2 Need / want (Extracurricular / Fitness)

Each entered item shows:

- **Need** and **Want** buttons (`needWant`)
- **Forward planning** — editable `adjustedTotal`

Admin consultation is display-only: show Need/Want badge and planned amount; no buttons.

### 2.3 Totals (unchanged)

| Value | Rule |
|-------|------|
| Current situation (entity) | Sum of all non-misc item `total` + miscellaneous % of that sum |
| Forward planning items | Sum of `adjustedTotal ?? total` on **forward-planning** categories |
| Needs total | Sum of `adjustedTotal ?? total` on **need/want** categories where `needWant === 'need'` |
| Misc forward | Miscellaneous % of (needs total + forward-planning items) |
| Forward planning (entity) | Forward items + needs total + misc forward |
| Potential savings | Current − forward |
| Wants | Need/want items with `needWant === 'want'` (shown, not in the forward plan) |

---

## 3. Name mapping (client → stored)

| Client said | Stored `category.name` |
|-------------|------------------------|
| Holiday | `Holiday` |
| Child Communication and Subscriptions | `Child Communication and Subscriptions` |
| Personal Debt Repayment | `Personal Debt Repayment` |
| Adult Holidays/Solo Travel | `Adult Holidays/ Solo Travel` |
| Adult Communication and Subscriptions | `Adult Communications & Subscriptions` |
| Housing | `Housing` |
| Groceries & Household Supplies | `Groceries & Household Supplies` |
| Entertainment & Recreation | `Entertainment & Recreation` |
| Family Holiday | `Family Holidays` |
| Communication and Subscriptions (household) | `Communications & Subscriptions` |

Implement against the **stored** name.

---

## 4. Category lists

Existing Education / Extracurricular / Fitness / Utilities (and other categories already on these lists) stay. Client additions are marked **add**.

### 4.1 Children — forward planning (layout 2.1)

```
Education
Medical & Special Needs
Clothing & Toys
Entertainment/Events
Parties & Social
Holiday                    // add
```

### 4.2 Children — need/want (layout 2.2)

```
Extracurricular
Child Communication and Subscriptions   // add
```

### 4.3 Adults — forward planning (layout 2.1)

```
Education
Medical
Vehicles/Transport
Personal Debt Repayment    // add (was wrongly listed as Debt Repayment)
Personal
Gifting
Adult Holidays/ Solo Travel   // add
```

### 4.4 Adults — need/want (layout 2.2)

```
Fitness
Adult Communications & Subscriptions   // add
```

### 4.5 Household — forward planning (layout 2.1)

```
Housing                              // add (was wrongly listed as Mortgage/Rent)
Utilities
Scheduled Maintenance
Insurance
Groceries & Household Supplies       // add (was Groceries)
Entertainment & Recreation           // add (was Entertainment)
Eating Out
Pets
Family Holidays                      // add
```

### 4.6 Household — need/want (layout 2.2)

```
Communications & Subscriptions       // add (was wrongly listed as Subscriptions)
```

Miscellaneous stays percentage-based (current + forward from the formula). It is not on either list.

---

## 5. Implementation

### 5.1 Source of truth in code

`lib/planning-categories.ts` exports:

- `CHILD_FORWARD_PLANNING`, `ADULT_FORWARD_PLANNING`, `HOUSEHOLD_FORWARD_PLANNING` — `string[]`
- `CHILD_NEEDS_WANTS`, `ADULT_NEEDS_WANTS`, `HOUSEHOLD_NEEDS_WANTS` — `string[]` (not a single string)
- `forwardPlanningNames(entityType)`, `needsWantsNames(entityType)`

A category is Need/Want if `needsWantsNames(type).includes(category.name)`.

### 5.2 Files that must import those lists

| File | Use |
|------|-----|
| `app/planning/page.tsx` | Layout + totals + default Need on entered items |
| `app/summary/page.tsx` | Same classification for the summary tables |
| `lib/consultation-totals.ts` | Admin / shared totals |
| `app/admin/families/[id]/view/planning/page.tsx` | Read-only same layouts |
| `app/admin/families/[id]/view/summary/page.tsx` | Read-only same totals |

Do not hard-code category names in those pages after this spec.

### 5.3 Do not change

`lib/db.ts` templates, budget write pages, auth, sync.

---

## 6. Acceptance criteria

From the client note. Check on `/planning` after the family has entered costs in that category.

- [x] Children **Holiday**: Current situation from the budget + Forward Planning, same as Education
- [x] Children **Child Communication and Subscriptions**: Need / Want + Forward Planning, same as Extracurricular
- [x] Adults **Personal Debt Repayment**: Current + Forward Planning, same as Education
- [x] Adults **Adult Holidays/ Solo Travel**: Current + Forward Planning, same as Education
- [x] Adults **Adult Communications & Subscriptions**: Need / Want + Forward Planning, same as Fitness
- [x] Household **Housing**, **Groceries & Household Supplies**, **Entertainment & Recreation**, **Family Holidays**: Current + Forward Planning, same as Utilities
- [x] Household **Communications & Subscriptions**: Need / Want + Forward Planning, same as Fitness
- [x] Admin consultation Planning / Summary use the same lists and totals
- [ ] Categories with no entered costs stay hidden (existing rule — confirm on device)
