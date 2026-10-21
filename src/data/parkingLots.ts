/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ParkingLot } from '../types.ts';

/**
 * UCSD La Jolla campus parking structures.
 *
 * REAL (verified 2026-10-21):
 *   - Names and coordinates come from UCSD's official campus GIS,
 *     "Building Points Public" layer (FacilityLongName, Latitude, Longitude):
 *     https://admin-enterprise-gis.ucsd.edu/server/rest/services/BaseData/Campus_Map_Vector/MapServer/26
 *   - Coordinates mark each structure's building point, NOT its vehicle entrance.
 *
 * SAMPLE (not real yet):
 *   - estimatedAvailabilityPercent and allowedPermitTypes are placeholders until
 *     the QPASS pipeline and verified permit rules are connected.
 *   - walkingMinutes is a fallback; real values are estimated from distance at runtime.
 *
 * OPEN QUESTION: map each structure to its official P-number (e.g. P701) so these IDs
 * join cleanly with QPASS data. Confirm the ID format with the backend team.
 *
 * Excluded on purpose: off-campus structures (Hillcrest, Greenwich Dr, Alvarado) and
 * graduate-housing structures (Mesa Canyon, Ola, One Miramar) that serve residents.
 */
export const PARKING_LOTS: ParkingLot[] = [
  {
    locationId: 'gilman-ps',
    name: 'Gilman Parking Structure',
    latitude: 32.87756239,
    longitude: -117.23365383,
    estimatedAvailabilityPercent: 82,
    walkingMinutes: 8,
    allowedPermitTypes: ['A', 'B', 'S', 'V'],
  },
  {
    locationId: 'hopkins-ps',
    name: 'Hopkins Parking Structure',
    latitude: 32.88379995,
    longitude: -117.23933606,
    estimatedAvailabilityPercent: 64,
    walkingMinutes: 6,
    allowedPermitTypes: ['A', 'B', 'S'],
  },
  {
    locationId: 'pangea-ps',
    name: 'Pangea Parking Structure',
    latitude: 32.88423701,
    longitude: -117.24306936,
    estimatedAvailabilityPercent: 71,
    walkingMinutes: 9,
    allowedPermitTypes: ['B', 'S', 'SR', 'D'],
  },
  {
    locationId: 'scholars-ps',
    name: 'Scholars Parking Structure',
    latitude: 32.88034796,
    longitude: -117.24163894,
    estimatedAvailabilityPercent: 55,
    walkingMinutes: 7,
    allowedPermitTypes: ['A', 'B', 'V'],
  },
  {
    locationId: 'theatre-district-ps',
    name: 'Theatre District Parking Structure',
    latitude: 32.87178041,
    longitude: -117.24305356,
    estimatedAvailabilityPercent: 77,
    walkingMinutes: 14,
    allowedPermitTypes: ['B', 'S', 'V'],
  },
  {
    locationId: 'south-ps',
    name: 'South Parking Structure',
    latitude: 32.87398156,
    longitude: -117.23709381,
    estimatedAvailabilityPercent: 48,
    walkingMinutes: 12,
    allowedPermitTypes: ['A', 'B', 'V'],
  },
  {
    locationId: 'triton-ps',
    name: 'Triton Parking Structure',
    latitude: 32.87754489,
    longitude: -117.23527198,
    estimatedAvailabilityPercent: 69,
    walkingMinutes: 7,
    allowedPermitTypes: ['A', 'B', 'S', 'V'],
  },
  {
    locationId: 'campus-point-west-ps',
    name: 'Campus Point Parking Structure West',
    latitude: 32.87963061,
    longitude: -117.22604283,
    estimatedAvailabilityPercent: 88,
    walkingMinutes: 16,
    allowedPermitTypes: ['A', 'B', 'D'],
  },
  {
    locationId: 'campus-point-east-ps',
    name: 'Campus Point Parking Structure East',
    latitude: 32.88021536,
    longitude: -117.22513874,
    estimatedAvailabilityPercent: 79,
    walkingMinutes: 17,
    allowedPermitTypes: ['B', 'S', 'D'],
  },
  {
    locationId: 'athena-ps',
    name: 'Athena Parking Structure',
    latitude: 32.87929123,
    longitude: -117.22184339,
    estimatedAvailabilityPercent: 85,
    walkingMinutes: 20,
    allowedPermitTypes: ['B', 'S', 'SR', 'D'],
  },
];
