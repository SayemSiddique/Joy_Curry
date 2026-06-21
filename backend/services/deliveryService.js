// Delivery routing — restaurant: 148 East 46th St, NYC
// Within 4 miles → in-house delivery.
// Beyond 4 miles → dispatch to DoorDash Drive or Uber Direct.

const RESTAURANT_LAT = 40.7549;
const RESTAURANT_LNG = -73.9739;
const OWN_DELIVERY_RADIUS_MILES = 4;

const GOOGLE_GEOCODE_URL = 'https://maps.googleapis.com/maps/api/geocode/json';

/**
 * Geocodes a free-text address via Google Maps Geocoding API.
 * Returns { lat, lng, formattedAddress } or throws on failure.
 * Requires GOOGLE_MAPS_API_KEY env var — returns null gracefully when absent.
 *
 * @param {string} address
 * @returns {Promise<{lat: number, lng: number, formattedAddress: string} | null>}
 */
export async function geocodeAddress(address) {
  const key = process.env.GOOGLE_MAPS_API_KEY;
  if (!key) return null;

  const url = `${GOOGLE_GEOCODE_URL}?address=${encodeURIComponent(address)}&key=${key}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Geocoding HTTP ${res.status}`);

  const data = await res.json();
  if (data.status !== 'OK' || !data.results?.length) {
    throw new Error(`Geocoding failed: ${data.status}`);
  }

  const { lat, lng } = data.results[0].geometry.location;
  return { lat, lng, formattedAddress: data.results[0].formatted_address };
}

/**
 * Haversine distance between two lat/lng points in miles.
 */
export function haversineMiles(lat1, lng1, lat2, lng2) {
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
