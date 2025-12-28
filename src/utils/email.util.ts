/**
 * Email normalization utilities
 * Emails are case-insensitive per RFC 5321
 */

/**
 * Normalizes email to lowercase and trims whitespace
 * @param email - Email string to normalize
 * @returns Normalized email in lowercase, or null if input is null/undefined
 */
export function normalizeEmail(
  email: string | null | undefined,
): string | null {
  if (!email) return null;
  return email.trim().toLowerCase();
}

/**
 * Normalizes email and ensures it's not null
 * Use this when email is guaranteed to be non-null (e.g., from validated DTOs)
 * @param email - Email string to normalize
 * @returns Normalized email in lowercase
 * @throws Error if email is null/undefined/empty
 */
export function normalizeEmailRequired(email: string): string {
  const normalized = normalizeEmail(email);
  if (!normalized) {
    throw new Error('Email is required');
  }
  return normalized;
}

/**
 * Validates and normalizes email
 * Throws error if email is invalid after normalization
 * @param email - Email string to validate and normalize
 * @returns Normalized email in lowercase
 * @throws Error if email is invalid
 */
export function validateAndNormalizeEmail(email: string): string {
  const normalized = normalizeEmail(email);
  if (!normalized) {
    throw new Error('Email is required');
  }
  // Basic email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(normalized)) {
    throw new Error('Invalid email format');
  }
  return normalized;
}

