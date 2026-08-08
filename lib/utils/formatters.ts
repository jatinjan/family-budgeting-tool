/**
 * Formatting utilities for My Balanced Family Finances
 * Handles currency, date, and number formatting
 */

const AUD_FORMATTER = new Intl.NumberFormat('en-AU', {
  style: 'currency',
  currency: 'AUD',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

const AUD_FORMATTER_CENTS = new Intl.NumberFormat('en-AU', {
  style: 'currency',
  currency: 'AUD',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const NUMBER_FORMATTER = new Intl.NumberFormat('en-AU');

/**
 * Format amount as AUD currency
 * Shows cents for amounts under $100, otherwise rounds
 * @param amount - Amount in dollars
 * @returns Formatted currency string
 */
export function formatCurrency(amount: number): string {
  if (Math.abs(amount) >= 100) {
    return AUD_FORMATTER.format(amount);
  }
  return AUD_FORMATTER_CENTS.format(amount);
}

/**
 * Format amount with explicit cents
 * @param amount - Amount in dollars
 * @returns Formatted currency string with cents
 */
export function formatCurrencyExact(amount: number): string {
  return AUD_FORMATTER_CENTS.format(amount);
}

/**
 * Format large amounts compactly (e.g., $24.5k)
 * @param amount - Amount in dollars
 * @returns Compact formatted string
 */
export function formatCompactCurrency(amount: number): string {
  if (amount >= 1000000) {
    return `$${(amount / 1000000).toFixed(1)}M`;
  }
  if (amount >= 1000) {
    return `$${(amount / 1000).toFixed(1)}k`;
  }
  return formatCurrency(amount);
}

/**
 * Format number with locale separators
 * @param value - Number to format
 * @returns Formatted number string
 */
export function formatNumber(value: number): string {
  return NUMBER_FORMATTER.format(value);
}

/**
 * Format percentage
 * @param value - Decimal or percentage value
 * @param alreadyPercentage - If true, value is already 0-100 scale
 * @returns Formatted percentage string
 */
export function formatPercentage(value: number, alreadyPercentage = false): string {
  const percentage = alreadyPercentage ? value : value * 100;
  return `${Math.round(percentage)}%`;
}

const DATE_FORMATTER_SHORT = new Intl.DateTimeFormat('en-AU', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
});

const DATE_FORMATTER_LONG = new Intl.DateTimeFormat('en-AU', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});

const TIME_FORMATTER = new Intl.DateTimeFormat('en-AU', {
  hour: 'numeric',
  minute: '2-digit',
  hour12: true,
});

const DATETIME_FORMATTER = new Intl.DateTimeFormat('en-AU', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
  hour12: true,
});

/**
 * Format date in short format (7 Aug 2026)
 * @param date - Date to format
 * @returns Formatted date string
 */
export function formatDateShort(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return DATE_FORMATTER_SHORT.format(d);
}

/**
 * Format date in long format (Friday, 7 August 2026)
 * @param date - Date to format
 * @returns Formatted date string
 */
export function formatDateLong(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return DATE_FORMATTER_LONG.format(d);
}

/**
 * Format time (5:30 pm)
 * @param date - Date to format
 * @returns Formatted time string
 */
export function formatTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return TIME_FORMATTER.format(d);
}

/**
 * Format date and time (7 Aug 2026, 5:30 pm)
 * @param date - Date to format
 * @returns Formatted datetime string
 */
export function formatDateTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return DATETIME_FORMATTER.format(d);
}

/**
 * Format relative time (e.g., "2 hours ago", "yesterday", "3 days ago")
 * @param date - Date to compare
 * @returns Relative time string
 */
export function formatRelativeTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);
  const diffWeeks = Math.floor(diffDays / 7);
  const diffMonths = Math.floor(diffDays / 30);
  const diffYears = Math.floor(diffDays / 365);
  
  if (diffSeconds < 60) {
    return 'just now';
  }
  
  if (diffMinutes < 60) {
    return diffMinutes === 1 ? '1 minute ago' : `${diffMinutes} minutes ago`;
  }
  
  if (diffHours < 24) {
    return diffHours === 1 ? '1 hour ago' : `${diffHours} hours ago`;
  }
  
  if (diffDays === 1) {
    return 'yesterday';
  }
  
  if (diffDays < 7) {
    return `${diffDays} days ago`;
  }
  
  if (diffWeeks < 4) {
    return diffWeeks === 1 ? '1 week ago' : `${diffWeeks} weeks ago`;
  }
  
  if (diffMonths < 12) {
    return diffMonths === 1 ? '1 month ago' : `${diffMonths} months ago`;
  }
  
  return diffYears === 1 ? '1 year ago' : `${diffYears} years ago`;
}

/**
 * Format a duration in milliseconds to human-readable format
 * @param ms - Duration in milliseconds
 * @returns Formatted duration string
 */
export function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  
  if (days > 0) {
    return days === 1 ? '1 day' : `${days} days`;
  }
  
  if (hours > 0) {
    return hours === 1 ? '1 hour' : `${hours} hours`;
  }
  
  if (minutes > 0) {
    return minutes === 1 ? '1 minute' : `${minutes} minutes`;
  }
  
  return seconds === 1 ? '1 second' : `${seconds} seconds`;
}

/**
 * Truncate text with ellipsis
 * @param text - Text to truncate
 * @param maxLength - Maximum length
 * @returns Truncated text
 */
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) {
    return text;
  }
  return text.slice(0, maxLength - 1) + '…';
}

/**
 * Capitalize first letter of a string
 * @param text - Text to capitalize
 * @returns Capitalized text
 */
export function capitalize(text: string): string {
  if (!text) return '';
  return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
}

/**
 * Title case a string (capitalize first letter of each word)
 * @param text - Text to title case
 * @returns Title cased text
 */
export function titleCase(text: string): string {
  if (!text) return '';
  return text
    .split(' ')
    .map(word => capitalize(word))
    .join(' ');
}

/**
 * Format onboarding status for display
 * @param status - Onboarding status value
 * @returns Human-readable status
 */
export function formatOnboardingStatus(status: string): string {
  const statusMap: Record<string, string> = {
    signed_up: 'Just Registered',
    profile_complete: 'Profile Complete',
    budget_started: 'Budget In Progress',
    plan_complete: 'Plan Complete',
  };
  return statusMap[status] || status;
}

/**
 * Format bytes to human-readable size
 * @param bytes - Number of bytes
 * @returns Formatted size string
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}
