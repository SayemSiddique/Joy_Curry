// Clover POS integration — not yet activated.
// When the owner approves the site for live use, activate by implementing
// createCloverOrder() to POST to the Clover REST API.
// Docs: https://docs.clover.com/reference/createorder

/**
 * Mirror a confirmed Joy Curry order into Clover so kitchen staff see it
 * on the POS terminal without manual re-entry.
 *
 * Requires env vars: CLOVER_API_KEY, CLOVER_MERCHANT_ID
 *
 * @param {object} order - confirmed order record from the DB
 * @returns {Promise<void>}
 */
export async function createCloverOrder(_order) {
  throw new Error('Clover POS integration is not yet activated.');
}
