/**
 * Error type definitions for My Balanced Family Finances
 * Centralized error handling with categories and user-friendly messages
 */

export type ErrorCategory =
  | 'network'
  | 'auth'
  | 'validation'
  | 'server'
  | 'permission'
  | 'client'
  | 'sync';

export type SuggestedAction = 
  | 'retry'
  | 'login'
  | 'refresh'
  | 'contact'
  | 'fix_input'
  | 'wait';

export interface AppError {
  code: string;
  category: ErrorCategory;
  message: string;
  technicalMessage?: string;
  recoverable: boolean;
  suggestedAction?: SuggestedAction;
  field?: string;
  metadata?: Record<string, unknown>;
}

export const ERROR_CODES = {
  // Network errors
  NETWORK_OFFLINE: 'network_offline',
  NETWORK_TIMEOUT: 'network_timeout',
  NETWORK_DNS_FAILURE: 'network_dns_failure',
  
  // Auth errors
  AUTH_INVALID_CREDENTIALS: 'auth_invalid_credentials',
  AUTH_SESSION_EXPIRED: 'auth_session_expired',
  AUTH_EMAIL_NOT_CONFIRMED: 'auth_email_not_confirmed',
  AUTH_WEAK_PASSWORD: 'auth_weak_password',
  AUTH_EMAIL_TAKEN: 'auth_email_taken',
  AUTH_TOO_MANY_ATTEMPTS: 'auth_too_many_attempts',
  AUTH_SIGNOUT_FAILED: 'auth_signout_failed',
  
  // Validation errors
  VALIDATION_REQUIRED: 'validation_required',
  VALIDATION_FORMAT: 'validation_format',
  VALIDATION_CONSTRAINT: 'validation_constraint',
  VALIDATION_RANGE: 'validation_range',
  
  // Server errors
  SERVER_ERROR: 'server_error',
  SERVER_UNAVAILABLE: 'server_unavailable',
  SERVER_RATE_LIMITED: 'server_rate_limited',
  
  // Permission errors
  PERMISSION_DENIED: 'permission_denied',
  PERMISSION_NOT_ADMIN: 'permission_not_admin',
  PERMISSION_NOT_OWNER: 'permission_not_owner',
  
  // Sync errors
  SYNC_FAILED: 'sync_failed',
  SYNC_CONFLICT: 'sync_conflict',
  SYNC_QUEUE_FULL: 'sync_queue_full',
  
  // Client errors
  CLIENT_RENDER_ERROR: 'client_render_error',
  CLIENT_STORAGE_ERROR: 'client_storage_error',
  CLIENT_UNKNOWN: 'client_unknown',
  
  // Data errors
  DATA_NOT_FOUND: 'data_not_found',
  DATA_INVALID: 'data_invalid',
  DATA_MIGRATION_FAILED: 'data_migration_failed',
} as const;

export type ErrorCode = typeof ERROR_CODES[keyof typeof ERROR_CODES];

export const ERROR_MESSAGES: Record<ErrorCode, { message: string; category: ErrorCategory }> = {
  // Network
  [ERROR_CODES.NETWORK_OFFLINE]: {
    message: 'You are offline. Changes will sync when you reconnect.',
    category: 'network',
  },
  [ERROR_CODES.NETWORK_TIMEOUT]: {
    message: 'Connection timed out. Please check your internet and try again.',
    category: 'network',
  },
  [ERROR_CODES.NETWORK_DNS_FAILURE]: {
    message: 'Unable to connect to the server. Please try again.',
    category: 'network',
  },
  
  // Auth
  [ERROR_CODES.AUTH_INVALID_CREDENTIALS]: {
    message: 'Invalid email or password.',
    category: 'auth',
  },
  [ERROR_CODES.AUTH_SESSION_EXPIRED]: {
    message: 'Your session has expired. Please sign in again.',
    category: 'auth',
  },
  [ERROR_CODES.AUTH_EMAIL_NOT_CONFIRMED]: {
    message: 'Please check your email to confirm your account.',
    category: 'auth',
  },
  [ERROR_CODES.AUTH_WEAK_PASSWORD]: {
    message: 'Password must be at least 8 characters long.',
    category: 'auth',
  },
  [ERROR_CODES.AUTH_EMAIL_TAKEN]: {
    message: 'An account with this email already exists.',
    category: 'auth',
  },
  [ERROR_CODES.AUTH_TOO_MANY_ATTEMPTS]: {
    message: 'Too many login attempts. Please try again in a few minutes.',
    category: 'auth',
  },
  [ERROR_CODES.AUTH_SIGNOUT_FAILED]: {
    message: 'Failed to sign out. Please try again.',
    category: 'auth',
  },
  
  // Validation
  [ERROR_CODES.VALIDATION_REQUIRED]: {
    message: 'This field is required.',
    category: 'validation',
  },
  [ERROR_CODES.VALIDATION_FORMAT]: {
    message: 'Invalid format. Please check your input.',
    category: 'validation',
  },
  [ERROR_CODES.VALIDATION_CONSTRAINT]: {
    message: 'This value already exists or is not allowed.',
    category: 'validation',
  },
  [ERROR_CODES.VALIDATION_RANGE]: {
    message: 'Value is outside the allowed range.',
    category: 'validation',
  },
  
  // Server
  [ERROR_CODES.SERVER_ERROR]: {
    message: 'Server error. Please try again in a moment.',
    category: 'server',
  },
  [ERROR_CODES.SERVER_UNAVAILABLE]: {
    message: 'Service temporarily unavailable. Please try again later.',
    category: 'server',
  },
  [ERROR_CODES.SERVER_RATE_LIMITED]: {
    message: 'Too many requests. Please wait a moment and try again.',
    category: 'server',
  },
  
  // Permission
  [ERROR_CODES.PERMISSION_DENIED]: {
    message: 'You don\'t have permission to perform this action.',
    category: 'permission',
  },
  [ERROR_CODES.PERMISSION_NOT_ADMIN]: {
    message: 'Admin access required.',
    category: 'permission',
  },
  [ERROR_CODES.PERMISSION_NOT_OWNER]: {
    message: 'You can only modify your own data.',
    category: 'permission',
  },
  
  // Sync
  [ERROR_CODES.SYNC_FAILED]: {
    message: 'Failed to sync your data. Will retry automatically.',
    category: 'sync',
  },
  [ERROR_CODES.SYNC_CONFLICT]: {
    message: 'Your data was modified elsewhere. Please refresh to see the latest version.',
    category: 'sync',
  },
  [ERROR_CODES.SYNC_QUEUE_FULL]: {
    message: 'Too many pending changes. Please wait for sync to complete.',
    category: 'sync',
  },
  
  // Client
  [ERROR_CODES.CLIENT_RENDER_ERROR]: {
    message: 'Something went wrong. Please refresh the page.',
    category: 'client',
  },
  [ERROR_CODES.CLIENT_STORAGE_ERROR]: {
    message: 'Unable to save data locally. Please check your browser settings.',
    category: 'client',
  },
  [ERROR_CODES.CLIENT_UNKNOWN]: {
    message: 'An unexpected error occurred.',
    category: 'client',
  },
  
  // Data
  [ERROR_CODES.DATA_NOT_FOUND]: {
    message: 'The requested data could not be found.',
    category: 'client',
  },
  [ERROR_CODES.DATA_INVALID]: {
    message: 'The data is invalid or corrupted.',
    category: 'client',
  },
  [ERROR_CODES.DATA_MIGRATION_FAILED]: {
    message: 'Failed to migrate your data. Some items may not have been imported.',
    category: 'client',
  },
};

