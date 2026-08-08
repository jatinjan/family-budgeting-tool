# Data Migration Specification

**Status:** Ready for implementation  
**Priority:** P0  
**Dependencies:** Auth flow, Sync layer, Supabase schema

---

## Overview

This spec defines how existing data in IndexedDB (from demo/guest usage) migrates to Supabase when a user signs up. This ensures users don't lose their work when they create an account.

---

## 1. Migration Scenarios

### 1.1 Scenario Matrix

| Scenario | Local Data | Cloud Data | Action |
|----------|------------|------------|--------|
| Fresh signup | None | None | No migration needed |
| Guest → User | Exists | None | Migrate local to cloud |
| Returning user | None | Exists | Pull from cloud |
| New device | None | Exists | Pull from cloud |
| Merge needed | Exists | Exists | Conflict resolution |

### 1.2 Primary Use Case: Guest → Registered User

A user has been using the app without signing in (data stored in IndexedDB). When they sign up, offer to migrate their existing data to their new account.

---

## 2. Migration Flow

### 2.1 User Journey

```
User clicks "Sign up"
       ↓
Complete signup form
       ↓
Auth successful
       ↓
Check IndexedDB for existing data
       ↓
[Has data?] ─── No ──→ Redirect to /household
       ↓
      Yes
       ↓
Show migration prompt:
"We found existing budget data. Would you like to import it to your account?"
       ↓
[User choice]
       ↓
"Yes, import" ──→ Run migration ──→ Redirect to /dashboard
       ↓
"No, start fresh" ──→ Clear local data ──→ Redirect to /household
```

### 2.2 Migration Prompt UI

```tsx
// components/migration-prompt.tsx
export function MigrationPrompt({
  onMigrate,
  onStartFresh,
  localDataSummary,
}: {
  onMigrate: () => void;
  onStartFresh: () => void;
  localDataSummary: LocalDataSummary;
}) {
  return (
    <Dialog open>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Import Your Budget Data?</DialogTitle>
          <DialogDescription>
            We found existing budget data on this device:
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-2 py-4">
          <div className="flex justify-between text-sm">
            <span>Household</span>
            <span>{localDataSummary.hasHousehold ? '✓' : '—'}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span>Children</span>
            <span>{localDataSummary.childrenCount}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span>Adults</span>
            <span>{localDataSummary.adultsCount}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span>Budget Items</span>
            <span>{localDataSummary.itemsCount}</span>
          </div>
          <div className="flex justify-between text-sm font-medium border-t pt-2">
            <span>Total Budget</span>
            <span>{formatCurrency(localDataSummary.totalAnnual)}</span>
          </div>
        </div>
        
        <DialogFooter className="flex flex-col gap-2 sm:flex-row">
          <Button variant="outline" onClick={onStartFresh}>
            Start Fresh
          </Button>
          <Button onClick={onMigrate}>
            Import Data
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

---

## 3. Migration Implementation

### 3.1 Check for Local Data

```typescript
// lib/migration.ts
interface LocalDataSummary {
  hasData: boolean;
  hasHousehold: boolean;
  childrenCount: number;
  adultsCount: number;
  categoriesCount: number;
  itemsCount: number;
  totalAnnual: number;
}

