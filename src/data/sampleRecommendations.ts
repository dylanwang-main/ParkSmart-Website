/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { SCORING_WEIGHTS, SAMPLE_DESTINATIONS } from '../constants.ts';
import {
  ParkingLot,
  ParkingPlannerRequest,
  ParkingPlannerResponse,
  ParkingRecommendation,
  PermitType,
} from '../types.ts';

/**
 * 6 Fictional sample parking lots.
 * NOTE: All coordinates and availability numbers are UNVERIFIED sample placeholders
 * placed near the central campus of UC San Diego for UI prototyping purposes.
 */
export const SAMPLE_LOTS: ParkingLot[] = [
  {
    // UNVERIFIED placeholder near UCSD Library Walk / Center Hall
    locationId: 'SAMPLE-01',
    name: 'Sample Lot 1',
    latitude: 32.8805,
    longitude: -117.2348,
    estimatedAvailabilityPercent: 82,
    walkingMinutes: 6,
    allowedPermitTypes: ['A', 'B', 'S', 'V'],
    description: 'Central campus multi-tier sample structure',
  },
  {
    // UNVERIFIED placeholder near UCSD Ridge Walk / Muir College
    locationId: 'SAMPLE-02',
    name: 'Sample Lot 2',
    latitude: 32.8839,
    longitude: -117.2371,
    estimatedAvailabilityPercent: 74,
    walkingMinutes: 8,
    allowedPermitTypes: ['A', 'B', 'S', 'SR', 'D'],
    description: 'West perimeter open-air sample parking lot',
  },
  {
    // UNVERIFIED placeholder near UCSD Gilman Drive / South entrance
    locationId: 'SAMPLE-03',
    name: 'Sample Lot 3',
    latitude: 32.8778,
    longitude: -117.2356,
    estimatedAvailabilityPercent: 91,
    walkingMinutes: 11,
    allowedPermitTypes: ['B', 'S', 'D', 'V'],
    description: 'South transit corridor high-capacity sample structure',
  },
  {
    // UNVERIFIED placeholder near UCSD North Campus / Athletics
    locationId: 'SAMPLE-04',
    name: 'Sample Lot 4',
    latitude: 32.8872,
    longitude: -117.2405,
    estimatedAvailabilityPercent: 65,
    walkingMinutes: 13,
    allowedPermitTypes: ['S', 'SR', 'D', 'V'],
    description: 'North athletic sample lot with shuttle accessibility',
  },
  {
    // UNVERIFIED placeholder near UCSD Warren College / East campus
    locationId: 'SAMPLE-05',
    name: 'Sample Lot 5',
    latitude: 32.8832,
    longitude: -117.2312,
    estimatedAvailabilityPercent: 88,
    walkingMinutes: 5,
    allowedPermitTypes: ['A', 'B', 'SR', 'D'],
    description: 'East research hub subterranean sample parking',
  },
  {
    // UNVERIFIED placeholder near UCSD Scholars Drive / Revelle College
    locationId: 'SAMPLE-06',
    name: 'Sample Lot 6',
    latitude: 32.8759,
    longitude: -117.2392,
    estimatedAvailabilityPercent: 58,
    walkingMinutes: 9,
    allowedPermitTypes: ['A', 'B', 'S', 'SR', 'D', 'V'],
    description: 'Southwest commuter sample parking area',
  },
];

/**
 * Calculates straight-line distance in kilometers between two geo-coordinates.
 */
function calculateDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Estimates walking time in minutes based on distance from the chosen destination.
 * Standard average campus walking speed: approx 12-14 min/km, minimum 3 min.
 */
function estimateWalkingTime(lot: ParkingLot, destinationId: string): number {
  const dest = SAMPLE_DESTINATIONS.find((d) => d.id === destinationId);
  if (!dest) {
    return lot.walkingMinutes;
  }
  const distanceKm = calculateDistanceKm(
    lot.latitude,
    lot.longitude,
    dest.latitude,
    dest.longitude
  );
  // Estimate ~12 minutes per km on campus pedestrian walkways plus buffer
  const calculatedMinutes = Math.round(distanceKm * 13) + 2;
  return Math.max(3, calculatedMinutes);
}

/**
 * Generates an automated plain-language reason explaining why this lot was chosen.
 */
