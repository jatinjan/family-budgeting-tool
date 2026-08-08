/**
 * Error handling utilities
 * Maps Supabase and network errors to user-friendly AppErrors
 */

import type { AuthError, PostgrestError } from '@supabase/supabase-js'
import {
  type AppError,
  type ErrorCode,
  ERROR_CODES,
  SUPABASE_ERROR_MAP,
  HTTP_STATUS_CATEGORIES,
  createAppError,
  toAppError,
} from '@/types/errors'

/**
 * Map a Supabase error to an AppError
 */
export function mapSupabaseError(
  error: PostgrestError | AuthError | Error
): AppError {
  if ('status' in error) {
    const status = error.status as number
    
    if (status === 401) {
      return createAppError(ERROR_CODES.AUTH_SESSION_EXPIRED, {
        technicalMessage: error.message,
      })
    }
    
    if (status >= 500) {
      return createAppError(ERROR_CODES.SERVER_ERROR, {
        technicalMessage: error.message,
      })
    }
  }

  if ('code' in error && typeof error.code === 'string') {
    const mappedCode = SUPABASE_ERROR_MAP[error.code]
    if (mappedCode) {
      return createAppError(mappedCode, {
        technicalMessage: error.message,
      })
    }
  }

  const message = error.message?.toLowerCase() || ''
  
  if (message.includes('invalid login') || message.includes('invalid credentials')) {
    return createAppError(ERROR_CODES.AUTH_INVALID_CREDENTIALS, {
      technicalMessage: error.message,
    })
  }
  
  if (message.includes('email not confirmed')) {
    return createAppError(ERROR_CODES.AUTH_EMAIL_NOT_CONFIRMED, {
      technicalMessage: error.message,
    })
  }
  
  if (message.includes('user already registered') || message.includes('already exists')) {
    return createAppError(ERROR_CODES.AUTH_EMAIL_TAKEN, {
      technicalMessage: error.message,
    })
  }
  
  if (message.includes('password') && (message.includes('weak') || message.includes('short'))) {
    return createAppError(ERROR_CODES.AUTH_WEAK_PASSWORD, {
      technicalMessage: error.message,
    })
  }
  
  if (message.includes('permission denied') || message.includes('not authorized')) {
    return createAppError(ERROR_CODES.PERMISSION_DENIED, {
      technicalMessage: error.message,
    })
  }
  
  if (message.includes('rate limit') || message.includes('too many requests')) {
    return createAppError(ERROR_CODES.SERVER_RATE_LIMITED, {
      technicalMessage: error.message,
    })
  }

  return createAppError(ERROR_CODES.CLIENT_UNKNOWN, {
    technicalMessage: error.message,
  })
}

/**
 * Check if an error is a network error
 */
export function isNetworkError(error: unknown): boolean {
  if (error instanceof TypeError) {
    return (
      error.message.includes('Failed to fetch') ||
      error.message.includes('NetworkError') ||
      error.message.includes('Network request failed') ||
      error.message.includes('Load failed')
    )
  }
  return false
}

/**
 * Handle a network error and return an appropriate AppError
 */
export function handleNetworkError(): AppError {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return createAppError(ERROR_CODES.NETWORK_OFFLINE)
  }
  
  return createAppError(ERROR_CODES.NETWORK_TIMEOUT)
}

/**
 * Handle any error and convert to AppError
 */
export function handleError(error: unknown): AppError {
  if (isNetworkError(error)) {
    return handleNetworkError()
  }
  
  if (error instanceof Error) {
    if ('code' in error || 'status' in error) {
      return mapSupabaseError(error as PostgrestError | AuthError)
    }
    return toAppError(error)
  }
  
  return toAppError(error)
}

/**
 * Check if an error is recoverable (can be retried)
 */
export function isRecoverableError(error: unknown): boolean {
  const appError = handleError(error)
  return appError.recoverable && ['network', 'server', 'sync'].includes(appError.category)
}

/**
 * Log error to console (future: Sentry integration)
 */
export function logError(
  error: Error | AppError,
  context?: Record<string, unknown>
): void {
  const appError = 'code' in error ? error : handleError(error)
  
  console.error('[Error]', {
    code: appError.code,
    category: appError.category,
    message: appError.message,
    technical: appError.technicalMessage,
    recoverable: appError.recoverable,
    ...context,
    timestamp: new Date().toISOString(),
  })
}

/**
 * Get suggested action text for an error
 */
export function getErrorActionText(error: AppError): string | null {
  switch (error.suggestedAction) {
    case 'retry':
      return 'Try again'
    case 'login':
      return 'Sign in'
    case 'refresh':
      return 'Refresh page'
    case 'contact':
      return 'Contact support'
    case 'fix_input':
      return null
    case 'wait':
      return 'Please wait'
    default:
      return null
  }
}

/**
 * Format error for user display
 */
export function formatErrorForDisplay(error: unknown): {
  title: string
  message: string
  action?: string
} {
  const appError = handleError(error)
  
  const titles: Record<string, string> = {
    network: 'Connection Error',
    auth: 'Authentication Error',
    validation: 'Validation Error',
    server: 'Server Error',
    permission: 'Permission Error',
    client: 'Error',
    sync: 'Sync Error',
  }
  
  return {
    title: titles[appError.category] || 'Error',
    message: appError.message,
    action: getErrorActionText(appError) || undefined,
  }
}
