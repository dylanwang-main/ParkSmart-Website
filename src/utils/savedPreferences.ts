/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { PERMIT_OPTIONS, PRIORITY_OPTIONS, WALK_LIMIT_OPTIONS, DEFAULT_PRIORITY } from '../constants.ts';
import type { PermitType, TripPriority } from '../types.ts';

/**
 * The three settings a returning user should not have to enter again: permit,
 * what to prioritize, and the personal walking limit. Saved in this browser only
 * (localStorage). Destination, date and time are per trip and never saved.
 */
export interface SavedPreferences {
  permitType: PermitType;
  priority: TripPriority;
  /** Walking limit in minutes; null is the default 20-minute limit. */
  maxWalkMinutes: number | null;
}

/** What a first-time visitor sees; also what "Reset" returns to. */
export const DEFAULT_PREFERENCES: SavedPreferences = {
  permitType: 'S',
  priority: DEFAULT_PRIORITY,
  maxWalkMinutes: null,
};

const STORAGE_KEY = 'parksmart.preferences.v1';

/** Minimal slice of the Storage API, so tests can pass a fake. */
type KeyValueStore = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

function defaultStore(): KeyValueStore | null {
  try {
    return window.localStorage;
  } catch {
    return null; // private mode, disabled storage, or no window (tests)
  }
}

/** Each field is checked on its own, so one stale value never discards the others. */
function sanitize(value: unknown): SavedPreferences | null {
  if (typeof value !== 'object' || value === null) return null;
  const raw = value as Record<string, unknown>;
  const permit = PERMIT_OPTIONS.find((p) => p.type === raw.permitType)?.type;
  const priority = PRIORITY_OPTIONS.find((p) => p.value === raw.priority)?.value;
  const walk = WALK_LIMIT_OPTIONS.find((o) => o.value === raw.maxWalkMinutes)?.value;
  return {
    permitType: permit ?? DEFAULT_PREFERENCES.permitType,
    priority: priority ?? DEFAULT_PREFERENCES.priority,
    maxWalkMinutes: walk === undefined ? DEFAULT_PREFERENCES.maxWalkMinutes : walk,
  };
}

/** Saved settings, or null if nothing valid was saved (first visit, blocked storage). */
export function loadPreferences(store: KeyValueStore | null = defaultStore()): SavedPreferences | null {
  try {
    const raw = store?.getItem(STORAGE_KEY);
    return raw ? sanitize(JSON.parse(raw)) : null;
  } catch {
    return null;
  }
}

/** Remembers the settings; a full or blocked store only means they are not restored next visit. */
export function savePreferences(prefs: SavedPreferences, store: KeyValueStore | null = defaultStore()): void {
  try {
    store?.setItem(STORAGE_KEY, JSON.stringify(prefs));
  } catch {
    // Storage full or blocked: this visit still works
  }
}

/** Forgets the saved settings so the next visit starts from the defaults. */
export function clearPreferences(store: KeyValueStore | null = defaultStore()): void {
  try {
    store?.removeItem(STORAGE_KEY);
  } catch {
    // Nothing to do if storage is blocked
  }
}

/** True when the settings differ from what a first-time visitor sees. */
export function isCustomized(prefs: SavedPreferences): boolean {
  return (
    prefs.permitType !== DEFAULT_PREFERENCES.permitType ||
    prefs.priority !== DEFAULT_PREFERENCES.priority ||
    prefs.maxWalkMinutes !== DEFAULT_PREFERENCES.maxWalkMinutes
  );
}
