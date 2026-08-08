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

| Field | Type | Validation | Required |
|-------|------|------------|----------|
| `email` | string | Valid email format | Yes |
| `password` | string | Min 8 chars | Yes |
| `family_name` | string | Non-empty after trim | Yes |
| `promo_code` | string | Valid in promo_codes table | No (but encouraged) |

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

| Error | Message | Recovery |
|-------|---------|----------|
| Email already registered | "An account with this email already exists" | Link to /login |
| Invalid promo code | "This promo code is invalid or expired" | Clear promo field |
| Weak password | "Password must be at least 8 characters" | Highlight password field |
| Network error | "Unable to connect. Please try again." | Show retry button |

### 1.5 Post-Signup Trigger

The database trigger `handle_new_user()` automatically:
1. Creates a row in `profiles` table
2. Logs signup event in `activity_log`

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

| Error | Message | Recovery |
|-------|---------|----------|
| Wrong credentials | "Invalid email or password" | Clear password field |
| Account not found | "No account found with this email" | Link to /signup |
| Email not confirmed | "Please check your email to confirm your account" | Resend link option |
| Too many attempts | "Too many login attempts. Try again in 5 minutes." | Disable form temporarily |

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

| File | Action | Description |
|------|--------|-------------|
| `lib/supabase.ts` | Modify | Add auth helper functions |
| `contexts/AuthContext.tsx` | Create | Auth state provider |
| `components/providers.tsx` | Create | Provider wrapper |
| `app/layout.tsx` | Modify | Wrap with Providers |
| `app/signup/page.tsx` | Modify | Use real Supabase auth |
| `app/login/page.tsx` | Create | User login page |
| `hooks/use-auth.ts` | Create | Convenience hook |

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
