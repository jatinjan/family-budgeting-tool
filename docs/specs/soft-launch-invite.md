# Soft-launch invite funnel

**Status:** Implemented  
**Priority:** P0  
**Surface:** Family app only (`/`, `/login`, `/signup`)  
**Done already:** Wix marketing site — Get Started removed; Sign in + Register Now remain  
**Related:** [`auth-flow.md`](./auth-flow.md), [`balance-home.md`](./balance-home.md), [`admin-panel.md`](./admin-panel.md)

---

## Overview

Soft launch is **interest first**. Ads hit the Wix site. **Register Now** collects contact details. Niral emails a welcome, the app signup link, and a promo. The family then creates a login.

The app must **not** advertise self-serve Sign up. `/signup` stays as a **direct URL** for that email. Promo is **mandatory**. Cap this cohort with **FOUNDING20** (50 families).

```
Social ads → Wix → Register Now → Niral welcome email
                                → /signup + FOUNDING20 → account
Wix Sign in or app Sign in → /login
Guest Balance → Register Now (interest) or Sign In (save intention)
```

---

## 1. Product rules

| Rule | Behaviour |
|------|-----------|
| Public CTA | Guests see **Sign in** and **Register Now**. They do not see **Sign up** or **Get Started** in the app. |
| Register Now | Same Wix form as the website: `https://www.mybalancedfamilyfinances.com.au/?lightbox=zgssi` (opens “Get Access to My BFF”). Opens in a new tab. Constant: `APP_CONFIG.REGISTER_NOW_URL`. |
| Sign in | `/login`. Unchanged. |
| Sign up page | Keep `/signup`. Do not delete. Do not link it from header, Balance, or login. Niral’s email uses this URL. |
| Guest save intention | **Set your intention** goes to `/login` (must already have an account). Does not go to `/signup`. |
| Promo | Required, valid, active, under max redemptions, not expired. Submit blocked otherwise. |
| Cohort code | `FOUNDING20`, `max_redemptions = 50`, status `active`. |
| Paid launch later | Restore a public Get Started / Sign up CTA then; leave `/signup` in place now. |

### 1.1 Out of scope

- Wix / Kate’s site (done)
- Building a new interest form in Next.js
- Email / SMTP for the welcome message
- Payments
- Impersonation / admin typing into a family file
- Server-side Auth hook that rejects signup with no promo (UI gate is v1; metadata still stores `promo_code_used`)

---

## 2. Locked copy

### 2.1 Balance — under Set your intention (guest only)

Exact wording:

**Register Now** for interest or **Sign In** to save your intention.

- Register Now → `REGISTER_NOW_URL` (Wix lightbox)
- Sign In → `/login`

### 2.2 Guest PageHeader

- **Sign in** only (primary button → `/login`)
- No Sign up button

### 2.3 Login footer

**Don't have an account? Register Now for interest**

- Register Now → same `REGISTER_NOW_URL`
- No link to `/signup`

### 2.4 Signup promo field

- Label: **Promo code** with required marker `*`
- Placeholder: `e.g., FOUNDING20`
- Empty / invalid: block create; message **A valid promo code is required** or the existing invalid/expired/limit messages

---

## 3. User flows

### 3.1 New family (soft launch)

1. Social ad → Wix → Register Now
2. Niral sends welcome + `https://mybalancedfamilyfinances.com/signup` + `FOUNDING20`
3. They open `/signup`, enter family name, email, password, **FOUNDING20**, create account
4. After confirm/session → existing post-signup path (`/household`)

### 3.2 Existing family

1. Wix Sign in or app **Sign in** → `/login`
2. Balance intention saves as today (Dexie + profiles)

### 3.3 Guest on app Balance

1. May fill intention in memory
2. Helper: Register Now (interest) or Sign In (save)
3. **Set your intention** → `/login`

---

## 4. Signup validation (promo)

| Field | Required | Rule |
|-------|----------|------|
| family_name | Yes | Non-empty trim |
| email | Yes | Valid email |
| password | Yes | Min 8 chars (existing) |
| promo_code | **Yes** | Trim, uppercase; row in `promo_codes` with `status = active`; under `max_redemptions`; not past `expires_at` |

On submit: if they typed a code but did not click Apply, validate then. Do not create the Auth user until the code is valid.

Existing apply-button + redemption RPC stay. After a successful session, `redeem_promo_code` still runs (current behaviour).

---

## 5. FOUNDING20

| Field | Value |
|-------|--------|
| code | `FOUNDING20` |
| description | Soft launch founding family access |
| max_redemptions | 50 |
| status | active |
| expires_at | none unless Niral asks |

Create in production via Admin → Promo codes, **or** run [`supabase/diagnostics/20260912_founding20_promo.sql`](../../supabase/diagnostics/20260912_founding20_promo.sql). Seed the same row in [`supabase/schema.sql`](../../supabase/schema.sql) for new environments. Do not create 50 user accounts; the cap is redemptions.

---

## 6. Files

| File | Action |
|------|--------|
| `docs/specs/soft-launch-invite.md` | This spec |
| `docs/specs/README.md` | Index |
| `docs/specs/balance-home.md` | Guest: Sign in only; helper copy; Set intention → `/login` |
| `docs/specs/auth-flow.md` | `promo_code` required |
| `lib/config.ts` | `APP_CONFIG.REGISTER_NOW_URL` |
| `lib/balance-home.ts` | `BALANCE_GUEST_AUTH_PATH = '/login'` |
| `components/page-header.tsx` | Guest Sign in only |
| `app/page.tsx` | Helper links + copy §2.1 |
| `app/login/page.tsx` | Footer §2.3 |
| `app/signup/page.tsx` | Promo required §4 |
| `scripts/verify-balance-home.mjs` | Guest path is `/login` |
| `supabase/schema.sql` + diagnostics SQL | FOUNDING20 seed |

---

## 7. Verification checklist

- [ ] Guest `/` header: Sign in only; no Sign up
- [ ] Guest helper: exact copy §2.1; Register Now opens Wix form; Sign In goes to `/login`
- [ ] Guest Set your intention → `/login`
- [ ] `/login`: no Sign up to `/signup`; Register Now opens the same form
- [ ] `/signup` still loads by URL
- [ ] Signup with empty promo: blocked
- [ ] Signup with `FOUNDING20` (after the row exists): allowed
- [ ] Logged-in Balance unchanged (save intention still works)
- [ ] `node scripts/verify-balance-home.mjs` passes
