/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ParkingPlannerRequest } from '../types.ts';
import { parseArrival } from './permitRules.ts';

/** How far in the past an arrival can be before we flag it (covers "I filled this in a bit ago"). */
export const PAST_ARRIVAL_GRACE_MINUTES = 15;

/** Returns a user-facing problem with the arrival date/time, or null if it is fine. */
export function getArrivalError(
  request: Pick<ParkingPlannerRequest, 'arrivalDate' | 'arrivalTime'>,
  now: Date = new Date()
): string | null {
  if (!request.arrivalDate) return 'Pick an arrival date.';
  if (!request.arrivalTime) return 'Pick an arrival time.';
  const arrival = parseArrival(request.arrivalDate, request.arrivalTime);
  if (!arrival) return 'That date or time is not valid.';
  if (arrival.getTime() < now.getTime() - PAST_ARRIVAL_GRACE_MINUTES * 60_000) {
    return 'That time has already passed. Pick a time from now on.';
  }
  return null;
}
