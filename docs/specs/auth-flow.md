# Authentication Flow Specification

**Status:** Ready for implementation  
**Priority:** P0  
**Dependencies:** Supabase schema deployed

---

## Overview

This spec defines the complete authentication flow using Supabase Auth with email/password. Soft launch is invite-only via promo — see [`soft-launch-invite.md`](./soft-launch-invite.md). All users who redeem a valid code get free access (Founding Members).

---

## 1. Sign Up Flow

### 1.1 User Journey

```
/signup page → Enter details → Validate promo → Create account → Redirect to /household
```

### 1.2 Required Fields


| Field         | Type   | Validation                 | Required            |
| ------------- | ------ | -------------------------- | ------------------- |
| `email`       | string | Valid email format         | Yes                 |
| `password`    | string | Min 8 chars                | Yes                 |
| `family_name` | string | Non-empty after trim       | Yes                 |
| `promo_code`  | string | Valid in promo_codes table | **Yes** (soft launch) |




### 1.3 Implementation Steps

```typescript
// 1. Promo code is required
const { data: promoValid } = await supabase
  .rpc('validate_promo_code', { code_input: promoCode });

if (!promoCode?.trim() || !promoValid?.[0]?.valid) {
  setError('A valid promo code is required');
  return;
}

// 2. Sign up with Supabase Auth
const { data, error } = await supabase.auth.signUp({
  email,
  password,
  options: {
    data: {
      family_name: familyName.trim(),
      promo_code_used: promoCode?.toUpperCase() || null,
    },
  },
});

// 3. Handle response
if (error) {
  setError(error.message);
  return;
}

// 4. Redeem promo code (if valid)
if (promoCode && promoValid?.[0]?.valid) {
  await supabase.rpc('redeem_promo_code', { code_input: promoCode });
}

// 5. Check if email confirmation required
if (data.user && !data.session) {
  // Email confirmation required
  setShowConfirmationMessage(true);
  return;
}

// 6. Redirect to onboarding
router.push('/household');
```



### 1.4 Error States


| Error                    | Message                                     | Recovery                 |
| ------------------------ | ------------------------------------------- | ------------------------ |
| Email already registered | "An account with this email already exists" | Link to /login           |
| Promo code missing       | "A valid promo code is required"            | Focus promo field        |
| Invalid promo code       | "This promo code is invalid or expired"     | Clear promo field        |
| Weak password            | "Password must be at least 8 characters"    | Highlight password field |
| Network error            | "Unable to connect. Please try again."      | Show retry button        |




### 1.5 Post-Signup Trigger

The database trigger `handle_new_user()` automatically:

1. Creates a row in `profiles` table
2. Logs signup event in `activity_log`

### 1.6 Email Confirmation Flow (Production)

**Status:** Implemented in app — verify on production after deploy  
**When this applies:** Supabase Auth → Providers → Email → **Confirm email** is ON (recommended for production).

**Email delivery note:** By default Supabase sends confirmation emails (e.g. from their mail domain). For client-branded sender addresses (e.g. `noreply@mybalancedfamilyfinances.com`), configure **Custom SMTP** + DNS (SPF/DKIM) in the Supabase Dashboard. That is ops/config scope, not app code.

#### Problem this section solves

With Confirm email enabled:

1. `signUp()` creates a user but returns **no session** (`user` exists, `session` is null)
2. Supabase sends a confirmation email
3. The user is **not logged in** until they click the email link
4. The app must **not** show “Start budgeting” or send them to `/household` until they are confirmed and have a session

#### User journey

```
/signup → Create account → (no session) → "Check your email" screen
    ↓
User opens email → clicks confirmation link
    ↓
App /auth/callback exchanges code → sets session cookie
    ↓
Redirect to /household (logged in)
```

If the user tries `/household` before confirming → middleware redirects to `/login`.

#### 1.6.1 After signup — show confirm-email screen (not success + Start budgeting)

When `needsEmailConfirmation === true` (i.e. `data.user && !data.session`):

**UI requirements:**

| Element | Content |
|---------|---------|
| Title | Check your email |
| Body | We sent a confirmation link to **{email}**. Click the link to activate your account, then you can start budgeting. |
| Primary action | None that goes to `/household` |
| Secondary action | **Back to sign in** → `/login` |
| Optional | **Resend confirmation email** (nice-to-have) |

**Do not show:**

- “Welcome to the family!” as if they are ready to enter the app
- **Start budgeting** button that navigates to `/household`

