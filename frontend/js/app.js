// ============================================================================
// app.js — Joy Curry & Tandoor Ordering Website
// Main entry point: initializes the app and mounts the UI
// ============================================================================

import { menu } from './data/menu/index.js';
import { CURRENCY, DELIVERY_FEE, TAX_RATE } from './config/constants.js';

console.log('🍛 Joy Curry & Tandoor — App starting...');
console.log(`Menu items loaded: ${menu.length}`);

// Phase 1: Placeholder. We'll render the menu and build filters in Phase 3.
// For now, just verify the menu data loads correctly.

const app = document.getElementById('app');
app.innerHTML = `
  <h1>Joy Curry & Tandoor</h1>
  <p>Menu items loaded: ${menu.length}</p>
  <p>Currency: ${CURRENCY}</p>
  <p>Delivery fee: $${DELIVERY_FEE.toFixed(2)}</p>
`;
