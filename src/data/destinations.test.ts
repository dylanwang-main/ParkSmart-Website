/**
 * Sanity checks for the campus destination list pulled from UCSD's GIS.
 */

import { describe, expect, it } from 'vitest';
import { CAMPUS_DESTINATIONS, DEFAULT_DESTINATION_ID } from './destinations.ts';

describe('CAMPUS_DESTINATIONS', () => {
  it('has unique IDs and names', () => {
    expect(new Set(CAMPUS_DESTINATIONS.map((d) => d.id)).size).toBe(CAMPUS_DESTINATIONS.length);
    expect(new Set(CAMPUS_DESTINATIONS.map((d) => d.name)).size).toBe(CAMPUS_DESTINATIONS.length);
  });

  it('includes the default destination', () => {
    expect(CAMPUS_DESTINATIONS.some((d) => d.id === DEFAULT_DESTINATION_ID)).toBe(true);
  });

  it('keeps every destination near the La Jolla campus', () => {
    for (const d of CAMPUS_DESTINATIONS) {
      expect(d.latitude).toBeGreaterThan(32.86);
      expect(d.latitude).toBeLessThan(32.895);
      expect(d.longitude).toBeGreaterThan(-117.255);
      expect(d.longitude).toBeLessThan(-117.215);
    }
  });
});
