# Admin Panel Specification

**Status:** Ready for implementation  
**Priority:** P0  
**Dependencies:** Auth flow, Supabase schema, Protected routes

---

## Overview

This spec defines the admin panel functionality for the founder to manage users, promo codes, and view activity. The admin panel uses real Supabase data with RLS policies that grant read access to all user data for admin users.

---

## 1. Admin Authentication

### 1.1 Admin Login Flow

Admin login uses the same Supabase Auth as regular users, but checks the `is_admin` flag.

```typescript
// app/admin/login/page.tsx
async function handleAdminLogin(email: string, password: string) {
  // 1. Sign in normally
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  
  if (error) {
    setError('Invalid credentials');
    return;
  }
  
  // 2. Check admin status
  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', data.user.id)
    .single();
  
  if (!profile?.is_admin) {
    await supabase.auth.signOut();
    setError('Admin access required');
    return;
  }
  
  // 3. Redirect to admin dashboard
  router.push('/admin');
}
```

### 1.2 Setting Admin Flag

Manually set via Supabase SQL Editor:

```sql
-- Grant admin access to a user
UPDATE profiles 
SET is_admin = TRUE 
WHERE email = 'admin@example.com';
```

---

## 2. Users Tab

### 2.1 Data Query

```typescript
// app/admin/components/users-tab.tsx
async function fetchUsers() {
  const { data, error } = await supabase
    .from('profiles')
    .select(`
      id,
      email,
      family_name,
      promo_code_used,
      onboarding_status,
      signed_up_at,
      last_active_at
    `)
    .order('signed_up_at', { ascending: false });
  
  return data;
}
```

### 2.2 Table Columns

| Column | Source | Format |
|--------|--------|--------|
| Family Name | `family_name` | Text, link to detail |
| Email | `email` | Text |
| Status | `onboarding_status` | Badge (color-coded) |
| Promo Code | `promo_code_used` | Badge or "—" |
| Signed Up | `signed_up_at` | Relative date |
| Last Active | `last_active_at` | Relative date |

### 2.3 Status Badges

| Status | Badge Style | Description |
|--------|-------------|-------------|
| `signed_up` | Gray | Just registered |
| `profile_complete` | Blue | Entered family details |
| `budget_started` | Amber | Started entering budget |
| `plan_complete` | Green | Completed budget plan |

### 2.4 Row Click Action

Navigate to family detail page:

```typescript
function handleRowClick(userId: string) {
  router.push(`/admin/families/${userId}`);
}
```

---

## 3. Family Detail View

### 3.1 Route

`/admin/families/[id]`

### 3.2 Data Query

```typescript
async function fetchFamilyDetail(userId: string) {
  const [
    profileResult,
    householdResult,
    childrenResult,
    adultsResult,
    categoriesResult,
    itemsResult,
  ] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', userId).single(),
    supabase.from('households').select('*').eq('user_id', userId).single(),
    supabase.from('children').select('*').eq('user_id', userId),
    supabase.from('adults').select('*').eq('user_id', userId),
    supabase.from('categories').select('*').eq('user_id', userId),
    supabase.from('expense_items').select('*').eq('user_id', userId),
  ]);
  
  return {
    profile: profileResult.data,
    household: householdResult.data,
    children: childrenResult.data || [],
    adults: adultsResult.data || [],
    categories: categoriesResult.data || [],
    items: itemsResult.data || [],
  };
}
```

### 3.3 Page Sections

1. **Header**
   - Family name
   - Email
   - Onboarding status badge
   - "Signed up [date] · Last active [relative]"

2. **Profile Card**
   - Adults (name, age)
   - Children (name, age, school level)
   - Housing type
   - Promo code used

3. **Budget Summary Row**
   - Total annual plan
   - Fortnightly set-aside (annual ÷ 26)
   - Categories completed (X of Y)

4. **Budget Breakdown**
   - Collapsible sections for Children / Adults / Household
   - Each category shows: name, annual total, item count
   - Expanding shows item table (read-only)

### 3.4 Open Consultation

Primary CTA on the briefing header:

```
Open consultation → /admin/families/[id]/view/dashboard
```

Consultation is specified in [`admin-consultation-view.md`](./admin-consultation-view.md). The briefing page stays as the one-page coaching overview.

### 3.5 Read-Only Enforcement

Admin can only view, not edit. RLS policies enforce this:

```sql
-- Admins can only SELECT, not INSERT/UPDATE/DELETE
CREATE POLICY "Admins can view all expense items" 
  ON expense_items FOR SELECT 
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = TRUE)
  );

-- No INSERT/UPDATE/DELETE policy for admins on user data
```

---

## 4. Promo Codes Tab

### 4.1 Data Query

```typescript
async function fetchPromoCodes() {
  const { data, error } = await supabase
    .from('promo_codes')
    .select('*')
    .order('created_at', { ascending: false });
  
  return data;
}
```

### 4.2 Table Columns

| Column | Source | Format |
|--------|--------|--------|
| Code | `code` | Mono text |
| Description | `description` | Text |
| Redemptions | `redemptions` / `max_redemptions` | "X / Y" or "X" |
| Status | `status` | Badge |
| Expires | `expires_at` | Date or "Never" |
| Actions | — | Edit, Expire buttons |

### 4.3 Create Promo Code Dialog

