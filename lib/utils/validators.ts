/**
 * Input validation utilities for My Balanced Family Finances
 * Handles form validation for budget entries and user data
 */

export interface ValidationResult<T> {
  valid: boolean;
  value: T;
  error?: string;
}

/**
 * Validate a cost/amount input
 * @param value - Input value (string or number)
 * @returns Validation result with parsed value
 */
export function validateCost(value: string | number): ValidationResult<number> {
  const num = typeof value === 'string' ? parseFloat(value.replace(/[,$]/g, '')) : value;
  
  if (isNaN(num)) {
    return { valid: false, value: 0, error: 'Please enter a valid number' };
  }
  
  if (num < 0) {
    return { valid: false, value: 0, error: 'Cost cannot be negative' };
  }
  
  if (num > 10000000) {
    return { valid: false, value: 0, error: 'Cost exceeds maximum allowed value' };
  }
  
  return { valid: true, value: Math.round(num * 100) / 100 };
}

/**
 * Validate a quantity input
 * @param value - Input value (string or number)
 * @returns Validation result with parsed value
 */
export function validateQuantity(value: string | number): ValidationResult<number> {
  const num = typeof value === 'string' ? parseInt(value, 10) : value;
  
  if (isNaN(num) || !Number.isInteger(num)) {
    return { valid: false, value: 1, error: 'Please enter a whole number' };
  }
  
  if (num < 1) {
    return { valid: false, value: 1, error: 'Quantity must be at least 1' };
  }
  
  if (num > 1000) {
    return { valid: false, value: 1, error: 'Quantity exceeds maximum allowed value' };
  }
  
  return { valid: true, value: num };
}

/**
 * Validate a percentage input
 * @param value - Input value (string or number)
 * @returns Validation result with parsed value
 */
export function validatePercentage(value: string | number): ValidationResult<number> {
  const num = typeof value === 'string' ? parseFloat(value.replace(/%/g, '')) : value;
  
  if (isNaN(num)) {
    return { valid: false, value: 0, error: 'Please enter a valid percentage' };
  }
  
  if (num < 0) {
    return { valid: false, value: 0, error: 'Percentage cannot be negative' };
  }
  
  if (num > 100) {
    return { valid: false, value: 0, error: 'Percentage cannot exceed 100%' };
  }
  
  return { valid: true, value: Math.round(num * 100) / 100 };
}

/**
 * Validate an email address
 * @param email - Email to validate
 * @returns Validation result
 */
export function validateEmail(email: string): ValidationResult<string> {
  const trimmed = email.trim().toLowerCase();
  
  if (!trimmed) {
    return { valid: false, value: '', error: 'Email is required' };
  }
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(trimmed)) {
    return { valid: false, value: trimmed, error: 'Please enter a valid email address' };
  }
  
  if (trimmed.length > 254) {
    return { valid: false, value: trimmed, error: 'Email address is too long' };
  }
  
  return { valid: true, value: trimmed };
}

/**
 * Validate a password
 * @param password - Password to validate
 * @param minLength - Minimum length (default: 8)
 * @returns Validation result
 */
export function validatePassword(password: string, minLength = 8): ValidationResult<string> {
  if (!password) {
    return { valid: false, value: '', error: 'Password is required' };
  }
  
  if (password.length < minLength) {
    return { valid: false, value: password, error: `Password must be at least ${minLength} characters` };
  }
  
  if (password.length > 128) {
    return { valid: false, value: password, error: 'Password is too long' };
  }
  
  return { valid: true, value: password };
}

/**
 * Validate password confirmation matches
 * @param password - Original password
 * @param confirmation - Confirmation password
 * @returns Validation result
 */
export function validatePasswordConfirmation(
  password: string,
  confirmation: string
): ValidationResult<string> {
  if (!confirmation) {
    return { valid: false, value: '', error: 'Please confirm your password' };
  }
  
  if (password !== confirmation) {
    return { valid: false, value: confirmation, error: 'Passwords do not match' };
  }
  
  return { valid: true, value: confirmation };
}

/**
 * Validate a name (person, household, etc.)
 * @param name - Name to validate
 * @param fieldLabel - Label for error messages (default: "Name")
 * @returns Validation result
 */
export function validateName(name: string, fieldLabel = 'Name'): ValidationResult<string> {
  const trimmed = name.trim();
  
  if (!trimmed) {
    return { valid: false, value: '', error: `${fieldLabel} is required` };
  }
  
  if (trimmed.length < 2) {
    return { valid: false, value: trimmed, error: `${fieldLabel} must be at least 2 characters` };
  }
  
  if (trimmed.length > 100) {
    return { valid: false, value: trimmed, error: `${fieldLabel} is too long` };
  }
  
  return { valid: true, value: trimmed };
}

