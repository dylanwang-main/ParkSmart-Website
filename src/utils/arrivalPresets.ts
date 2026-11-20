/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/** One-tap arrival choices, so most trips need no typing. */
export interface ArrivalPreset {
  id: 'now' | 'tomorrow-9' | 'tomorrow-13';
  label: string;
  /** "YYYY-MM-DD" (local), as the date input expects. */
  date: string;
  /** "HH:MM" (24-hour, local), as the time input expects. */
  time: string;
}

/** Hours for the "tomorrow" presets: a typical first class and an early-afternoon one. */
const TOMORROW_MORNING_HOUR = 9;
const TOMORROW_AFTERNOON_HOUR = 13;

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

function dateString(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function atTomorrow(now: Date, hour: number): { date: string; time: string } {
  const d = new Date(now);
  d.setDate(d.getDate() + 1);
  return { date: dateString(d), time: `${pad(hour)}:00` };
}

/** Now, tomorrow 9 AM and tomorrow 1 PM, in the visitor's local time. */
export function arrivalPresets(now: Date = new Date()): ArrivalPreset[] {
  return [
    { id: 'now', label: 'Now', date: dateString(now), time: `${pad(now.getHours())}:${pad(now.getMinutes())}` },
    { id: 'tomorrow-9', label: 'Tomorrow 9 AM', ...atTomorrow(now, TOMORROW_MORNING_HOUR) },
    { id: 'tomorrow-13', label: 'Tomorrow 1 PM', ...atTomorrow(now, TOMORROW_AFTERNOON_HOUR) },
  ];
}

/** True when the form's date and time are exactly this preset's. */
export function matchesPreset(preset: ArrivalPreset, date: string, time: string): boolean {
  return preset.date === date && preset.time === time;
}
