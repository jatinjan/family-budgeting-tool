# Error Handling Specification

**Status:** Ready for implementation  
**Priority:** P1  
**Dependencies:** Auth flow, Sync layer

---

## Overview

This spec defines the error handling strategy across the application, including error categories, user notifications, retry logic, and error boundaries.

---

## 1. Error Categories

### 1.1 Classification Matrix

| Category | Examples | Severity | User Action | Auto-Retry |
|----------|----------|----------|-------------|------------|
| **Network** | Offline, timeout, DNS failure | Recoverable | Wait/Retry | Yes |
| **Auth** | Invalid token, session expired | Recoverable | Re-login | No |
| **Validation** | Invalid input, constraint violation | Recoverable | Fix input | No |
| **Server** | 500 errors, Supabase down | Recoverable | Retry later | Yes |
| **Permission** | RLS denied, forbidden | Recoverable | Contact support | No |
| **Client** | JavaScript error, render failure | Critical | Refresh page | No |

### 1.2 Error Type Definitions

```typescript
// types/errors.ts

type ErrorCategory = 
  | 'network'
  | 'auth'
  | 'validation'
  | 'server'
  | 'permission'
  | 'client';

interface AppError {
  code: string;
  category: ErrorCategory;
  message: string;            // User-friendly message
  technicalMessage?: string;  // For logging
  recoverable: boolean;
  suggestedAction?: 'retry' | 'login' | 'refresh' | 'contact' | 'fix_input';
}

const ERROR_CODES = {
  // Network
  NETWORK_OFFLINE: 'network_offline',
  NETWORK_TIMEOUT: 'network_timeout',
  
  // Auth
  AUTH_INVALID_CREDENTIALS: 'auth_invalid_credentials',
  AUTH_SESSION_EXPIRED: 'auth_session_expired',
  AUTH_EMAIL_NOT_CONFIRMED: 'auth_email_not_confirmed',
  
  // Validation
  VALIDATION_REQUIRED: 'validation_required',
  VALIDATION_FORMAT: 'validation_format',
  VALIDATION_CONSTRAINT: 'validation_constraint',
  
  // Server
  SERVER_ERROR: 'server_error',
  SERVER_UNAVAILABLE: 'server_unavailable',
  
  // Permission
  PERMISSION_DENIED: 'permission_denied',
  PERMISSION_NOT_ADMIN: 'permission_not_admin',
  
  // Client
  CLIENT_RENDER_ERROR: 'client_render_error',
  CLIENT_UNKNOWN: 'client_unknown',
} as const;
```

---

## 2. Error Detection

### 2.1 Supabase Error Mapping

```typescript
// lib/utils/error-handler.ts

function mapSupabaseError(error: PostgrestError | AuthError): AppError {
  // Auth errors
  if ('status' in error && error.status === 401) {
    return {
      code: ERROR_CODES.AUTH_SESSION_EXPIRED,
      category: 'auth',
      message: 'Your session has expired. Please sign in again.',
      technicalMessage: error.message,
      recoverable: true,
      suggestedAction: 'login',
    };
  }
  
  // Invalid credentials
  if (error.message?.includes('Invalid login')) {
    return {
      code: ERROR_CODES.AUTH_INVALID_CREDENTIALS,
      category: 'auth',
      message: 'Invalid email or password.',
      technicalMessage: error.message,
      recoverable: true,
      suggestedAction: 'fix_input',
    };
  }
  
  // RLS / Permission errors
  if (error.message?.includes('permission denied') || error.code === '42501') {
    return {
      code: ERROR_CODES.PERMISSION_DENIED,
      category: 'permission',
      message: 'You don\'t have permission to perform this action.',
      technicalMessage: error.message,
      recoverable: false,
      suggestedAction: 'contact',
    };
  }
  
  // Unique constraint violation
  if (error.code === '23505') {
    return {
      code: ERROR_CODES.VALIDATION_CONSTRAINT,
      category: 'validation',
      message: 'This item already exists.',
      technicalMessage: error.message,
      recoverable: true,
      suggestedAction: 'fix_input',
    };
  }
  
  // Server errors
  if ('status' in error && error.status >= 500) {
    return {
      code: ERROR_CODES.SERVER_ERROR,
      category: 'server',
      message: 'Server error. Please try again in a moment.',
      technicalMessage: error.message,
      recoverable: true,
      suggestedAction: 'retry',
    };
  }
  
  // Default
  return {
    code: ERROR_CODES.CLIENT_UNKNOWN,
    category: 'client',
    message: 'An unexpected error occurred.',
    technicalMessage: error.message,
    recoverable: true,
    suggestedAction: 'retry',
  };
}
```

### 2.2 Network Error Detection

