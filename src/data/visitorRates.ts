/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Visitor (V) pay rates for the La Jolla academic campus, copied from UCSD Transportation:
 * https://transportation.ucsd.edu/visit/parking.html (read Nov 7, 2026; the page shows no
 * effective date). Health lots (Hillcrest, La Jolla Medical Center) and Scripps use other
 * rates and are not modeled. Rates change, so the UI always links the source.
 */
export const VISITOR_RATES_URL = 'https://transportation.ucsd.edu/visit/parking.html';

export interface VisitorRate {
  hourly: number;
  dailyMax: number;
}

/** "Each hour: $4.50 (daily maximum $36)". */
export const STANDARD_RATE: VisitorRate = { hourly: 4.5, dailyMax: 36 };
/** "After 5 p.m. weekdays and on weekends: $2.25/hr. (maximum $9)". */
export const EVENING_WEEKEND_RATE: VisitorRate = { hourly: 2.25, dailyMax: 9 };
/** Evening rate starts at 5 p.m. on weekdays. */
export const EVENING_START_HOUR = 17;
/** Main campus fees are enforced 7 a.m. to 9 p.m. weekdays. */
export const WEEKDAY_PAY_START_HOUR = 7;
/** Weekend enforcement starts at 10:30 a.m. */
export const WEEKEND_PAY_START_MINUTES = 10 * 60 + 30;
/** Enforcement ends at 9 p.m. every day. */
export const PAY_END_HOUR = 21;

export interface VisitorPricing extends VisitorRate {
  /** Which published rate applies at the arrival time. */
  tier: 'standard' | 'evening_weekend';
  /** False when the arrival is before/after the posted pay hours. */
  inPayHours: boolean;
}

/** Rate that applies to an arrival time (local time), per the published schedule. */
export function visitorPricingAt(arrival: Date): VisitorPricing {
  const day = arrival.getDay();
  const weekend = day === 0 || day === 6;
  const minutes = arrival.getHours() * 60 + arrival.getMinutes();
  const start = weekend ? WEEKEND_PAY_START_MINUTES : WEEKDAY_PAY_START_HOUR * 60;
  const inPayHours = minutes >= start && minutes < PAY_END_HOUR * 60;
  const evening = weekend || arrival.getHours() >= EVENING_START_HOUR;
  return {
    ...(evening ? EVENING_WEEKEND_RATE : STANDARD_RATE),
    tier: evening ? 'evening_weekend' : 'standard',
    inPayHours,
  };
}

/** "$4.50/hr, max $36/day". */
export function formatRate(rate: VisitorRate): string {
  const money = (n: number) => `$${Number.isInteger(n) ? n : n.toFixed(2)}`;
  return `${money(rate.hourly)}/hr, max ${money(rate.dailyMax)}/day`;
}