**Code gate (signup page):**

```typescript
const { error, needsEmailConfirmation } = await signUp(...)

if (error) {
  setError(error.message)
  return
}

if (needsEmailConfirmation) {
  setShowConfirmationMessage(true) // show Check your email screen
  return
}

// Only if session exists (Confirm email OFF in Supabase):
setIsSubmitted(true) // or router.push('/household')
```

#### 1.6.2 `emailRedirectTo` on signUp

Confirmation emails must return the user to the app callback route, not a bare homepage.

```typescript
await supabase.auth.signUp({
  email,
  password,
  options: {
    data: metadata,
    emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`,
  },
})
```

Production value example:

`https://mybalancedfamilyfinances.com/auth/callback`

#### 1.6.3 Auth callback route

**Create:** `app/auth/callback/route.ts`

**Responsibility:**

1. Prefer `token_hash` + `type` → `verifyOtp` (works when email is opened on another device)
2. Fallback: `code` → `exchangeCodeForSession` (PKCE / OAuth)
3. On success → redirect to `/household`
4. On failure → redirect to `/login?error=confirmation_failed`

```typescript
// GET /auth/callback?token_hash=...&type=email  (preferred)
if (token_hash && type) {
  await supabase.auth.verifyOtp({ type, token_hash })
  return redirect('/household')
}
// GET /auth/callback?code=...
if (code) {
  await supabase.auth.exchangeCodeForSession(code)
  return redirect('/household')
}
return redirect('/login?error=confirmation_failed')
```

**Middleware:** Add `/auth/callback` to public routes so the exchange can run without an existing session.

#### 1.6.4 Supabase Dashboard configuration

**Authentication → URL Configuration:**

| Setting | Value |
|---------|--------|
| Site URL | `https://mybalancedfamilyfinances.com` |
| Redirect URLs | `https://mybalancedfamilyfinances.com/**` |
| Redirect URLs | `https://mybalancedfamilyfinances.com/auth/callback` (explicit, optional if `/**` already covers it) |
| Redirect URLs (test) | `https://family-budgeting-tool-one.vercel.app/**` |

**Authentication → Email Templates → Confirm signup:**

Use the token-hash link (required for reliable PKCE / SSR confirmation). Replace the default `{{ .ConfirmationURL }}` button href with:

```html
<a href="{{ .SiteURL }}/auth/callback?token_hash={{ .TokenHash }}&type=email">Confirm your email</a>
```

Without this template change, the default confirmation URL often fails `exchangeCodeForSession` when the user opens the email in a different browser or device.

#### 1.6.5 Sign in before email confirmed

If user signs in before clicking the email link:

| Error | Message | Recovery |
|-------|---------|----------|
| Email not confirmed | Please check your email to confirm your account | Link to resend (optional) + stay on `/login` |

Map Supabase `email_not_confirmed` / “Email not confirmed” to that message in login UI.

#### 1.6.6 Acceptance criteria (email confirmation)

- [ ] After signup with Confirm email ON, user sees **Check your email** screen (not Start budgeting)
- [ ] Unconfirmed user cannot access `/household` (middleware redirects to `/login`)
- [ ] Clicking the email confirmation link lands on `/auth/callback`, then `/household` while logged in
- [ ] `emailRedirectTo` uses `NEXT_PUBLIC_APP_URL` + `/auth/callback`
- [ ] Login before confirm shows a clear “confirm your email” message
- [ ] Confirmed user can sign in later and land on `/` (Balance)

---



## 2. Sign In Flow



### 2.1 User Journey

```
/login page → Enter credentials → Authenticate → Sync data → Redirect to / (Balance)
/login page → Forgot your password? → email → /auth/set-password (see §5)
```



### 2.2 Implementation Steps

```typescript
// 1. Sign in with Supabase
const { data, error } = await supabase.auth.signInWithPassword({
  email,
  password,
});

// 2. Handle errors
if (error) {
  if (error.message.includes('Invalid login')) {
    setError('Invalid email or password');
  } else {
    setError('Unable to sign in. Please try again.');
  }
  return;
}

// 3. Update last_active_at
await supabase
  .from('profiles')
  .update({ last_active_at: new Date().toISOString() })
  .eq('id', data.user.id);

// 4. Log activity
await supabase.rpc('log_activity', {
  p_event_type: 'login',
  p_message: 'User signed in',
});

// 5. Trigger sync from cloud to local
await syncFromCloud();

// 6. Returning users land on Balance. Honor ?redirect= if it is a safe app path.
const dest = safeInternalPath(searchParams.get('redirect'), '/')
window.location.href = dest
```



