import { describe, expect, it } from 'vitest';
import { formatRate, visitorPricingAt } from './visitorRates.ts';

describe('visitorPricingAt', () => {
  it('charges the standard rate on weekday daytime', () => {
    const p = visitorPricingAt(new Date(2026, 10, 10, 10, 0)); // Tue
    expect(p.tier).toBe('standard');
    expect(p.hourly).toBe(4.5);
    expect(p.inPayHours).toBe(true);
  });

  it('switches to the evening rate at 5 p.m. weekdays', () => {
    expect(visitorPricingAt(new Date(2026, 10, 10, 16, 59)).tier).toBe('standard');
    expect(visitorPricingAt(new Date(2026, 10, 10, 17, 0)).tier).toBe('evening_weekend');
  });

  it('uses the evening rate all day on weekends, with fees from 10:30 a.m.', () => {
    const early = visitorPricingAt(new Date(2026, 10, 7, 9, 0)); // Sat
    expect(early.tier).toBe('evening_weekend');
    expect(early.inPayHours).toBe(false);
    expect(visitorPricingAt(new Date(2026, 10, 7, 10, 30)).inPayHours).toBe(true);
  });

  it('flags times outside weekday pay hours', () => {
    expect(visitorPricingAt(new Date(2026, 10, 10, 6, 30)).inPayHours).toBe(false);
    expect(visitorPricingAt(new Date(2026, 10, 10, 21, 0)).inPayHours).toBe(false);
  });
});

describe('formatRate', () => {
  it('formats dollars', () => {
    expect(formatRate({ hourly: 4.5, dailyMax: 36 })).toBe('$4.50/hr, max $36/day');
    expect(formatRate({ hourly: 2.25, dailyMax: 9 })).toBe('$2.25/hr, max $9/day');
  });
});
