// Delivery routing — not yet activated.
// Restaurant: 148 East 46th St, NYC (40.7549° N, 73.9739° W)
// Within 4 miles → restaurant handles its own delivery.
// Beyond 4 miles → dispatch to DoorDash Drive or Uber Direct.

const RESTAURANT_LAT = 40.7549;
const RESTAURANT_LNG = -73.9739;
const OWN_DELIVERY_RADIUS_MILES = 4;

/**
 * Haversine distance between two lat/lng points in miles.
 */
function haversineMiles(lat1, lng1, lat2, lng2) {
  const R   = 3958.8; // Earth radius in miles
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Returns true if the destination is within the restaurant's own delivery radius.
 *
 * @param {number} destLat
 * @param {number} destLng
 * @returns {boolean}
 */
export function isWithinOwnDeliveryRadius(destLat, destLng) {
  return haversineMiles(RESTAURANT_LAT, RESTAURANT_LNG, destLat, destLng) <= OWN_DELIVERY_RADIUS_MILES;
}

/**
 * Dispatch a delivery job to an external partner (DoorDash Drive or Uber Direct).
 * Called only when the delivery address is beyond the 4-mile self-delivery radius.
 *
 * Requires env vars (choose one partner):
 *   DoorDash: DOORDASH_DEVELOPER_ID, DOORDASH_KEY_ID, DOORDASH_SIGNING_SECRET
 *   Uber:     UBER_CLIENT_ID, UBER_CLIENT_SECRET
 *
 * @param {object} order - confirmed order record from the DB
 * @returns {Promise<void>}
 */
export async function dispatchExternalDelivery(_order) {
  throw new Error('External delivery dispatch is not yet activated.');
}
