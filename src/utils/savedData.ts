/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { clearFavorites } from './favorites.ts';
import { clearRecentDestinations } from './recentDestinations.ts';
import { clearPreferences } from './savedPreferences.ts';
import { clearSchedule } from './savedSchedule.ts';

type SavedDataStore = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

/**
 * Everything the planner keeps on this device for the person: the imported class schedule, starred
 * places, recent places and the saved permit. What "Clear all" forgets.
 */
export function clearAllSavedData(store: SavedDataStore | null = defaultStore()): void {
  clearSchedule(store);
  clearFavorites(store);
  clearRecentDestinations(store);
  clearPreferences(store);
  forgetRetiredKeys(store);
}

/**
 * Keys older versions of the site saved and nothing reads any more: `parksmart.visited.v1` made
 * returning visitors skip the landing page, which every visit now shows.
 */
export const RETIRED_KEYS = ['parksmart.visited.v1'] as const;

/** Removes the retired keys; run once on load so old browsers do not keep them forever. */
export function forgetRetiredKeys(store: Pick<Storage, 'removeItem'> | null = defaultStore()): void {
  for (const key of RETIRED_KEYS) {
    try {
      store?.removeItem(key);
    } catch {
      // Nothing to do if storage is blocked
    }
  }
}

function defaultStore(): SavedDataStore | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}