/**
 * Validate an age input
 * @param value - Age value
 * @param min - Minimum age (default: 0)
 * @param max - Maximum age (default: 120)
 * @returns Validation result
 */
export function validateAge(
  value: string | number,
  min = 0,
  max = 120
): ValidationResult<number> {
  const num = typeof value === 'string' ? parseInt(value, 10) : value;
  
  if (isNaN(num) || !Number.isInteger(num)) {
    return { valid: false, value: 0, error: 'Please enter a valid age' };
  }
  
  if (num < min) {
    return { valid: false, value: 0, error: `Age must be at least ${min}` };
  }
  
  if (num > max) {
    return { valid: false, value: 0, error: `Age cannot exceed ${max}` };
  }
  
  return { valid: true, value: num };
}

/**
 * Validate a promo code format
 * @param code - Promo code to validate
 * @returns Validation result with uppercase code
 */
export function validatePromoCode(code: string): ValidationResult<string> {
  const trimmed = code.trim().toUpperCase();
  
  if (!trimmed) {
    return { valid: true, value: '' }; // Empty is valid (optional field)
  }
  
  if (trimmed.length < 3) {
    return { valid: false, value: trimmed, error: 'Promo code must be at least 3 characters' };
  }
  
  if (trimmed.length > 20) {
    return { valid: false, value: trimmed, error: 'Promo code is too long' };
  }
  
  const codeRegex = /^[A-Z0-9_-]+$/;
  if (!codeRegex.test(trimmed)) {
    return { valid: false, value: trimmed, error: 'Promo code can only contain letters, numbers, hyphens, and underscores' };
  }
  
  return { valid: true, value: trimmed };
}

/**
 * Validate household member count
 * @param value - Member count
 * @returns Validation result
 */
export function validateMemberCount(value: string | number): ValidationResult<number> {
  const num = typeof value === 'string' ? parseInt(value, 10) : value;
  
  if (isNaN(num) || !Number.isInteger(num)) {
    return { valid: false, value: 1, error: 'Please enter a valid number' };
  }
  
  if (num < 1) {
    return { valid: false, value: 1, error: 'Must have at least 1 member' };
  }
  
  if (num > 20) {
    return { valid: false, value: 1, error: 'Maximum 20 members allowed' };
  }
  
  return { valid: true, value: num };
}

/**
 * Check if a string is empty or whitespace only
 * @param value - String to check
 * @returns True if empty
 */
export function isEmpty(value: string | null | undefined): boolean {
  return !value || value.trim().length === 0;
}

/**
 * Check if a value is a valid positive number
 * @param value - Value to check
 * @returns True if valid positive number
 */
export function isPositiveNumber(value: unknown): boolean {
  if (typeof value === 'number') {
    return !isNaN(value) && value > 0;
  }
  if (typeof value === 'string') {
    const num = parseFloat(value);
    return !isNaN(num) && num > 0;
  }
  return false;
}

/**
 * Sanitize a string for safe display (basic XSS prevention)
 * @param input - String to sanitize
 * @returns Sanitized string
 */
export function sanitize(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export type Frequency = 'weekly' | 'fortnightly' | 'monthly' | 'quarterly' | 'term' | 'annual';

const VALID_FREQUENCIES: Frequency[] = ['weekly', 'fortnightly', 'monthly', 'quarterly', 'term', 'annual'];

/**
 * Validate a frequency value
 * @param frequency - Frequency to validate
 * @returns Validation result
 */
export function validateFrequency(frequency: string): ValidationResult<Frequency> {
  const lower = frequency.toLowerCase() as Frequency;
  
  if (!VALID_FREQUENCIES.includes(lower)) {
    return { 
      valid: false, 
      value: 'monthly' as Frequency, 
      error: 'Please select a valid frequency' 
    };
  }
  
  return { valid: true, value: lower };
}

/**
 * Form validation helper - validate multiple fields at once
 * @param validations - Object with field names and validation results
 * @returns Object with isValid flag and errors object
 */
export function validateForm<T extends Record<string, ValidationResult<unknown>>>(
  validations: T
): { isValid: boolean; errors: Record<keyof T, string | undefined> } {
  const errors: Record<keyof T, string | undefined> = {} as Record<keyof T, string | undefined>;
  let isValid = true;
  
  for (const [field, result] of Object.entries(validations)) {
    if (!result.valid) {
      isValid = false;
      errors[field as keyof T] = result.error;
    } else {
      errors[field as keyof T] = undefined;
    }
  }
  
  return { isValid, errors };
}
