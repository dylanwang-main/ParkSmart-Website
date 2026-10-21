/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { CampusDestination, PermitType } from './types.ts';

/**
 * UCSD Campus Map Center & Zoom Settings
 */
export const MAP_CONFIG = {
  // Center near University of California San Diego central campus (Library Walk / Price Center)
  DEFAULT_CENTER: [-117.2374, 32.8812] as [number, number],
  DEFAULT_ZOOM: 15.0,
  FOCUSED_ZOOM: 16.3,
  MIN_ZOOM: 13.5,
  MAX_ZOOM: 18.0,
  FLY_DURATION_MS: 1200,
} as const;

/**
 * Free Light Tile Configuration for MapLibre GL
 * Carto Positron provides an ultra-clean, low-saturation, muted base map without API keys.
 */
export const MAP_STYLE_CONFIG = {
  version: 8,
  sources: {
    'carto-positron': {
      type: 'raster',
      tiles: [
        'https://a.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png',
        'https://b.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png',
        'https://c.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png',
        'https://d.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png',
      ],
      tileSize: 256,
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions" target="_blank" rel="noopener">CARTO</a>',
    },
  },
  layers: [
    {
      id: 'carto-positron-layer',
      type: 'raster',
      source: 'carto-positron',
      minzoom: 0,
      maxzoom: 20,
    },
  ],
} as const;

/**
 * Animation duration & timing curves
 */
export const ANIMATION_TIMINGS = {
  SHIMMER_DURATION_MS: 1000,
  TRANSITION_QUICK_MS: 150,
  TRANSITION_DEFAULT_MS: 250,
  STAGGER_DELAY_SECONDS: 0.08,
} as const;

/**
 * UI Color Tokens & Availability Palette
 */
export const COLOR_TOKENS = {
  ACCENT_PRIMARY: '#2563EB', // Clean transit blue
  ACCENT_HOVER: '#1D4ED8',
  ACCENT_RING: '#93C5FD',
  CARD_SELECTED_BORDER: '#3B82F6',
  MARKER_DEFAULT: '#475569',
  MARKER_HIGHLIGHT: '#2563EB',
  MARKER_BACKUP: '#0284C7',
} as const;

/**
 * Scoring weights for recommendation engine:
 * 65% expected availability, 35% walking convenience.
 */
export const SCORING_WEIGHTS = {
  AVAILABILITY_WEIGHT: 0.65,
  WALKING_WEIGHT: 0.35,
  // Baseline max walk time for normalization in minutes
  MAX_WALK_BENCHMARK_MINUTES: 20,
} as const;

/**
 * 5 Sample Campus Destinations for the dropdown selector
 */
export const SAMPLE_DESTINATIONS: CampusDestination[] = [
  {
    id: 'DEST-01',
    name: 'Geisel Library',
    area: 'Central Campus',
    latitude: 32.8812,
    longitude: -117.2375,
  },
  {
    id: 'DEST-02',
    name: 'Price Center',
    area: 'Student Center',
    latitude: 32.8798,
    longitude: -117.2361,
  },
  {
    id: 'DEST-03',
    name: 'Franklin Antonio Hall',
    area: 'Warren College',
    latitude: 32.8828,
    longitude: -117.2325,
  },
  {
    id: 'DEST-04',
    name: 'Jacobs School of Engineering',
    area: 'Warren College',
    latitude: 32.8821,
    longitude: -117.2338,
  },
  {
    id: 'DEST-05',
    name: 'RIMAC Arena',
    area: 'North Campus',
    latitude: 32.8856,
    longitude: -117.2396,
  },
];

/**
 * Permit metadata with plain-language labels
 */
export const PERMIT_OPTIONS: Array<{ type: PermitType; label: string; description: string }> = [
  { type: 'A', label: 'A', description: 'Faculty & Designated Staff' },
  { type: 'B', label: 'B', description: 'Staff & Graduate Students' },
  { type: 'S', label: 'S', description: 'Undergraduate Commuter' },
  { type: 'SR', label: 'SR', description: 'Student Resident' },
  { type: 'D', label: 'D', description: 'Discount / Carpool' },
  { type: 'V', label: 'V', description: 'Visitor / Daily Pay' },
];