### 2.3 Error States


| Error               | Message                                            | Recovery                 |
| ------------------- | -------------------------------------------------- | ------------------------ |
| Wrong credentials   | "Invalid email or password"                        | Clear password field     |
| Account not found   | "No account found with this email"                 | Link to /signup          |
| Email not confirmed | "Please check your email to confirm your account"  | Resend link option       |
| Too many attempts   | "Too many login attempts. Try again in 5 minutes." | Disable form temporarily |


---



## 3. Sign Out Flow



### 3.1 UI

Logged-in family users must be able to sign out from the app (not only admin).

| Location | Control |
|----------|---------|
| `components/page-header.tsx` | **Sign out** button (top-right) when `user` is present |

Shown on pages that use `PageHeader` (Household, Children, Adults, Dashboard, Planning, Summary, etc.).

### 3.2 Implementation Steps

```typescript
// 1. Log activity before signing out (optional if RPC unavailable)
await supabase.rpc('log_activity', {
  p_event_type: 'logout',
  p_message: 'User signed out',
});

// 2. Sign out from Supabase via AuthContext.signOut()
const { error } = await signOut();

// 3. Clear local state (handled by AuthContext)

// 4. Clear sync queue (optional - keep local data for offline use)
// await clearSyncQueue();

// 5. Hard redirect to landing (clears client state cleanly)
window.location.href = '/';
```

### 3.3 Acceptance criteria

- [ ] Signed-in user sees **Sign out** on app pages with PageHeader
- [ ] Clicking Sign out ends the session and returns to `/`
- [ ] Visiting `/household` after sign out redirects to `/login`
- [ ] Signing in again restores cloud/local budget data for that account

---



## 4. Session Management



### 4.1 AuthContext Provider

```typescript
// contexts/AuthContext.tsx
interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  session: Session | null;
  loading: boolean;
  isAdmin: boolean;
  signIn: (email: string, password: string) => Promise<AuthResult>;
  signUp: (email: string, password: string, metadata: SignUpMetadata) => Promise<AuthResult>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}
```



### 4.2 Session Persistence

- Supabase handles session persistence automatically via localStorage
- Auto-refresh tokens before expiry
- `onAuthStateChange` listener updates context on changes

```typescript
useEffect(() => {
  // Get initial session
  supabase.auth.getSession().then(({ data: { session } }) => {
    setSession(session);
    setUser(session?.user ?? null);
  });

  // Listen for auth changes
  const { data: { subscription } } = supabase.auth.onAuthStateChange(
    async (event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        await fetchProfile(session.user.id);
      }
    }
  );

  return () => subscription.unsubscribe();
}, []);
```



### 4.3 Token Refresh

Supabase SDK handles automatic token refresh. If refresh fails:

```typescript
supabase.auth.onAuthStateChange((event, session) => {
  if (event === 'TOKEN_REFRESHED') {
    console.log('Token refreshed successfully');
  }
  
  if (event === 'SIGNED_OUT') {
    // Session expired or user signed out
    router.push('/login');
  }
});
```

---



## 5. Password reset

**Status:** Implemented — same page as coach invite password setup ([`coach-editing.md`](./coach-editing.md) §5.1)

Supabase does not store the plaintext password. Reset is always "send a link, then set a new password". Coach **Send invite** uses the same Supabase recovery email. There is one family page: `/auth/set-password`. There is no `/reset-password` route.

### 5.1 User journeys

**A. Family forgot password**

```
/login → enter email → Forgot your password?
  → Supabase recovery email (redirectTo = {origin}/auth/set-password)
  → /auth/set-password → new password (min 8) → /
```

**B. Coach invite (unclaimed family)**  
Admin **Send invite** → same email template → `/auth/set-password` → `/` → `claim_family_budget()`.

**C. Recovery email from the Supabase dashboard**  
Dashboard uses **Site URL** (`https://mybalancedfamilyfinances.com`), not `/auth/set-password`. The app must detect `type=recovery` on any other path and keep the query/hash while sending the browser to `/auth/set-password`.

### 5.2 `/login` request

- Control: **Forgot your password?** under the sign-in form. Not a stub, not an alert.
- Email: the address already in the email field, trimmed and lowercased. If empty: **"Enter your email first, then click Forgot your password."**
- Call:

