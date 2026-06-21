/**
 * Scheduled-order slot configuration + restaurant-local-time helpers.
 *
 * The restaurant operates in America/New_York. We resolve "today"/"tomorrow"
 * and the current local time via Intl (DST-aware) rather than a fixed UTC−5
 * offset, so scheduling stays correct across daylight-saving changes.
 *
 * Slot times are stored/transmitted as naive local strings "YYYY-MM-DDTHH:MM"
 * so a `LIKE 'YYYY-MM-DD%'` prefix match selects a whole day (see
 * models/order.js getSlotAvailability).
 */
export const RESTAURANT_TZ = 'America/New_York';
export const OPEN_HOUR = 11;        // 11:00 AM first slot
export const CLOSE_HOUR = 22;       // 10:00 PM — last slot is 21:45
export const SLOT_MINUTES = 15;
export const DEFAULT_SLOT_CAPACITY = 10;

/** Returns the restaurant-local date string "YYYY-MM-DD" for a given Date. */
export function localDateStr(date = new Date()) {
  // en-CA formats as YYYY-MM-DD
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: RESTAURANT_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

/** Restaurant-local "HH:MM" (24h) for a given Date. */
export function localTimeStr(date = new Date()) {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: RESTAURANT_TZ,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date);
}

/** Today's restaurant-local date string. */
export function todayStr() {
  return localDateStr(new Date());
}

/** Tomorrow's restaurant-local date string. */
export function tomorrowStr() {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + 1);
  return localDateStr(d);
}

/** True only if dateStr is today or tomorrow (restaurant-local). */
export function isBookableDate(dateStr) {
  return dateStr === todayStr() || dateStr === tomorrowStr();
}

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const SLOT_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/;

export function isValidDateStr(dateStr) {
  return typeof dateStr === 'string' && DATE_PATTERN.test(dateStr);
}

export function isValidSlotTime(slotTime) {
  return typeof slotTime === 'string' && SLOT_PATTERN.test(slotTime);
}

/**
 * Generate every slot time string for a day, from OPEN_HOUR to (but not
 * including) CLOSE_HOUR, at SLOT_MINUTES granularity.
 * e.g. "2026-06-22T11:00" ... "2026-06-22T21:45"
 */
export function generateSlotTimes(dateStr) {
  const times = [];
  for (let h = OPEN_HOUR; h < CLOSE_HOUR; h++) {
    for (let m = 0; m < 60; m += SLOT_MINUTES) {
      const hh = String(h).padStart(2, '0');
      const mm = String(m).padStart(2, '0');
      times.push(`${dateStr}T${hh}:${mm}`);
    }
  }
  return times;
}

/**
 * For a slot string on *today*, decide whether it has already passed in
 * restaurant-local time. Slots on a future date never count as past.
 */
export function isPastSlot(slotTime) {
  const [datePart, timePart] = slotTime.split('T');
  if (datePart !== todayStr()) return false;
  return timePart <= localTimeStr();
}
