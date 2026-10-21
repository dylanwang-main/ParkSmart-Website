/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { CampusDestination, PermitType } from './types.ts';

/**
 * OpenFreeMap free, keyless Positron vector tile style URL.
 * Provides a clean, muted, low-saturation vector base map without API keys.
 */
export const OPENFREEMAP_POSITRON_STYLE_URL = 'https://tiles.openfreemap.org/styles/positron';

/** Basemap options shown in the Map / Satellite toggle. */
export type BasemapMode = 'satellite' | 'map';
export const DEFAULT_BASEMAP: BasemapMode = 'satellite';

/**
 * USGS National Map aerial imagery: public domain, free, no API key.
 * Mostly NAIP 1-meter imagery. The service publishes cached tiles down to
 * about 1:9,028 scale (zoom 16); MapLibre upscales beyond that.
 * Service info: https://basemap.nationalmap.gov/arcgis/rest/services/USGSImageryOnly/MapServer
 */
const USGS_IMAGERY_TILE_URL =
  'https://basemap.nationalmap.gov/arcgis/rest/services/USGSImageryOnly/MapServer/tile/{z}/{y}/{x}';
const USGS_IMAGERY_MAX_ZOOM = 16;

export const SATELLITE_STYLE = {
  version: 8,
  sources: {
    'usgs-imagery': {
      type: 'raster',
      tiles: [USGS_IMAGERY_TILE_URL],
      tileSize: 256,
      maxzoom: USGS_IMAGERY_MAX_ZOOM,
      attribution: 'Imagery: USDA, USGS The National Map',
    },
  },
  layers: [{ id: 'usgs-imagery', type: 'raster', source: 'usgs-imagery' }],
} as const;

/**
 * UCSD Campus Map Center, Zoom & Framing Padding Settings
 */
export const MAP_CONFIG = {
  // Center near University of California San Diego central campus (Library Walk / Price Center)
  DEFAULT_CENTER: [-117.2374, 32.8812] as [number, number],
  DEFAULT_ZOOM: 15.0,
  // Kept at or below the satellite imagery max zoom (16) so it stays sharp.
  FOCUSED_ZOOM: 15.9,
  MIN_ZOOM: 13.5,
  MAX_ZOOM: 18.0,
  FLY_DURATION_MS: 1200,
} as const;

/**
 * Map viewport framing padding:
 * Left padding equals floating panel width (380px) + 24px gap = 404px.
 * Other boundaries receive ~60px padding to keep destination pin and lots fully visible.
 */
export const MAP_PADDING = {
  left: 404,
  right: 60,
  top: 60,
  bottom: 60,
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
 * Campus destinations for the dropdown selector.
 * Names and coordinates verified 2026-10-21 from UCSD's official campus GIS
 * ("Building Points Public" layer, BaseData/Campus_Map_Vector/MapServer/26).
 */
export const SAMPLE_DESTINATIONS: CampusDestination[] = [
  { id: 'DEST-01', name: 'Geisel Library', area: 'Central Campus', latitude: 32.88117324, longitude: -117.23758039 },
  { id: 'DEST-02', name: 'Price Center West', area: 'Student Center', latitude: 32.87941051, longitude: -117.23683532 },
  { id: 'DEST-03', name: 'Franklin Antonio Hall', area: 'Engineering', latitude: 32.88350079, longitude: -117.23482442 },
  { id: 'DEST-04', name: 'Jacobs Hall', area: 'Engineering', latitude: 32.88165733, longitude: -117.2352757 },
  { id: 'DEST-05', name: 'RIMAC', area: 'Recreation', latitude: 32.88525013, longitude: -117.23947914 },
];

/**
 * Permit metadata with plain-language labels
 */
export const PERMIT_OPTIONS: Array<{ type: PermitType; label: string; description: string }> = [
  { type: 'A', label: 'A', description: 'Faculty & Designated Staff' },
  { type: 'B', label: 'B', description: 'Staff & Graduate Students' },
  { type: 'S', label: 'S', description: 'Undergraduate Commuter' },
  { type: 'SR', label: 'SR', description: 'Student Resident' },
  { type: 'D', label: 'D', description: 'Employees & upper-division commuters' },
  { type: 'V', label: 'V', description: 'Visitor / Daily Pay' },
];
