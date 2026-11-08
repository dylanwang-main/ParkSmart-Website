/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * "Did you find a spot?" answers, saved in this browser only (localStorage). There is no
 * backend endpoint for feedback yet, so nothing is sent anywhere; this keeps the log ready
 * to forward once one exists. No personal data: lot, answer, arrival time and when answered.
 */
const STORAGE_KEY = 'parksmart.spotFeedback.v1';
const MAX_ENTRIES = 200;

export interface SpotFeedback {
  locationId: string;
  found: boolean;
  /** Arrival time the search was for (ISO), if known. */
  arrival: string | null;
  /** When the user answered (ISO). */
  answeredAt: string;
}

type KeyValueStore = Pick<Storage, 'getItem' | 'setItem'>;

function defaultStore(): KeyValueStore | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

/** All saved answers, oldest first; empty if none or unreadable. */
export function loadFeedback(store: KeyValueStore | null = defaultStore()): SpotFeedback[] {
  try {
    const raw = store?.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (e): e is SpotFeedback =>
        !!e && typeof e.locationId === 'string' && typeof e.found === 'boolean' && typeof e.answeredAt === 'string',
    );
  } catch {
    return [];
  }
}

/** Saves one answer (newest kept if the log is full) and returns the new log. */
export function recordFeedback(
  entry: Omit<SpotFeedback, 'answeredAt'>,
  store: KeyValueStore | null = defaultStore(),
  now: Date = new Date(),
): SpotFeedback[] {
  const next = [...loadFeedback(store), { ...entry, answeredAt: now.toISOString() }].slice(-MAX_ENTRIES);
  try {
    store?.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Storage full or blocked: the thank-you still shows, the answer just is not kept
  }
  return next;
}
