/**
 * Security & Input Validation Utility
 *
 * Centralized helpers for sanitization, input bounds validation,
 * credential complexity checks, and data privacy enforcement.
 */

const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

/**
 * Validate standard email format.
 */
export function validateEmail(email: any): boolean {
  if (!email || typeof email !== 'string') return false;
  return EMAIL_REGEX.test(email.trim());
}

/**
 * Enforce minimum password complexity (>= 8 characters).
 */
export function validatePassword(password: any): { valid: boolean; error?: string } {
  if (!password || typeof password !== 'string') {
    return { valid: false, error: 'Password is required and must be a string.' };
  }
  if (password.length < 8) {
    return { valid: false, error: 'Password must be at least 8 characters long.' };
  }
  if (password.length > 128) {
    return { valid: false, error: 'Password exceeds maximum allowed length (128 characters).' };
  }
  return { valid: true };
}

/**
 * Sanitize text inputs: strip control characters and null bytes, trim, and cap length.
 */
export function sanitizeString(val: any, maxLength: number = 500): string {
  if (val === null || val === undefined) return '';
  const str = String(val);
  // Remove null bytes and non-printable control characters (except common whitespace)
  const cleaned = str.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '').trim();
  return cleaned.slice(0, maxLength);
}

/**
 * Validate geographic coordinates.
 */
export function validateCoordinates(lat: any, lng: any): boolean {
  const nLat = Number(lat);
  const nLng = Number(lng);
  if (isNaN(nLat) || isNaN(nLng)) return false;
  if (nLat < -90 || nLat > 90) return false;
  if (nLng < -180 || nLng > 180) return false;
  return true;
}

/**
 * Validate entity/user identifiers (cuid or standard id format).
 */
export function validateId(id: any): boolean {
  if (!id || typeof id !== 'string') return false;
  const trimmed = id.trim();
  if (trimmed.length < 2 || trimmed.length > 64) return false;
  return /^[a-zA-Z0-9_-]+$/.test(trimmed);
}

/**
 * Sanitize external or evidence URLs: prevent script injection schemes.
 */
export function sanitizeUrl(url: any): string | null {
  if (!url || typeof url !== 'string') return null;
  const trimmed = url.trim();
  if (!trimmed) return null;

  // Allow relative upload URLs
  if (trimmed.startsWith('/uploads/')) {
    return trimmed;
  }

  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
      return parsed.href;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Sanitize database and internal errors to prevent leaking SQL/schema details.
 */
export function getSafeErrorMessage(error: any, fallback: string = 'An unexpected error occurred.'): string {
  if (!error) return fallback;
  const msg = typeof error === 'string' ? error : error.message || '';

  // Check for common safe business errors
  const safePhrases = [
    'Unauthorized',
    'Forbidden',
    'not found',
    'already exists',
    'already claimed',
    'Invalid credentials',
    'required',
    'Invalid coordinates',
    'Invalid status',
    'Rate limit exceeded',
    'Password must be',
  ];

  for (const phrase of safePhrases) {
    if (msg.toLowerCase().includes(phrase.toLowerCase())) {
      return msg;
    }
  }

  // Hide Prisma query or SQL engine details
  if (msg.includes('Prisma') || msg.includes('SQL') || msg.includes('constraint') || msg.includes('column')) {
    return 'A database operation could not be completed. Please verify your input.';
  }

  return fallback;
}

/**
 * Strip sensitive credentials (password, password hash) from User objects before sending to clients.
 */
export function sanitizeUser<T extends Record<string, any>>(user: T | null | undefined): Omit<T, 'password'> | null {
  if (!user) return null;
  const { password, ...safeUser } = user;
  return safeUser as Omit<T, 'password'>;
}
