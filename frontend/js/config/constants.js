// ============================================================================
// constants.js — Global configuration and business logic constants
// ============================================================================

export const CURRENCY = 'USD';
export const DELIVERY_FEE = 3.00;      // In dollars
export const TAX_RATE = 0.0875;        // NYC tax: 8.75%
export const MIN_ORDER = 10.00;        // Minimum order for delivery

// API Base URL — switches from local data (Phase 1–5) to API (Phase 6+)
export const API_BASE_URL = 'http://localhost:3000/api';

// Allergen disclaimer — displayed as site-wide banner
export const ALLERGEN_NOTE_DEFAULT = 
  'Prepared in a kitchen that uses peanuts, tree nuts, and dairy. ' +
  'Cross-contact may occur. Confirm with staff before ordering if you have a severe allergy.';

// Spice level display names and icons
export const SPICE_LEVELS = {
  null: { label: 'Not specified', icon: '—' },
  'Mild': { label: 'Mild', icon: '🌶️' },
  'Medium': { label: 'Medium', icon: '🌶️🌶️' },
  'Hot': { label: 'Hot', icon: '🌶️🌶️🌶️' }
};
