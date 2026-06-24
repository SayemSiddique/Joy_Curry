// Delivery geocoding & routing — restaurant: 148 East 46th St, NYC.
// Within OWN_DELIVERY_RADIUS_MILES → in-house. Beyond → courier partner
// (Uber Direct / DoorDash Drive), dispatched via services/deliveryPartners.
//
// Routing constants and the fee policy live in config/delivery.js (single SoT).

import {
  RESTAURANT_LAT,
  RESTAURANT_LNG,
  OWN_DELIVERY_RADIUS_MILES,
} from '../config/delivery.js';

const GOOGLE_GEOCODE_URL = 'https://maps.googleapis.com/maps/api/geocode/json';

/**
 * Geocodes a free-text address via Google Maps Geocoding API.
 * Returns { lat, lng, formattedAddress } or throws on failure.
 * Requires GOOGLE_MAPS_API_KEY env var — returns null gracefully when absent,
 * which keeps the whole delivery flow degrading to in-house until the key lands.
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

/** Miles from the restaurant to a destination. */
export function milesFromRestaurant(destLat, destLng) {
  return haversineMiles(RESTAURANT_LAT, RESTAURANT_LNG, destLat, destLng);
}

/**
 * Returns true if the destination is within the restaurant's own delivery radius.
 *
 * @param {number} destLat
 * @param {number} destLng
 * @returns {boolean}
 */
export function isWithinOwnDeliveryRadius(destLat, destLng) {
  return milesFromRestaurant(destLat, destLng) <= OWN_DELIVERY_RADIUS_MILES;
}
