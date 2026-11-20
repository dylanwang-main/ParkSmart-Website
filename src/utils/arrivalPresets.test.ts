import { describe, expect, it } from 'vitest';
import { arrivalPresets, matchesPreset } from './arrivalPresets.ts';

describe('arrival presets', () => {
  const now = new Date(2026, 10, 19, 17, 31); // Thu Nov 19 2026, 5:31 PM local

  it('offers now, tomorrow 9 AM and tomorrow 1 PM', () => {
    expect(arrivalPresets(now).map((p) => [p.label, p.date, p.time])).toEqual([
      ['Now', '2026-11-19', '17:31'],
      ['Tomorrow 9 AM', '2026-11-20', '09:00'],
      ['Tomorrow 1 PM', '2026-11-20', '13:00'],
    ]);
  });

  it('rolls "tomorrow" over month and year ends', () => {
    const newYearsEve = new Date(2026, 11, 31, 8, 5);
    expect(arrivalPresets(newYearsEve)[1].date).toBe('2027-01-01');
  });

  it('knows which preset the form is on', () => {
    const [nowPreset, morning] = arrivalPresets(now);
    expect(matchesPreset(morning, '2026-11-20', '09:00')).toBe(true);
    expect(matchesPreset(morning, '2026-11-20', '09:30')).toBe(false);
    expect(matchesPreset(nowPreset, '2026-11-19', '17:31')).toBe(true);
  });
});
