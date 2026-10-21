/**
 * Tests for the recommendation logic: the 65/35 scoring formula and
 * permit-based filtering. These cover logic the UI relies on, not styling.
 */

import { describe, expect, it } from 'vitest';
import { SAMPLE_DESTINATIONS, SCORING_WEIGHTS } from '../constants.ts';
import { ParkingPlannerRequest, PermitType } from '../types.ts';
import {
  SAMPLE_LOTS,
  calculateParkingScore,
  getSampleRecommendations,
} from './sampleRecommendations.ts';

/** Builds a request for the first sample destination with the given permit. */
function makeRequest(permitType: PermitType): ParkingPlannerRequest {
  return {
    destinationId: SAMPLE_DESTINATIONS[0].id,
    arrivalDate: '2026-10-21',
    arrivalTime: '12:00',
    permitType,
  };
}

describe('calculateParkingScore', () => {
  const maxWalk = SCORING_WEIGHTS.MAX_WALK_BENCHMARK_MINUTES;

  it('gives 100 for full availability and a zero-minute walk', () => {
    expect(calculateParkingScore(100, 0)).toBe(100);
  });

  it('gives 0 for no availability and a walk at the benchmark limit', () => {
    expect(calculateParkingScore(0, maxWalk)).toBe(0);
  });

  it('weights availability at 65% and walking convenience at 35%', () => {
    // Full availability only, worst walk: availability weight alone
    expect(calculateParkingScore(100, maxWalk)).toBe(65);
    // No availability, best walk: walking weight alone
    expect(calculateParkingScore(0, 0)).toBe(35);
  });

  it('treats walks longer than the benchmark as zero convenience, not negative', () => {
    expect(calculateParkingScore(50, maxWalk + 15)).toBe(
      calculateParkingScore(50, maxWalk)
    );
  });

  it('scores a shorter walk higher when availability is equal', () => {
    expect(calculateParkingScore(70, 5)).toBeGreaterThan(
      calculateParkingScore(70, 12)
    );
  });
});

describe('getSampleRecommendations', () => {
  const permits: PermitType[] = ['A', 'B', 'S', 'SR', 'D', 'V'];

  it.each(permits)('only recommends lots that allow a %s permit', (permit) => {
    const { recommendations } = getSampleRecommendations(makeRequest(permit));
    for (const rec of recommendations) {
      expect(rec.lot.allowedPermitTypes).toContain(permit);
    }
  });

  it.each(permits)('returns at most two distinct lots for a %s permit', (permit) => {
    const { recommendations } = getSampleRecommendations(makeRequest(permit));
    expect(recommendations.length).toBeLessThanOrEqual(2);
    const ids = recommendations.map((rec) => rec.lot.locationId);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('ranks the first choice at or above the backup', () => {
    const { recommendations } = getSampleRecommendations(makeRequest('S'));
    expect(recommendations).toHaveLength(2);
    expect(recommendations[0].badgeLabel).toBe('First choice');
    expect(recommendations[1].badgeLabel).toBe('Backup');
    expect(recommendations[0].score).toBeGreaterThanOrEqual(recommendations[1].score);
  });

  it('marks every response as sample data', () => {
    expect(getSampleRecommendations(makeRequest('B')).isSampleData).toBe(true);
  });

  it('has sample lots for every permit type so no option is a dead end', () => {
    for (const permit of permits) {
      expect(SAMPLE_LOTS.some((lot) => lot.allowedPermitTypes.includes(permit))).toBe(true);
    }
  });
});