function generateRecommendationReason(
  availability: number,
  walkingMinutes: number,
  rank: 'First choice' | 'Backup'
): string {
  if (rank === 'First choice') {
    if (availability >= 80 && walkingMinutes <= 7) {
      return `Optimal balance: ${availability}% expected capacity and only ${walkingMinutes} min walk`;
    }
    if (availability >= 85) {
      return `Highest expected availability (${availability}%), quick ${walkingMinutes} min walk`;
    }
    if (walkingMinutes <= 5) {
      return `Closest eligible parking at ${walkingMinutes} min walk with solid ${availability}% availability`;
    }
    return `Higher expected availability (${availability}%), ${walkingMinutes} min walk`;
  } else {
    if (walkingMinutes <= 6) {
      return `Quickest backup option: ${walkingMinutes} min walk (${availability}% capacity)`;
    }
    if (availability >= 80) {
      return `Reliable alternative with ${availability}% expected space buffer`;
    }
    return `Solid alternate candidate, ${walkingMinutes} min walk (${availability}% availability)`;
  }
}

/**
 * SCORING ALGORITHM:
 * Evaluates parking options based on 65% expected availability and 35% walking convenience.
 * Shorter walks receive higher scores on a normalized 0-100 scale.
 *
 * @param availabilityPercent - Value between 0 and 100
 * @param walkingMinutes - Walking duration in minutes
 * @returns Composite score out of 100
 */
export function calculateParkingScore(
  availabilityPercent: number,
  walkingMinutes: number
): number {
  // Normalize walking convenience: 0 min = 100, 20+ min = 0
  const normalizedWalkConvenience = Math.max(
    0,
    Math.min(
      100,
      ((SCORING_WEIGHTS.MAX_WALK_BENCHMARK_MINUTES - walkingMinutes) /
        SCORING_WEIGHTS.MAX_WALK_BENCHMARK_MINUTES) *
        100
    )
  );

  // 65% availability + 35% walking convenience
  const score =
    availabilityPercent * SCORING_WEIGHTS.AVAILABILITY_WEIGHT +
    normalizedWalkConvenience * SCORING_WEIGHTS.WALKING_WEIGHT;

  return Math.round(score * 10) / 10;
}

/**
 * Filter and rank sample parking lots for a user request.
 * Returns the top two eligible lots (First choice & Backup).
 *
 * NOTE: Replace this function body with a fetch to your real API endpoint in production.
 */
export function getSampleRecommendations(
  request: ParkingPlannerRequest
): ParkingPlannerResponse {
  // 1. Filter lots by the selected permit type
  const eligibleLots = SAMPLE_LOTS.filter((lot) =>
    lot.allowedPermitTypes.includes(request.permitType)
  );

  // If no lots match permit type, return empty recommendations
  if (eligibleLots.length === 0) {
    return {
      recommendations: [],
      query: request,
      generatedAt: new Date().toISOString(),
      isSampleData: true,
    };
  }

  // 2. Compute dynamic walk times and scores for each eligible lot
  const scoredLots = eligibleLots.map((lot) => {
    const walkTime = estimateWalkingTime(lot, request.destinationId);
    const score = calculateParkingScore(lot.estimatedAvailabilityPercent, walkTime);
    return {
      lot: {
        ...lot,
        walkingMinutes: walkTime,
      },
      score,
    };
  });

  // 3. Sort descending by computed score
  scoredLots.sort((a, b) => b.score - a.score);

  // 4. Select top two lots as "First choice" and "Backup"
  const recommendations: ParkingRecommendation[] = [];

  if (scoredLots.length > 0) {
    recommendations.push({
      badgeLabel: 'First choice',
      lot: scoredLots[0].lot,
      score: scoredLots[0].score,
      reason: generateRecommendationReason(
        scoredLots[0].lot.estimatedAvailabilityPercent,
        scoredLots[0].lot.walkingMinutes,
        'First choice'
      ),
    });
  }

  if (scoredLots.length > 1) {
    recommendations.push({
      badgeLabel: 'Backup',
      lot: scoredLots[1].lot,
      score: scoredLots[1].score,
      reason: generateRecommendationReason(
        scoredLots[1].lot.estimatedAvailabilityPercent,
        scoredLots[1].lot.walkingMinutes,
        'Backup'
      ),
    });
  }

  return {
    recommendations,
    query: request,
    generatedAt: new Date().toISOString(),
    isSampleData: true,
  };
}