/**
 * Create an AppError from an error code
 */
export function createAppError(
  code: ErrorCode,
  options?: {
    technicalMessage?: string;
    field?: string;
    metadata?: Record<string, unknown>;
    overrideMessage?: string;
  }
): AppError {
  const errorInfo = ERROR_MESSAGES[code];
  
  const suggestedActions: Record<ErrorCategory, SuggestedAction> = {
    network: 'retry',
    auth: 'login',
    validation: 'fix_input',
    server: 'retry',
    permission: 'contact',
    client: 'refresh',
    sync: 'retry',
  };
  
  const recoverable = !['client', 'permission'].includes(errorInfo.category);
  
  return {
    code,
    category: errorInfo.category,
    message: options?.overrideMessage || errorInfo.message,
    technicalMessage: options?.technicalMessage,
    recoverable,
    suggestedAction: suggestedActions[errorInfo.category],
    field: options?.field,
    metadata: options?.metadata,
  };
}

/**
 * Check if an error is an AppError
 */
export function isAppError(error: unknown): error is AppError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    'category' in error &&
    'message' in error
  );
}

/**
 * Convert any error to an AppError
 */
export function toAppError(error: unknown): AppError {
  if (isAppError(error)) {
    return error;
  }
  
  if (error instanceof Error) {
    return createAppError(ERROR_CODES.CLIENT_UNKNOWN, {
      technicalMessage: error.message,
    });
  }
  
  return createAppError(ERROR_CODES.CLIENT_UNKNOWN, {
    technicalMessage: String(error),
  });
}

/**
 * Supabase error codes to AppError codes mapping
 */
export const SUPABASE_ERROR_MAP: Record<string, ErrorCode> = {
  // Auth errors
  'invalid_credentials': ERROR_CODES.AUTH_INVALID_CREDENTIALS,
  'invalid_grant': ERROR_CODES.AUTH_INVALID_CREDENTIALS,
  'email_not_confirmed': ERROR_CODES.AUTH_EMAIL_NOT_CONFIRMED,
  'user_already_exists': ERROR_CODES.AUTH_EMAIL_TAKEN,
  'weak_password': ERROR_CODES.AUTH_WEAK_PASSWORD,
  'over_request_rate_limit': ERROR_CODES.AUTH_TOO_MANY_ATTEMPTS,
  
  // Database errors
  '23505': ERROR_CODES.VALIDATION_CONSTRAINT, // unique_violation
  '23503': ERROR_CODES.DATA_NOT_FOUND, // foreign_key_violation
  '42501': ERROR_CODES.PERMISSION_DENIED, // insufficient_privilege
  '23502': ERROR_CODES.VALIDATION_REQUIRED, // not_null_violation
  '22001': ERROR_CODES.VALIDATION_FORMAT, // string_data_right_truncation
  
  // RLS errors
  'PGRST301': ERROR_CODES.PERMISSION_DENIED,
};

/**
 * HTTP status codes to error categories
 */
export const HTTP_STATUS_CATEGORIES: Record<number, ErrorCategory> = {
  400: 'validation',
  401: 'auth',
  403: 'permission',
  404: 'client',
  408: 'network',
  429: 'server',
  500: 'server',
  502: 'server',
  503: 'server',
  504: 'network',
};
