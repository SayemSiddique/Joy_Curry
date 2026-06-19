// ============================================================================
// utils/validators.js — Joy Curry & Tandoor
// Pure validation functions. No DOM access. Return { valid: boolean, message: string }.
// ============================================================================

/** @typedef {{ valid: boolean, message: string }} ValidationResult */

/**
 * @param {string} value
 * @returns {ValidationResult}
 */
export function validateName(value) {
  const trimmed = value.trim();
  if (trimmed.length === 0) return { valid: false, message: 'Full name is required.' };
  if (trimmed.length < 2)   return { valid: false, message: 'Please enter your full name.' };
  return { valid: true, message: '' };
}

/**
 * Accepts: (212) 555-0000, 212-555-0000, 2125550000, +1-212-555-0000.
 * Strips non-digits, then requires exactly 10 (US) or 11 starting with 1.
 * @param {string} value
 * @returns {ValidationResult}
 */
export function validatePhone(value) {
  const digits = value.replace(/\D/g, '');
  const normalized = digits.startsWith('1') && digits.length === 11 ? digits.slice(1) : digits;
  if (normalized.length === 0) return { valid: false, message: 'Phone number is required.' };
  if (normalized.length !== 10) return { valid: false, message: 'Enter a valid 10-digit US phone number.' };
  return { valid: true, message: '' };
}

/**
 * @param {string} value
 * @returns {ValidationResult}
 */
export function validateEmail(value) {
  const trimmed = value.trim();
  if (trimmed.length === 0) return { valid: false, message: 'Email address is required.' };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(trimmed)) {
    return { valid: false, message: 'Enter a valid email address (e.g. you@example.com).' };
  }
  return { valid: true, message: '' };
}

/**
 * Required only when orderType is "delivery".
 * @param {string} value
 * @param {'delivery'|'pickup'} orderType
 * @returns {ValidationResult}
 */
export function validateAddress(value, orderType) {
  if (orderType !== 'delivery') return { valid: true, message: '' };
  const trimmed = value.trim();
  if (trimmed.length === 0) return { valid: false, message: 'Delivery address is required.' };
  if (trimmed.length < 5)   return { valid: false, message: 'Enter a complete street address.' };
  return { valid: true, message: '' };
}

/**
 * Validate all checkout form fields at once.
 * Returns a map of fieldId → ValidationResult for inline error rendering.
 *
 * @param {{ name: string, phone: string, email: string, address: string, orderType: 'delivery'|'pickup' }} fields
 * @returns {Record<string, ValidationResult>}
 */
export function validateCheckoutForm(fields) {
  return {
    'checkout-name':    validateName(fields.name),
    'checkout-phone':   validatePhone(fields.phone),
    'checkout-email':   validateEmail(fields.email),
    'checkout-address': validateAddress(fields.address, fields.orderType),
  };
}
