/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Single source of truth for how availability percentages are bucketed and colored,
 * shared by map pins, recommendation cards and the lot detail card.
 */

/** Percent of spaces open at or above which a lot counts as having plenty of space. */
export const PLENTY_THRESHOLD = 75;
/** Percent of spaces open at or above which a lot is "filling up" (below is "nearly full"). */
export const FILLING_THRESHOLD = 50;

export type AvailabilityLevel = 'plenty' | 'filling' | 'nearlyFull';

export interface AvailabilityStatus {
  level: AvailabilityLevel;
  label: string;
  /** iOS system green / orange / red (fills, bars, dots) */
  color: string;
  /** Darker shade of the same hue, readable as text on light glass */
  textColor: string;
}

const STATUS: Record<AvailabilityLevel, AvailabilityStatus> = {
  plenty: { level: 'plenty', label: 'Plenty of space', color: '#34c759', textColor: '#1f7a37' },
  filling: { level: 'filling', label: 'Filling up', color: '#ff9f0a', textColor: '#8a4b00' },
  nearlyFull: { level: 'nearlyFull', label: 'Nearly full', color: '#ff3b30', textColor: '#b42318' },
};

/** Buckets an availability percentage into a level with its label and color. */
export function availabilityStatus(percent: number): AvailabilityStatus {
  if (percent >= PLENTY_THRESHOLD) return STATUS.plenty;
  if (percent >= FILLING_THRESHOLD) return STATUS.filling;
  return STATUS.nearlyFull;
}
