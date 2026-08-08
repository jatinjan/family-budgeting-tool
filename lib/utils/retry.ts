/**
 * Retry utilities with exponential backoff
 */

import { isRecoverableError } from './error-handler'

export interface RetryConfig {
  maxAttempts: number
  baseDelayMs: number
  maxDelayMs: number
  backoffMultiplier: number
  jitter: boolean
}

export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxAttempts: 3,
  baseDelayMs: 1000,
  maxDelayMs: 30000,
  backoffMultiplier: 2,
  jitter: true,
}

/**
 * Calculate retry delay with exponential backoff
 */
export function getRetryDelay(attempt: number, config = DEFAULT_RETRY_CONFIG): number {
  let delay = config.baseDelayMs * Math.pow(config.backoffMultiplier, attempt)
  delay = Math.min(delay, config.maxDelayMs)
  
  if (config.jitter) {
    delay += Math.random() * 1000
  }
  
  return Math.floor(delay)
}

/**
 * Sleep for a specified duration
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * Wrap an async operation with retry logic
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  config: Partial<RetryConfig> = {}
): Promise<T> {
  const cfg = { ...DEFAULT_RETRY_CONFIG, ...config }
  let lastError: Error | null = null
  
  for (let attempt = 0; attempt < cfg.maxAttempts; attempt++) {
    try {
      return await operation()
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error))
      
      if (!isRecoverableError(error)) {
        throw error
      }
      
      if (attempt < cfg.maxAttempts - 1) {
        const delay = getRetryDelay(attempt, cfg)
        await sleep(delay)
      }
    }
  }
  
  throw lastError
}

/**
 * Create a retryable function with pre-configured retry settings
 */
export function createRetryable<T extends (...args: Parameters<T>) => Promise<ReturnType<T>>>(
  fn: T,
  config: Partial<RetryConfig> = {}
): T {
  return (async (...args: Parameters<T>): Promise<ReturnType<T>> => {
    return withRetry(() => fn(...args), config)
  }) as T
}

export interface RetryState {
  attempt: number
  maxAttempts: number
  nextRetryIn: number | null
  isRetrying: boolean
  hasExhaustedRetries: boolean
}

/**
 * Create a stateful retry manager
 */
export function createRetryManager(config: Partial<RetryConfig> = {}) {
  const cfg = { ...DEFAULT_RETRY_CONFIG, ...config }
  let state: RetryState = {
    attempt: 0,
    maxAttempts: cfg.maxAttempts,
    nextRetryIn: null,
    isRetrying: false,
    hasExhaustedRetries: false,
  }
  
  return {
    getState: () => ({ ...state }),
    
    reset: () => {
      state = {
        attempt: 0,
        maxAttempts: cfg.maxAttempts,
        nextRetryIn: null,
        isRetrying: false,
        hasExhaustedRetries: false,
      }
    },
    
    scheduleRetry: (onRetry: () => Promise<void>): Promise<void> => {
      if (state.attempt >= cfg.maxAttempts) {
        state.hasExhaustedRetries = true
        return Promise.reject(new Error('Max retry attempts reached'))
      }
      
      const delay = getRetryDelay(state.attempt, cfg)
      state.nextRetryIn = delay
      state.isRetrying = true
      state.attempt++
      
      return new Promise((resolve, reject) => {
        setTimeout(async () => {
          try {
            await onRetry()
            state.isRetrying = false
            state.nextRetryIn = null
            resolve()
          } catch (error) {
            state.isRetrying = false
            reject(error)
          }
        }, delay)
      })
    },
    
    canRetry: () => state.attempt < cfg.maxAttempts,
    
    getNextDelay: () => {
      if (state.attempt >= cfg.maxAttempts) return null
      return getRetryDelay(state.attempt, cfg)
    },
  }
}

/**
 * Debounce a function
 */
export function debounce<T extends (...args: Parameters<T>) => void>(
  fn: T,
  delayMs: number
): T & { cancel: () => void } {
  let timeoutId: ReturnType<typeof setTimeout> | null = null
  
  const debouncedFn = ((...args: Parameters<T>) => {
    if (timeoutId) {
      clearTimeout(timeoutId)
    }
    timeoutId = setTimeout(() => {
      fn(...args)
      timeoutId = null
    }, delayMs)
  }) as T & { cancel: () => void }
  
  debouncedFn.cancel = () => {
    if (timeoutId) {
      clearTimeout(timeoutId)
      timeoutId = null
    }
  }
  
  return debouncedFn
}

/**
 * Throttle a function
 */
export function throttle<T extends (...args: Parameters<T>) => void>(
  fn: T,
  limitMs: number
): T {
  let inThrottle = false
  
  return ((...args: Parameters<T>) => {
    if (!inThrottle) {
      fn(...args)
      inThrottle = true
      setTimeout(() => {
        inThrottle = false
      }, limitMs)
    }
  }) as T
}