```typescript
function isNetworkError(error: unknown): boolean {
  if (error instanceof TypeError) {
    return error.message.includes('Failed to fetch') ||
           error.message.includes('NetworkError') ||
           error.message.includes('Network request failed');
  }
  return false;
}

function handleNetworkError(): AppError {
  if (!navigator.onLine) {
    return {
      code: ERROR_CODES.NETWORK_OFFLINE,
      category: 'network',
      message: 'You are offline. Your changes will sync when connected.',
      recoverable: true,
      suggestedAction: 'retry',
    };
  }
  
  return {
    code: ERROR_CODES.NETWORK_TIMEOUT,
    category: 'network',
    message: 'Connection timed out. Please check your internet and try again.',
    recoverable: true,
    suggestedAction: 'retry',
  };
}
```

---

## 3. Error Notifications

### 3.1 Toast Configuration

```typescript
// lib/utils/toast.ts

interface ToastOptions {
  type: 'success' | 'error' | 'warning' | 'info';
  duration?: number;        // ms, default varies by type
  action?: {
    label: string;
    onClick: () => void;
  };
}

const TOAST_DURATIONS = {
  success: 3000,
  info: 4000,
  warning: 5000,
  error: 6000,  // Errors stay longer
};

function showToast(message: string, options: ToastOptions) {
  // Implementation using shadcn/ui toast or sonner
}
```

### 3.2 Notification Patterns

| Error Type | Notification | Duration | Action |
|------------|--------------|----------|--------|
| Sync failed | Toast (warning) | 5s | "Retry" button |
| Auth expired | Toast (info) | Persistent | "Sign in" link |
| Validation | Inline message | Until fixed | Highlight field |
| Server error | Toast (error) | 6s | "Try again" button |
| Offline | Banner (top) | While offline | Auto-dismiss |
| Permission | Toast (error) | 6s | None |

### 3.3 Implementation

```typescript
function notifyError(error: AppError) {
  switch (error.category) {
    case 'network':
      if (error.code === ERROR_CODES.NETWORK_OFFLINE) {
        showOfflineBanner();
      } else {
        showToast(error.message, {
          type: 'warning',
          action: {
            label: 'Retry',
            onClick: () => triggerSync(),
          },
        });
      }
      break;
      
    case 'auth':
      showToast(error.message, {
        type: 'info',
        duration: 0, // Persistent
        action: {
          label: 'Sign in',
          onClick: () => router.push('/login'),
        },
      });
      break;
      
    case 'validation':
      // Handled inline in forms
      break;
      
    case 'server':
    case 'client':
      showToast(error.message, {
        type: 'error',
        action: error.suggestedAction === 'retry' ? {
          label: 'Try again',
          onClick: () => location.reload(),
        } : undefined,
      });
      break;
      
    case 'permission':
      showToast(error.message, { type: 'error' });
      break;
  }
}
```

---

## 4. Retry Strategy

### 4.1 Exponential Backoff Config

```typescript
// lib/utils/retry.ts

interface RetryConfig {
  maxAttempts: number;
  baseDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
  jitter: boolean;
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxAttempts: 3,
  baseDelayMs: 1000,
  maxDelayMs: 30000,
  backoffMultiplier: 2,
  jitter: true,
};

function getRetryDelay(attempt: number, config = DEFAULT_RETRY_CONFIG): number {
  let delay = config.baseDelayMs * Math.pow(config.backoffMultiplier, attempt);
  delay = Math.min(delay, config.maxDelayMs);
  
  if (config.jitter) {
    // Add 0-1000ms jitter
    delay += Math.random() * 1000;
  }
  
  return delay;
}

// Retry schedule: ~1s → ~2s → ~4s → give up
```

### 4.2 Retry Wrapper

```typescript
async function withRetry<T>(
  operation: () => Promise<T>,
  config: Partial<RetryConfig> = {}
): Promise<T> {
  const cfg = { ...DEFAULT_RETRY_CONFIG, ...config };
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt < cfg.maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;
      
      // Don't retry non-recoverable errors
      if (!isRecoverableError(error)) {
        throw error;
      }
      
      // Don't retry on last attempt
      if (attempt < cfg.maxAttempts - 1) {
        const delay = getRetryDelay(attempt, cfg);
        await sleep(delay);
      }
    }
  }
  
  throw lastError;
}

function isRecoverableError(error: unknown): boolean {
  if (isNetworkError(error)) return true;
  
  const appError = error as AppError;
  if (appError.category === 'network' || appError.category === 'server') {
    return true;
  }
  
  return false;
}
```

---

## 5. Error Boundaries

### 5.1 Global Error Boundary

```typescript
// components/error-boundary.tsx
'use client';

import { Component, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };
  
  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }
  
  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log to console (future: send to Sentry)
    console.error('[ErrorBoundary]', error, errorInfo);
  }
  
  render() {
    if (this.state.hasError) {
      return this.props.fallback || <GlobalErrorFallback error={this.state.error} />;
    }
    
    return this.props.children;
  }
}
```

### 5.2 Global Error Fallback

