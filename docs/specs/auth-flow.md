# Authentication Flow Specification

**Status:** Ready for implementation  
**Priority:** P0  
**Dependencies:** Supabase schema deployed

---

## Overview

This spec defines the complete authentication flow using Supabase Auth with email/password. All users get free access (Founding Members, invite only).

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
| `promo_code`  | string | Valid in promo_codes table | No (but encouraged) |




### 1.3 Implementation Steps

```typescript
// 1. Validate promo code (if provided)
const { data: promoValid } = await supabase
  .rpc('validate_promo_code', { code_input: promoCode });

if (promoCode && !promoValid?.[0]?.valid) {
  setError('Invalid promo code');
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
- [ ] Confirmed user can sign in later and reach `/household` / `/dashboard` normally

---



## 2. Sign In Flow



### 2.1 User Journey

```
/login page → Enter credentials → Authenticate → Sync data → Redirect to /dashboard
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

// 6. Redirect based on onboarding status
const { data: profile } = await supabase
  .from('profiles')
  .select('onboarding_status')
  .eq('id', data.user.id)
  .single();

if (profile?.onboarding_status === 'plan_complete') {
  router.push('/dashboard');
} else {
  router.push('/household');
}
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



### 3.1 Implementation Steps

```typescript
// 1. Log activity before signing out
await supabase.rpc('log_activity', {
  p_event_type: 'logout',
  p_message: 'User signed out',
});

// 2. Sign out from Supabase
const { error } = await supabase.auth.signOut();

// 3. Clear local state
setUser(null);
setSession(null);
setProfile(null);

// 4. Clear sync queue (optional - keep local data for offline use)
// await clearSyncQueue();

// 5. Redirect to landing
router.push('/');
```

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



## 5. Password Reset (Future)



### 5.1 Request Reset

```typescript
const { error } = await supabase.auth.resetPasswordForEmail(email, {
  redirectTo: `${window.location.origin}/reset-password`,
});
```



### 5.2 Complete Reset

```typescript
const { error } = await supabase.auth.updateUser({
  password: newPassword,
});
```

---



## 6. Files to Create/Modify


| File                       | Action | Description               |
| -------------------------- | ------ | ------------------------- |
| `lib/supabase.ts`          | Modify | Add auth helper functions; set `emailRedirectTo` on signUp |
| `contexts/AuthContext.tsx` | Create | Auth state provider       |
| `components/providers.tsx` | Create | Provider wrapper          |
| `app/layout.tsx`           | Modify | Wrap with Providers       |
| `app/signup/page.tsx`      | Modify | Use real Supabase auth; show Check your email when confirmation required |
| `app/login/page.tsx`       | Create | User login page; map email-not-confirmed error |
| `hooks/use-auth.ts`        | Create | Convenience hook          |
| `app/auth/callback/route.ts` | Create | Exchange confirmation code for session; redirect to `/household` |
| `middleware.ts`            | Modify | Treat `/auth/callback` as public |


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