```typescript
interface CreatePromoCodeForm {
  code: string;            // Required, uppercase
  description: string;     // Optional
  maxRedemptions: number | null;  // Optional
  expiresAt: Date | null;  // Optional
}

async function createPromoCode(form: CreatePromoCodeForm) {
  const { error } = await supabase.from('promo_codes').insert({
    code: form.code.toUpperCase(),
    description: form.description || null,
    max_redemptions: form.maxRedemptions || null,
    expires_at: form.expiresAt?.toISOString() || null,
    status: 'active',
  });
  
  if (error) {
    if (error.code === '23505') {
      setError('This code already exists');
    } else {
      setError('Failed to create code');
    }
    return;
  }
  
  closeDialog();
  refreshCodes();
}
```

### 4.4 Edit Promo Code

```typescript
async function updatePromoCode(id: string, updates: Partial<PromoCode>) {
  const { error } = await supabase
    .from('promo_codes')
    .update(updates)
    .eq('id', id);
  
  if (!error) {
    refreshCodes();
  }
}
```

### 4.5 Expire Promo Code

```typescript
async function expirePromoCode(id: string) {
  await supabase
    .from('promo_codes')
    .update({ status: 'expired' })
    .eq('id', id);
}
```

---

## 5. Activity Log Tab

### 5.1 Data Query

```typescript
async function fetchActivityLog(limit: number = 50, search?: string) {
  let query = supabase
    .from('activity_log')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);
  
  if (search) {
    query = query.or(`family_name.ilike.%${search}%,message.ilike.%${search}%`);
  }
  
  return query;
}
```

### 5.2 Table Columns

| Column | Source | Format |
|--------|--------|--------|
| Time | `created_at` | Relative + tooltip with absolute |
| Family | `family_name` | Text or "System" |
| Event | `event_type` | Badge |
| Message | `message` | Text |

### 5.3 Event Type Badges

| Type | Badge Style | Description |
|------|-------------|-------------|
| `signup` | Green | User signed up |
| `login` | Blue | User logged in |
| `logout` | Gray | User logged out |
| `budget_update` | Amber | Budget modified |
| `promo_redemption` | Purple | Promo code used |

### 5.4 Search/Filter

- Text search on `family_name` and `message`
- Debounced (300ms)
- Filter by event type (optional)
- Date range filter (optional, v1.1)

---

## 6. Subscriptions Tab (Stats)

### 6.1 Summary Stats Query

```typescript
async function fetchAdminStats() {
  // Total users
  const { count: totalUsers } = await supabase
    .from('profiles')
    .select('*', { count: 'exact', head: true });
  
  // Users by onboarding status
  const { data: statusCounts } = await supabase
    .from('profiles')
    .select('onboarding_status')
    .then(result => {
      const counts = result.data?.reduce((acc, p) => {
        acc[p.onboarding_status] = (acc[p.onboarding_status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      return { data: counts };
    });
  
  // Users by promo code
  const { data: promoCounts } = await supabase
    .from('profiles')
    .select('promo_code_used')
    .not('promo_code_used', 'is', null)
    .then(result => {
      const counts = result.data?.reduce((acc, p) => {
        acc[p.promo_code_used!] = (acc[p.promo_code_used!] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      return { data: counts };
    });
  
  // Active users (last 7 days)
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  
  const { count: activeUsers } = await supabase
    .from('profiles')
    .select('*', { count: 'exact', head: true })
    .gte('last_active_at', sevenDaysAgo.toISOString());
  
  return {
    totalUsers,
    statusCounts,
    promoCounts,
    activeUsers,
  };
}
```

### 6.2 Summary Cards

| Metric | Query | Icon |
|--------|-------|------|
| Total Families | `profiles` count | Users |
| Active This Week | `last_active_at >= 7 days ago` | Activity |
| Completed Onboarding | `onboarding_status = 'plan_complete'` | CheckCircle |
| Signups via Promo | `promo_code_used IS NOT NULL` | Tag |

### 6.3 Users Table

Same as Users Tab, but with additional "Actions" column (optional, v1.1).

---

## 7. Realtime Updates (Optional, v1.1)

### 7.1 Subscribe to Changes

```typescript
function subscribeToAdminUpdates() {
  // New signups
  supabase
    .channel('admin-profiles')
    .on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'profiles',
    }, (payload) => {
      showToast(`New signup: ${payload.new.family_name || payload.new.email}`);
      refreshUsers();
    })
    .subscribe();
  
  // New activity
  supabase
    .channel('admin-activity')
    .on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'activity_log',
    }, (payload) => {
      prependActivity(payload.new);
    })
    .subscribe();
}
```

---

## 8. Files to Modify/Create

| File | Action | Description |
|------|--------|-------------|
| `app/admin/login/page.tsx` | Modify | Add admin check |
| `app/admin/page.tsx` | Modify | Replace mock with real queries |
| `app/admin/families/[id]/page.tsx` | Modify | Replace mock with real data |
| `app/admin/components/users-tab.tsx` | Modify | Real Supabase queries |
| `app/admin/components/promo-codes-tab.tsx` | Modify | Real CRUD operations |
| `app/admin/components/activity-tab.tsx` | Modify | Real activity log |
| `app/admin/components/subscriptions-tab.tsx` | Modify | Real stats |
| `lib/admin-mock-data.ts` | Delete | Remove after migration |
| `lib/admin-state.ts` | Delete | Remove after migration |

---

## 9. Acceptance Criteria

- [ ] Admin can log in with admin credentials
- [ ] Non-admin users rejected from admin login
- [ ] Users table shows all registered families
- [ ] Clicking a user navigates to family detail
- [ ] Family detail shows profile, household, children, adults
- [ ] Family detail shows budget summary and breakdown
- [ ] Admin cannot edit user budget data (read-only)
- [ ] Promo codes can be created, edited, expired
- [ ] Activity log shows recent events with search
- [ ] Stats cards show accurate counts
- [ ] Mock data files removed after migration
