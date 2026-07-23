import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // API code is plain Node ESM — no DOM. Tests mock the DB/network modules
    // (models, deliveryService, deliveryPartners) so nothing touches Postgres,
    // Stripe, Google Maps, or a courier in a unit run.
    environment: 'node',
    include: ['**/*.test.js'],
    exclude: ['node_modules/**'],
  },
});
