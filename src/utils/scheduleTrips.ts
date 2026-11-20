/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { CAMPUS_DESTINATIONS, searchDestinations } from '../data/destinations.ts';
import type { CampusDestination } from '../types.ts';

/**
 * How long before class starts the planner aims to be parked: about a 10-minute walk plus
 * a 10-minute margin. Our own choice, not UCSD data; the walk to each building varies.
 */
export const ARRIVE_BEFORE_CLASS_MINUTES = 20;

/** Words in a location that are too short or generic to identify a building by name. */
const MIN_NAME_LENGTH = 5;
/** How many leading words of a location are tried as a schedule code ("PCYNH 106", "AP&M B402"). */
const CODE_WORDS = 2;

const clean = (text: string) => text.toLowerCase().replace(/[&.\-/,()']/g, ' ').replace(/\s+/g, ' ').trim();
/** Same, with spaces removed, so "AP&M" and "APM" compare equal. */
const compact = (text: string) => clean(text).replace(/ /g, '');

/**
 * The campus building a class location refers to, or null when it is not one we can name for
 * sure (remote, "Room 2001", an unknown code). Tries a schedule code or alias at the start
 * ("CENTR 115", "AP&M 2402"), then a full building name anywhere ("Room 100, York Hall").
 * Never guesses: an unmatched class asks the student to pick a destination.
 */
export function matchBuilding(location: string): CampusDestination | null {
  const words = location.split(/[\s,]+/).filter(Boolean);
  if (words.length === 0) return null;

  for (let n = 1; n <= Math.min(CODE_WORDS, words.length); n += 1) {
    const candidate = words.slice(0, n).join(' ');
    const hit = searchDestinations(candidate, 5).find(
      (m) => m.matchedOn !== undefined && compact(m.matchedOn) === compact(candidate)
    );
    if (hit) return hit.destination;
  }

  const text = ` ${clean(location)} `;
  const named = CAMPUS_DESTINATIONS.filter((d) => {
    const name = clean(d.name);
    return name.length >= MIN_NAME_LENGTH && text.includes(` ${name} `);
  }).sort((a, b) => b.name.length - a.name.length);
  return named[0] ?? null;
}

/** The planner's arrival fields for a class: its date, and a time that leaves time to walk. */
export function arrivalForClass(session: { date: string; startMinutes: number }): {
  arrivalDate: string;
  arrivalTime: string;
} {
  const minutes = Math.max(0, session.startMinutes - ARRIVE_BEFORE_CLASS_MINUTES);
  return {
    arrivalDate: session.date,
    arrivalTime: `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`,
  };
}

/** 570 becomes "9:30 AM". */
export function formatClock(minutes: number): string {
  const h = Math.floor(minutes / 60) % 24;
  const m = minutes % 60;
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`;
}