```typescript
await supabase.auth.resetPasswordForEmail(email, {
  redirectTo: `${window.location.origin}/auth/set-password`,
})
```

- Success (always the same copy, whether or not the email exists): **"Check that inbox for a link to set a new password."**
- Failure: show the Supabase error (rate limit, SMTP). Stay on `/login`.
- Do not reveal "no account with that email".

**Out of scope:** `/admin/login` Forgot password stays disabled. An admin resets via family `/login` with that email, or via the Auth dashboard (journey C).

### 5.3 `/auth/set-password`

Public route (middleware). No session required to open the page; the link creates the recovery session.

**Establish session** (in this order):

1. `#error_description` or `?error_description` → invalid, show the message
2. Hash `access_token` + `refresh_token` → `setSession`
3. Query `token_hash` + `type` → `verifyOtp`
4. Query `code` → `exchangeCodeForSession`
5. Else if a session already exists (open tab) → ready
6. Else → invalid: **"This link has expired or was already used."**

After a successful token consume, `history.replaceState` so the tokens leave the URL.

**Form:** new password + confirm. Rules: [`validatePassword`](../../lib/utils/validators.ts) (min 8, max 128) and `validatePasswordConfirmation`. Then `supabase.auth.updateUser({ password })`. Full navigation to `/` so auth, sync, and coach claim boot cleanly.

**Invalid link copy:** **"Use Forgot your password on the sign-in page, or ask your coach to resend the invite."** + **Go to sign in** → `/login`.

**Do not** send a recovery session from `/login` or `/` into the normal post-login redirect. That skips setting a password. Catch `type=recovery` first.

### 5.4 Auth callback

`GET /auth/callback`: if `type=recovery` and `next` is absent, redirect to `/auth/set-password` after `verifyOtp` / code exchange. Confirmation emails still default to `/household` (then the family home).

### 5.5 Ops

| Setting | Value |
| ------- | ----- |
| Redirect URLs | `https://mybalancedfamilyfinances.com/**` already covers `/auth/set-password` |
| Email template | Shared "Reset password" template. Neutral wording: set your password for My Balanced Family Finances |
| SMTP | Custom SMTP required in production. Built-in mailer is rate-limited |

### 5.6 Acceptance

- [ ] `/login` Forgot your password sends a recovery email when an email is entered
- [ ] Empty email shows the enter-email message, no request
- [ ] Link opens `/auth/set-password`, not `/login` and not `/`
- [ ] Dashboard recovery emails that land on Site URL still reach `/auth/set-password`
- [ ] New password min 8; mismatch blocked; success lands on `/` signed in
- [ ] Expired/used link explains what to do and links to `/login`
- [ ] Coach invite and family reset share this page
- [ ] `/auth/set-password` is public in middleware

---

## 6. Files to Create/Modify


| File                       | Action | Description               |
| -------------------------- | ------ | ------------------------- |
| `lib/supabase.ts`          | Modify | Add auth helper functions; set `emailRedirectTo` on signUp |
| `contexts/AuthContext.tsx` | Create | Auth state provider       |
| `components/providers.tsx` | Create | Provider wrapper          |
| `app/layout.tsx`           | Modify | Wrap with Providers       |
| `app/signup/page.tsx`      | Modify | Use real Supabase auth; show Check your email when confirmation required |
| `app/login/page.tsx`       | Create | User login page; map email-not-confirmed error; Forgot your password |
| `hooks/use-auth.ts`        | Create | Convenience hook          |
| `app/auth/callback/route.ts` | Create | Exchange confirmation / recovery; recovery → `/auth/set-password` |
| `app/auth/set-password/page.tsx` | Create | Set password from invite or reset link |
| `components/auth-recovery-redirect.tsx` | Create | Dashboard recovery emails that hit Site URL |
| `middleware.ts`            | Modify | Treat `/auth/callback` and `/auth/set-password` as public |


---



## 7. Acceptance Criteria

- [ ] User can sign up with email/password and promo code
- [ ] User can sign in with email/password
- [ ] User can sign out
- [ ] Session persists across page refreshes
- [ ] Session expires after inactivity (default: 1 week)
- [ ] Invalid credentials show appropriate error messages
- [ ] Promo code validation works before account creation
- [ ] Profile is auto-created via database trigger
- [ ] Activity is logged on signup/login/logout
- [ ] Email confirmation flow works end-to-end (see §1.6.6)
- [ ] Password reset works end-to-end (see §5.6)