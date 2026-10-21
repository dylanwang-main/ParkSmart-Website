/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Valid UCSD parking permit types modeled in this prototype.
 * A: Faculty/Staff
 * B: Staff/Grad Students
 * S: Undergraduate Students
 * SR: Student Residents
 * D: Employees & upper-division commuters
 * V: Visitor
 */
export type PermitType = 'A' | 'B' | 'S' | 'SR' | 'D' | 'V';

/**
 * Campus destination representation for travel planning.
 */
export interface CampusDestination {
  id: string;
  name: string;
  area: string;
  latitude: number;
  longitude: number;
}

/**
 * Parking lot representation with sample coordinates and permit allowances.
 */
export interface ParkingLot {
  locationId: string;
  name: string;
  latitude: number;
  longitude: number;
  estimatedAvailabilityPercent: number;
  walkingMinutes: number;
  allowedPermitTypes: PermitType[];
  description?: string;
}

/**
 * Recommendation card output after filtering and scoring.
 */
export interface ParkingRecommendation {
  badgeLabel: 'First choice' | 'Backup';
  lot: ParkingLot;
  score: number;
  reason: string;
}

/**
 * User inputs payload submitted from the preference form.
 */
export interface ParkingPlannerRequest {
  destinationId: string;
  arrivalDate: string;
  arrivalTime: string;
  permitType: PermitType;
}

/**
 * Response payload structure for recommendations.
 */
export interface ParkingPlannerResponse {
  recommendations: ParkingRecommendation[];
  query: ParkingPlannerRequest;
  generatedAt: string;
  isSampleData: true;
}

/**
 * Developer state simulation options for verifying edge cases.
 */
export type DevSimulationState = 'normal' | 'loading' | 'empty' | 'error';