async function checkLocalData(): Promise<LocalDataSummary> {
  const [household, children, adults, categories, items] = await Promise.all([
    db.households.toArray(),
    db.children.toArray(),
    db.adults.toArray(),
    db.categories.toArray(),
    db.expenseItems.toArray(),
  ]);
  
  const totalAnnual = items.reduce((sum, item) => sum + (item.total || 0), 0);
  
  return {
    hasData: household.length > 0 || children.length > 0 || items.length > 0,
    hasHousehold: household.length > 0,
    childrenCount: children.length,
    adultsCount: adults.length,
    categoriesCount: categories.length,
    itemsCount: items.length,
    totalAnnual,
  };
}
```

### 3.2 Execute Migration

```typescript
async function migrateToCloud(userId: string): Promise<MigrationResult> {
  const errors: string[] = [];
  let migratedCount = 0;
  
  try {
    // 1. Read all local data
    const [household, children, adults, categories, items] = await Promise.all([
      db.households.toArray(),
      db.children.toArray(),
      db.adults.toArray(),
      db.categories.toArray(),
      db.expenseItems.toArray(),
    ]);
    
    // 2. Map local IDs to new cloud IDs
    const idMap: Record<string, string> = {};
    
    // 3. Migrate household first (required by categories)
    if (household.length > 0) {
      const householdData = household[0];
      const { data, error } = await supabase
        .from('households')
        .insert({
          user_id: userId,
          name: householdData.name,
          housing_type: householdData.housingType,
          members: householdData.members || 1,
        })
        .select()
        .single();
      
      if (error) {
        errors.push(`Household: ${error.message}`);
      } else {
        idMap[`household:${householdData.id}`] = data.id;
        migratedCount++;
      }
    }
    
    // 4. Migrate children
    for (const child of children) {
      const { data, error } = await supabase
        .from('children')
        .insert({
          user_id: userId,
          name: child.name,
          age: child.age,
          school_level: child.schoolLevel,
        })
        .select()
        .single();
      
      if (error) {
        errors.push(`Child "${child.name}": ${error.message}`);
      } else {
        idMap[`child:${child.id}`] = data.id;
        migratedCount++;
      }
    }
    
    // 5. Migrate adults
    for (const adult of adults) {
      const { data, error } = await supabase
        .from('adults')
        .insert({
          user_id: userId,
          name: adult.name,
          age: adult.age,
        })
        .select()
        .single();
      
      if (error) {
        errors.push(`Adult "${adult.name}": ${error.message}`);
      } else {
        idMap[`adult:${adult.id}`] = data.id;
        migratedCount++;
      }
    }
    
    // 6. Migrate categories (need entity ID mapping)
    for (const category of categories) {
      const entityKey = `${category.entityType}:${category.entityId}`;
      const cloudEntityId = idMap[entityKey];
      
      if (!cloudEntityId) {
        errors.push(`Category "${category.name}": entity not migrated`);
        continue;
      }
      
      const { data, error } = await supabase
        .from('categories')
        .insert({
          user_id: userId,
          entity_type: category.entityType,
          entity_id: cloudEntityId,
          name: category.name,
          description: category.description,
          is_percentage_based: category.isPercentageBased,
          percentage_value: category.percentageValue,
          sort_order: category.sortOrder,
        })
        .select()
        .single();
      
      if (error) {
        errors.push(`Category "${category.name}": ${error.message}`);
      } else {
        idMap[`category:${category.id}`] = data.id;
        migratedCount++;
      }
    }
    
    // 7. Migrate expense items (need category ID mapping)
    const itemBatches = chunkArray(items, 50); // Batch for performance
    
    for (const batch of itemBatches) {
      const mappedItems = batch
        .map(item => {
          const cloudCategoryId = idMap[`category:${item.categoryId}`];
          if (!cloudCategoryId) return null;
          
          return {
            user_id: userId,
            category_id: cloudCategoryId,
            name: item.name,
            cost: item.cost,
            frequency: item.frequency,
            quantity: item.quantity,
            total: item.total,
            need_want: item.needWant,
            adjusted_total: item.adjustedTotal,
          };
        })
        .filter(Boolean);
      
      if (mappedItems.length > 0) {
        const { error } = await supabase
          .from('expense_items')
          .insert(mappedItems);
        
        if (error) {
          errors.push(`Items batch: ${error.message}`);
        } else {
          migratedCount += mappedItems.length;
        }
      }
    }
    
    // 8. Clear local data after successful migration
    if (errors.length === 0) {
      await clearLocalData();
    }
    
    return {
      success: errors.length === 0,
      migratedCount,
      errors,
    };
    
  } catch (error) {
    return {
      success: false,
      migratedCount,
      errors: [...errors, `Unexpected error: ${error.message}`],
    };
  }
}
```

### 3.3 Clear Local Data

```typescript
async function clearLocalData(): Promise<void> {
  await db.transaction('rw', [
    db.households,
    db.children,
    db.adults,
    db.categories,
    db.expenseItems,
  ], async () => {
    await db.households.clear();
    await db.children.clear();
    await db.adults.clear();
    await db.categories.clear();
    await db.expenseItems.clear();
  });
}
```

---

## 4. Post-Signup Hook

### 4.1 Integration Point

```typescript
// app/signup/page.tsx
async function handleSignupComplete(user: User) {
  // Check for local data
  const localSummary = await checkLocalData();
  
  if (localSummary.hasData) {
    // Show migration prompt
    setShowMigrationPrompt(true);
    setLocalDataSummary(localSummary);
  } else {
    // No local data, proceed to onboarding
    router.push('/household');
  }
}

async function handleMigrate() {
  setMigrating(true);
  
  const result = await migrateToCloud(user.id);
  
  if (result.success) {
    showToast(`Imported ${result.migratedCount} items successfully!`);
    router.push('/dashboard');
  } else {
    showToast(`Migration completed with ${result.errors.length} errors`, 'warning');
    router.push('/dashboard');
  }
  
  setMigrating(false);
}

async function handleStartFresh() {
  await clearLocalData();
  router.push('/household');
}
```

---

## 5. Edge Cases

### 5.1 Migration Interrupted

If migration fails midway:
- Partial data exists in cloud
- Local data still exists
- On next login, sync will pull cloud data
- Duplicate detection needed (by name + entity)

### 5.2 Duplicate Prevention

```typescript
// Before inserting, check for existing
async function checkDuplicate(
  table: string,
  userId: string,
  name: string
): Promise<boolean> {
  const { data } = await supabase
    .from(table)
    .select('id')
    .eq('user_id', userId)
    .eq('name', name)
    .single();
  
  return !!data;
}
```

### 5.3 Large Data Sets

For users with many items:
- Batch inserts (50 items per batch)
- Show progress indicator
- Allow retry on failure

---

## 6. Files to Create

| File | Description |
|------|-------------|
| `lib/migration.ts` | Migration logic |
| `components/migration-prompt.tsx` | Migration dialog UI |
| `app/signup/page.tsx` | Integrate migration flow |

---

## 7. Acceptance Criteria

- [ ] After signup, check for local IndexedDB data
- [ ] If data exists, show migration prompt with summary
- [ ] User can choose to import or start fresh
- [ ] Migration preserves all entities and relationships
- [ ] ID mappings correct (categories → entities, items → categories)
- [ ] Local data cleared after successful migration
- [ ] Progress indicator during migration
- [ ] Errors reported gracefully
- [ ] "Start fresh" clears local data