```typescript
// components/global-error-fallback.tsx
export function GlobalErrorFallback({ error }: { error?: Error }) {
  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="max-w-md">
        <CardHeader>
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
            <AlertTriangle className="h-6 w-6 text-red-600" />
          </div>
          <CardTitle className="text-center">Something went wrong</CardTitle>
          <CardDescription className="text-center">
            We're sorry, but something unexpected happened.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {process.env.NODE_ENV === 'development' && error && (
            <pre className="rounded bg-gray-100 p-2 text-xs overflow-auto">
              {error.message}
            </pre>
          )}
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => window.location.href = '/'}
            >
              Go Home
            </Button>
            <Button
              className="flex-1"
              onClick={() => window.location.reload()}
            >
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
```

### 5.3 Provider Structure

```typescript
// app/layout.tsx
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <ErrorBoundary>
          <Providers>
            {children}
          </Providers>
        </ErrorBoundary>
      </body>
    </html>
  );
}
```

---

## 6. Offline Handling

### 6.1 Offline Banner Component

```typescript
// components/offline-banner.tsx
'use client';

import { useSync } from '@/hooks/use-sync';
import { WifiOff } from 'lucide-react';

export function OfflineBanner() {
  const { isOnline, pendingCount } = useSync();
  
  if (isOnline) return null;
  
  return (
    <div className="fixed top-0 inset-x-0 bg-amber-500 text-white text-center py-2 z-50 flex items-center justify-center gap-2">
      <WifiOff className="h-4 w-4" />
      <span>
        You're offline.
        {pendingCount > 0 && ` ${pendingCount} changes will sync when connected.`}
      </span>
    </div>
  );
}
```

### 6.2 Offline Detection

```typescript
// hooks/use-online-status.ts
export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(true);
  
  useEffect(() => {
    setIsOnline(navigator.onLine);
    
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);
  
  return isOnline;
}
```

---

## 7. Form Validation Errors

### 7.1 Inline Error Display

```typescript
// components/form-field.tsx
interface FormFieldProps {
  label: string;
  error?: string;
  children: ReactNode;
}

export function FormField({ label, error, children }: FormFieldProps) {
  return (
    <div className="space-y-2">
      <Label className={error ? 'text-red-600' : ''}>{label}</Label>
      {children}
      {error && (
        <p className="text-sm text-red-600 flex items-center gap-1">
          <AlertCircle className="h-3 w-3" />
          {error}
        </p>
      )}
    </div>
  );
}
```

### 7.2 Form Error Summary

```typescript
// components/form-error-summary.tsx
export function FormErrorSummary({ errors }: { errors: string[] }) {
  if (errors.length === 0) return null;
  
  return (
    <div className="rounded-lg bg-red-50 border border-red-200 p-4">
      <div className="flex gap-2">
        <AlertCircle className="h-5 w-5 text-red-600 shrink-0" />
        <div>
          <p className="font-medium text-red-800">Please fix the following:</p>
          <ul className="mt-1 text-sm text-red-700 list-disc list-inside">
            {errors.map((error, i) => (
              <li key={i}>{error}</li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
```

---

## 8. Logging (Future: Sentry)

### 8.1 Error Logger

```typescript
// lib/utils/logger.ts

interface LogContext {
  userId?: string;
  page?: string;
  action?: string;
  [key: string]: unknown;
}

function logError(error: Error | AppError, context: LogContext = {}) {
  // Development: console
  console.error('[Error]', {
    message: error.message,
    ...context,
    timestamp: new Date().toISOString(),
  });
  
  // Production (v1.1): Sentry
  // Sentry.captureException(error, { extra: context });
}

function logWarning(message: string, context: LogContext = {}) {
  console.warn('[Warning]', message, context);
  // Sentry.captureMessage(message, { level: 'warning', extra: context });
}
```

---

## 9. Files to Create

| File | Description |
|------|-------------|
| `types/errors.ts` | Error type definitions |
| `lib/utils/error-handler.ts` | Error mapping and handling |
| `lib/utils/retry.ts` | Retry logic with backoff |
| `lib/utils/toast.ts` | Toast notifications |
| `lib/utils/logger.ts` | Error logging |
| `components/error-boundary.tsx` | React error boundary |
| `components/global-error-fallback.tsx` | Error fallback UI |
| `components/offline-banner.tsx` | Offline indicator |
| `components/form-field.tsx` | Form field with error |
| `components/form-error-summary.tsx` | Form error summary |
| `hooks/use-online-status.ts` | Online/offline detection |

---

## 10. Acceptance Criteria

- [ ] Supabase errors mapped to user-friendly messages
- [ ] Network errors detected and handled gracefully
- [ ] Offline banner shown when disconnected
- [ ] Toast notifications match error severity
- [ ] Retry with exponential backoff for recoverable errors
- [ ] Global error boundary catches render errors
- [ ] Error fallback allows recovery (refresh/home)
- [ ] Form validation errors displayed inline
- [ ] Errors logged to console (Sentry in v1.1)
- [ ] Auth errors redirect to login
