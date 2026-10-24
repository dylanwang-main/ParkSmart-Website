/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'motion/react';
import * as maplibregl from 'maplibre-gl';
import type { Feature, LineString } from 'geojson';
// MapLibre draws tiles in a background Web Worker. Vite bundles the main library
// but does not copy the worker file, so the default worker URL 404s and the map
// renders blank. `?url` makes Vite emit the worker as an asset and give us its URL.
import maplibreWorkerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?url';
import {
  MAP_CONFIG,
  MAP_PADDING,
  OPENFREEMAP_POSITRON_STYLE_URL,
  SATELLITE_STYLE,
  DEFAULT_BASEMAP,
  BasemapMode,
} from '../constants.ts';
import { ParkingLot, CampusDestination } from '../types.ts';
import { availabilityStatus } from '../utils/availability.ts';
import { availabilityAt } from '../utils/availabilityModel.ts';
import { preloadLotAerial } from '../utils/lotAerial.ts';

// Must run before the first map is created.
maplibregl.setWorkerUrl(maplibreWorkerUrl);
// Start the tile workers now, so they download in parallel with React mounting
// instead of after the map is created.
maplibregl.prewarm();

/** Returns the MapLibre style for a basemap mode. */
function styleFor(mode: BasemapMode): string | maplibregl.StyleSpecification {
  return mode === 'satellite'
    ? (SATELLITE_STYLE as unknown as maplibregl.StyleSpecification)
    : OPENFREEMAP_POSITRON_STYLE_URL;
}

/** Escapes text placed into marker HTML (building names can contain "&"). */
function escapeHtml(text: string): string {
  return text.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
}

/** Height of the bottom strip covered by the lot detail card (card + aerial photo + margins). */
const DETAIL_CARD_INSET_PX = 520;

/** Route reveal timing: drive line draws first, then the walk line. */
const DRIVE_DRAW_MS = 1400;
const WALK_DRAW_MS = 900;
const ROUTE_CURVE_POINTS = 64;

type LngLat = [number, number];

/** Gentle quadratic curve between two points (bulging to one side), so the
 * straight-line preview reads as a route rather than a ruler line. */
function curvedPath(from: LngLat, to: LngLat, bend = 0.18): LngLat[] {
  const mid: LngLat = [(from[0] + to[0]) / 2, (from[1] + to[1]) / 2];
  const control: LngLat = [mid[0] - (to[1] - from[1]) * bend, mid[1] + (to[0] - from[0]) * bend];
  const points: LngLat[] = [];
  for (let i = 0; i <= ROUTE_CURVE_POINTS; i++) {
    const t = i / ROUTE_CURVE_POINTS;
    const a = (1 - t) ** 2, b = 2 * (1 - t) * t, c = t ** 2;
    points.push([a * from[0] + b * control[0] + c * to[0], a * from[1] + b * control[1] + c * to[1]]);
  }
  return points;
}

function lineFeature(coordinates: LngLat[]): Feature<LineString> {
  return { type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates } };
}

const easeInOut = (t: number) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2);

/** Adds the route sources/layers if the current style doesn't have them (styles reset on basemap switch). */
function ensureRouteLayers(map: maplibregl.Map): void {
  if (map.getSource('route-drive')) return;
  const empty = lineFeature([]);
  map.addSource('route-drive', { type: 'geojson', data: empty });
  map.addSource('route-walk', { type: 'geojson', data: empty });
  map.addLayer({ id: 'route-drive-casing', type: 'line', source: 'route-drive',
    layout: { 'line-cap': 'round', 'line-join': 'round' },
    paint: { 'line-color': '#ffffff', 'line-width': 9, 'line-opacity': 0.95 } });
  map.addLayer({ id: 'route-drive', type: 'line', source: 'route-drive',
    layout: { 'line-cap': 'round', 'line-join': 'round' },
    paint: { 'line-color': '#007aff', 'line-width': 5.5 } });
  map.addLayer({ id: 'route-walk-casing', type: 'line', source: 'route-walk',
    layout: { 'line-cap': 'round', 'line-join': 'round' },
    paint: { 'line-color': '#0f172a', 'line-width': 6, 'line-opacity': 0.35 } });
  map.addLayer({ id: 'route-walk', type: 'line', source: 'route-walk',
    layout: { 'line-cap': 'round', 'line-join': 'round' },
    paint: { 'line-color': '#ffffff', 'line-width': 3.5, 'line-dasharray': [0.1, 1.8] } });
}

/** Top padding when framing a route, leaving room for the balloon pin and its label. */
const ROUTE_FRAME_TOP_PX = 160;

/** Beyond this distance from the route's lot, we show the dot but don't zoom out to it. */
const MAX_ROUTE_FRAME_KM = 60;

/** Straight-line distance in km (equirectangular approximation; fine at city scale). */
function approxDistanceKm(a: { latitude: number; longitude: number }, b: { latitude: number; longitude: number }) {
  const kmPerDegLat = 111.32;
  const dx = (b.longitude - a.longitude) * kmPerDegLat * Math.cos(((a.latitude + b.latitude) / 2) * (Math.PI / 180));
  const dy = (b.latitude - a.latitude) * kmPerDegLat;
  return Math.hypot(dx, dy);
}

/** Zoom at which every pin shows its name (below it, only ranked/selected/hovered pins do). */
const SHOW_ALL_LABELS_ZOOM = 16;

/** Pin drop-in timing; must match the .pin-drop duration in index.css. */
const PIN_DROP_DURATION_MS = 420;
const PIN_DROP_BASE_DELAY_MS = 120;
const PIN_DROP_STAGGER_MS = 40;

/** Shortens "Gilman Parking Structure" to "Gilman" for compact map pins. */
function pinLabel(name: string): string {
  return name.replace(' Parking Structure', '');
}

/**
 * Empty MapLibre control used as a mount point for the React Map/Satellite toggle.
 * Registering it as a real control puts it in the same top-right row as the zoom
 * and compass buttons, so MapLibre handles alignment and spacing for us.
 */
class ReactMountControl implements maplibregl.IControl {
  readonly container = document.createElement('div');
  onAdd(): HTMLElement {
    this.container.className = 'maplibregl-ctrl';
    return this.container;
  }
  onRemove(): void {
    this.container.remove();
  }
}

const BASEMAP_OPTIONS: Array<{ mode: BasemapMode; label: string }> = [
  { mode: 'map', label: 'Map' },
  { mode: 'satellite', label: 'Satellite' },
];

interface MapContainerProps {
  lots: ParkingLot[];
  selectedLocationId: string | null;
  selectedDestination: CampusDestination | null;
  onSelectLot: (locationId: string) => void;
  onClearSelection: () => void;
  /** Tapping empty map offers "Park near here"; accepting sets a dropped-pin destination. */
  onDropPin: (latitude: number, longitude: number) => void;
  /** Whether the left planner panel is showing; controls how much map is covered. */
  isPanelOpen: boolean;
  /** Whether the lot detail card is showing at the bottom of the map. */
  isDetailOpen: boolean;
  /** Current first choice / backup, labeled on the map. */
  rankedLotIds: { first: string | null; backup: string | null; third: string | null };
  /** User's location once they share it for a route; shown as a blue dot. */
  userLocation: { latitude: number; longitude: number } | null;
  /** Lot the route goes to; framed together with the user's location. */
  routeLot: ParkingLot | null;
  /** Time the pins' availability colors represent (the time scrubber). */
  availabilityTime: Date;
  /** Bumps each time a route starts, replaying the drive/walk line animation. */
  routeRevealKey: number;
  /** Whether the route starts from the user's location (draw the drive line) or not (walk only). */
  hasDriveLeg: boolean;
}

/**
 * Interactive full-screen map rendered with MapLibre GL and OpenFreeMap Positron vector tiles.
 * Supports custom DOM markers, smooth flyTo camera glides, and responsive panel offset framing.
 */
export const MapContainer: React.FC<MapContainerProps> = ({
  lots,
  selectedLocationId,
  selectedDestination,
  onSelectLot,
  onClearSelection,
  onDropPin,
  isPanelOpen,
  isDetailOpen,
  rankedLotIds,
  userLocation,
  routeLot,
  availabilityTime,
  routeRevealKey,
  hasDriveLeg,
}) => {
  const availabilityTimeRef = useRef(availabilityTime);
  availabilityTimeRef.current = availabilityTime;
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const lotMarkersRef = useRef<Map<string, maplibregl.Marker>>(new Map());
  const destinationMarkerRef = useRef<maplibregl.Marker | null>(null);
  const dropPopupRef = useRef<maplibregl.Popup | null>(null);
  const onDropPinRef = useRef(onDropPin);
  onDropPinRef.current = onDropPin;
  const hasSelectionRef = useRef(false);
  hasSelectionRef.current = selectedLocationId !== null || isDetailOpen;
  const isLoadedRef = useRef<boolean>(false);
  const [basemap, setBasemap] = useState<BasemapMode>(DEFAULT_BASEMAP);
  // Placeholder shown until the first tiles have drawn (or a few seconds pass)
  const [isMapReady, setIsMapReady] = useState(false);
  const [basemapControlEl, setBasemapControlEl] = useState<HTMLElement | null>(null);

  // Map padding: reserve the panel's width on the left only while it is open.
  // Clamped to half the window so a narrow window can't produce an impossible camera.
  const viewportWidth = typeof window === 'undefined' ? 1440 : window.innerWidth;
  const viewportHeight = typeof window === 'undefined' ? 800 : window.innerHeight;
  // Phone: the planner is a bottom sheet over the lower half, so reserve the bottom, not the left
  const isNarrow = viewportWidth < 640;
  const padding = isNarrow
    ? {
        top: 40,
        right: 24,
        left: 24,
        bottom: isDetailOpen
          ? Math.min(DETAIL_CARD_INSET_PX, viewportHeight * 0.6)
          : isPanelOpen
          ? viewportHeight * 0.5 + 60
          : 100,
      }
    : {
        ...MAP_PADDING,
        // While the lot card is open, treat the strip it covers as hidden too
        bottom: isDetailOpen ? DETAIL_CARD_INSET_PX : MAP_PADDING.bottom,
        left: isPanelOpen ? Math.min(MAP_PADDING.left, viewportWidth / 2) : MAP_PADDING.right,
      };
  const paddingRef = useRef(padding);
  paddingRef.current = padding;

  // Helper to frame all lots plus the destination with panel offset padding
  const frameAllPoints = (map: maplibregl.Map, animate = true) => {
    if (lots.length === 0) return;

    const bounds = new maplibregl.LngLatBounds();
    lots.forEach((lot) => bounds.extend([lot.longitude, lot.latitude]));
    if (selectedDestination) {
      bounds.extend([selectedDestination.longitude, selectedDestination.latitude]);
    }

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    map.fitBounds(bounds, {
      padding: paddingRef.current,
      maxZoom: 16.0,
      duration: !animate || prefersReducedMotion ? 0 : 600,
    });
  };

  // Initialize MapLibre instance with OpenFreeMap Positron style
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: styleFor(DEFAULT_BASEMAP),
      center: MAP_CONFIG.DEFAULT_CENTER,
      zoom: MAP_CONFIG.DEFAULT_ZOOM,
      minZoom: MAP_CONFIG.MIN_ZOOM,
      maxZoom: MAP_CONFIG.MAX_ZOOM,
      attributionControl: false,
    });

    // Top-right row: Map/Satellite toggle first (left), then zoom + compass (right).
    // The toggle itself is rendered by React into this control via a portal below.
    const basemapControl = new ReactMountControl();
    map.addControl(basemapControl, 'top-right');
    setBasemapControlEl(basemapControl.container);

    map.addControl(
      new maplibregl.NavigationControl({
        showCompass: true,
        showZoom: true,
        visualizePitch: false,
      }),
      'top-right'
    );

    // Add OpenFreeMap & OpenStreetMap attribution in bottom right
    map.addControl(
      new maplibregl.AttributionControl({
        compact: true,
      }),
      'bottom-right'
    );

    // Show every pin's name only when zoomed in enough that they don't collide
    const updateLabelVisibility = () =>
      map.getContainer().classList.toggle('ps-show-labels', map.getZoom() >= SHOW_ALL_LABELS_ZOOM);
    map.on('zoom', updateLabelVisibility);
    updateLabelVisibility();

    map.once('idle', () => setIsMapReady(true));
    const readyTimer = window.setTimeout(() => setIsMapReady(true), 6000);

    // On initial map style load, fit bounds to all lots plus the destination
    map.on('load', () => {
      isLoadedRef.current = true;
      frameAllPoints(map, false);
    });

    // Clicking the map background: first click closes an open lot; otherwise it offers
    // "Park near here" at that spot, for places that are not in the destination list
    map.on('click', (e) => {
      const target = e.originalEvent.target as HTMLElement;
      if (target.closest('.parksmart-marker, .maplibregl-popup')) return;
      dropPopupRef.current?.remove();
      if (hasSelectionRef.current) {
        onClearSelection();
        return;
      }
      const { lat, lng } = e.lngLat;
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'ps-drop-button';
      button.innerHTML = '<span class="ps-drop-dot"></span>Park near here';
      button.addEventListener('click', () => {
        dropPopupRef.current?.remove();
        onDropPinRef.current(lat, lng);
      });
      dropPopupRef.current = new maplibregl.Popup({
        closeButton: false,
        className: 'ps-drop-popup',
        offset: 10,
        maxWidth: 'none',
      })
        .setLngLat(e.lngLat)
        .setDOMContent(button)
        .addTo(map);
    });

    mapRef.current = map;

    return () => {
      window.clearTimeout(readyTimer);
      map.remove();
      mapRef.current = null;
      isLoadedRef.current = false;
    };
  }, [onClearSelection]);

  // Update or render destination marker
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (destinationMarkerRef.current) {
      destinationMarkerRef.current.remove();
      destinationMarkerRef.current = null;
    }

    if (selectedDestination) {
      const el = document.createElement('div');
      el.className = 'parksmart-destination-pin flex flex-col items-center pointer-events-none select-none z-10';
      el.innerHTML = `
        <div class="px-2.5 py-1 bg-slate-900/90 text-white text-[11px] font-medium rounded-full shadow-md backdrop-blur-sm border border-slate-700/40 flex items-center gap-1.5 whitespace-nowrap mb-1">
          <svg class="w-3 h-3 text-white/80" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <path stroke-linecap="round" stroke-linejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
            <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
          </svg>
          <span>${escapeHtml(selectedDestination.name)}</span>
        </div>
        <div class="w-2.5 h-2.5 rounded-full bg-slate-900 border-2 border-white shadow"></div>
      `;

      // Above ordinary pins (1), level with ranked ones (2), below the selected pin (3)
      el.style.zIndex = '2';

      const marker = new maplibregl.Marker({
        element: el,
        anchor: 'bottom',
      })
        .setLngLat([selectedDestination.longitude, selectedDestination.latitude])
        .addTo(map);

      destinationMarkerRef.current = marker;
    }
  }, [selectedDestination]);

  // When the user picks a different destination, show the whole picture again.
  // (Only on destination changes, never on lot select/deselect.)
  const lastDestinationIdRef = useRef<string | undefined>(selectedDestination?.id);
  useEffect(() => {
    const map = mapRef.current;
    const destinationId = selectedDestination?.id;
    if (destinationId === lastDestinationIdRef.current) return;
    lastDestinationIdRef.current = destinationId;
    dropPopupRef.current?.remove();
    // A dropped pin is already where the user is looking; only reframe for picked places
    if (map && isLoadedRef.current && selectedDestination && !selectedDestination.isPin) frameAllPoints(map, true);
  }, [selectedDestination]);

  // Render and update parking lot markers
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // Clean up markers that are no longer in lots list
    const currentLotIds = new Set(lots.map((l) => l.locationId));
    lotMarkersRef.current.forEach((marker, id) => {
      if (!currentLotIds.has(id)) {
        marker.remove();
        lotMarkersRef.current.delete(id);
      }
    });

    // Create or refresh markers
    lots.forEach((lot, index) => {
      const isSelected = selectedLocationId === lot.locationId;
      const rank =
        lot.locationId === rankedLotIds.first
          ? 'first'
          : lot.locationId === rankedLotIds.backup
          ? 'backup'
          : lot.locationId === rankedLotIds.third
          ? 'third'
          : null;
      let marker = lotMarkersRef.current.get(lot.locationId);

      // Create new marker if not exists
      if (!marker) {
        const el = document.createElement('div');
        el.className = 'parksmart-marker';
        // Staggered drop-in when pins first appear (see .pin-drop in index.css)
        el.dataset.createdAt = String(performance.now());
        el.dataset.dropDelay = String(PIN_DROP_BASE_DELAY_MS + index * PIN_DROP_STAGGER_MS);
        el.setAttribute('role', 'button');
        el.setAttribute('tabindex', '0');
        el.setAttribute('aria-label', `Parking Lot ${lot.name}, ${lot.estimatedAvailabilityPercent}% estimated capacity`);

        el.addEventListener('click', (e) => {
          e.stopPropagation();
          onSelectLot(lot.locationId);
        });

        // Hovered pin rises above overlapping neighbors so it can be clicked
        el.addEventListener('mouseenter', () => {
          el.style.zIndex = '4';
          preloadLotAerial(lot); // card opens with its photo already downloading
        });
        el.addEventListener('mouseleave', () => {
          el.style.zIndex = el.dataset.baseZ ?? '1';
        });

        el.addEventListener('keydown', (e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            e.stopPropagation();
            onSelectLot(lot.locationId);
          }
        });

        // 'center' anchors the 0x0 marker element exactly on the coordinate
        marker = new maplibregl.Marker({
          element: el,
          anchor: 'center',
        })
          .setLngLat([lot.longitude, lot.latitude])
          .addTo(map);

        lotMarkersRef.current.set(lot.locationId, marker);
      }

      // Update marker element styling and contents
      const el = marker.getElement();
      // Explicit z-index on every pin (its own stacking context) so the selected or
      // hovered pin reliably stacks above overlapping neighbors like Gilman/Triton.
      // Stacking: selected (3) > first choice/backup (2) > others (1); hover raises to 4
      el.dataset.baseZ = isSelected ? '3' : rank ? '2' : '1';
      el.style.zIndex = el.dataset.baseZ;
      el.setAttribute('aria-pressed', String(isSelected));
      // Label style follows the basemap: white-on-dark for satellite, dark-on-light for map.
      // A class flip is enough; no need to rebuild the pin.
      el.classList.toggle('ps-on-light', basemap === 'map');
      el.classList.toggle('ps-selected', isSelected);
      el.classList.toggle('ps-ranked', rank !== null);
      el.classList.toggle('ps-lot', lot.kind === 'lot');

      // Rebuild the pin's HTML only when its selected state or rank actually changed
      // (usually 1 or 2 pins per click, not all of them).
      const renderKey = `${isSelected}|${rank}`;
      if (el.dataset.renderKey === renderKey) return;
      el.dataset.renderKey = renderKey;

      const avail = `<span class="ps-avail" style="background:${availabilityStatus(availabilityAt(lot, availabilityTimeRef.current)).color}"></span>`;
      const rankTag =
        rank === 'first'
          ? '<span class="ps-rank ps-rank-first">First choice</span>'
          : rank === 'backup'
          ? '<span class="ps-rank ps-rank-backup">Backup</span>'
          : rank === 'third'
          ? '<span class="ps-rank ps-rank-backup">#3</span>'
          : '';
      const label = `<span class="ps-label"><span class="ps-name">${pinLabel(lot.name)}</span>${rankTag}</span>`;

      // If the pin is rebuilt while its drop-in is still playing, offset the delay by the
      // time already elapsed; a negative delay resumes the animation part-way through.
      const elapsed = performance.now() - Number(el.dataset.createdAt);
      const remainingDelay = Number(el.dataset.dropDelay) - elapsed;
      const stillDropping = remainingDelay + PIN_DROP_DURATION_MS > 0;

      el.innerHTML = `
        <div class="${stillDropping ? 'pin-drop' : ''}" style="position:absolute;left:0;top:0;animation-delay:${Math.round(remainingDelay)}ms">
          ${
            isSelected
              ? `<span class="ps-ground"></span>
                 <span class="ps-balloon">
                   <span class="ps-balloon-head">P${avail}</span>
                   <span class="ps-balloon-tail"></span>
                 </span>`
              : `<span class="ps-glyph">P${avail}</span>`
          }
          ${label}
        </div>
      `;
    });
  }, [lots, selectedLocationId, onSelectLot, basemap, rankedLotIds]);

  // "You are here" dot for routing, plus framing the user and the route's lot together
  const userMarkerRef = useRef<maplibregl.Marker | null>(null);
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    userMarkerRef.current?.remove();
    userMarkerRef.current = null;
    if (!userLocation) return;

    const el = document.createElement('div');
    el.className = 'ps-user';
    el.setAttribute('aria-label', 'Your location');
    userMarkerRef.current = new maplibregl.Marker({ element: el, anchor: 'center' })
      .setLngLat([userLocation.longitude, userLocation.latitude])
      .addTo(map);

    if (routeLot && approxDistanceKm(userLocation, routeLot) <= MAX_ROUTE_FRAME_KM) {
      const bounds = new maplibregl.LngLatBounds()
        .extend([userLocation.longitude, userLocation.latitude])
        .extend([routeLot.longitude, routeLot.latitude]);
      const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      map.fitBounds(bounds, {
        // Extra room on top: the selected balloon pin rises ~50px above its point
        padding: { ...paddingRef.current, top: Math.max(paddingRef.current.top, ROUTE_FRAME_TOP_PX) },
        maxZoom: 16,
        duration: prefersReducedMotion ? 0 : MAP_CONFIG.FLY_DURATION_MS,
      });
    }
  }, [userLocation, routeLot]);

  // Time scrubber: recolor each pin's availability dot in place (no pin rebuilds)
  useEffect(() => {
    for (const lot of lots) {
      const dot = lotMarkersRef.current.get(lot.locationId)?.getElement().querySelector<HTMLElement>('.ps-avail');
      if (dot) dot.style.background = availabilityStatus(availabilityAt(lot, availabilityTime)).color;
    }
  }, [availabilityTime, lots]);

  // Cinematic route reveal: draw the drive line (user -> lot), then the walk line
  // (lot -> destination). Straight-line curves until a routing API is connected.
  const routePathsRef = useRef<{ drive: LngLat[]; walk: LngLat[] }>({ drive: [], walk: [] });
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !isLoadedRef.current) return;
    ensureRouteLayers(map);
    const driveSource = map.getSource('route-drive') as maplibregl.GeoJSONSource;
    const walkSource = map.getSource('route-walk') as maplibregl.GeoJSONSource;

    if (!routeLot || !selectedDestination) {
      routePathsRef.current = { drive: [], walk: [] };
      driveSource.setData(lineFeature([]));
      walkSource.setData(lineFeature([]));
      return;
    }

    const lotPoint: LngLat = [routeLot.longitude, routeLot.latitude];
    const drive = hasDriveLeg && userLocation ? curvedPath([userLocation.longitude, userLocation.latitude], lotPoint) : [];
    const walk = curvedPath(lotPoint, [selectedDestination.longitude, selectedDestination.latitude], -0.12);
    routePathsRef.current = { drive, walk };

    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const driveMs = drive.length && !reduce ? DRIVE_DRAW_MS : 0;
    const walkMs = reduce ? 0 : WALK_DRAW_MS;
    const start = performance.now();
    let frame = 0;
    const draw = (now: number) => {
      const elapsed = now - start;
      const driveT = driveMs ? Math.min(1, elapsed / driveMs) : 1;
      const walkT = walkMs ? Math.min(1, Math.max(0, (elapsed - driveMs) / walkMs)) : 1;
      driveSource.setData(lineFeature(drive.slice(0, Math.max(2, Math.ceil(easeInOut(driveT) * drive.length)))));
      walkSource.setData(lineFeature(walkT > 0 ? walk.slice(0, Math.max(2, Math.ceil(easeInOut(walkT) * walk.length))) : []));
      if (driveT < 1 || walkT < 1) frame = requestAnimationFrame(draw);
    };
    frame = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(frame);
  }, [routeRevealKey, routeLot, selectedDestination, userLocation, hasDriveLeg]);

  // Basemap switches replace the style (and its layers): restore the route lines
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const restore = () => {
      ensureRouteLayers(map);
      (map.getSource('route-drive') as maplibregl.GeoJSONSource).setData(lineFeature(routePathsRef.current.drive));
      (map.getSource('route-walk') as maplibregl.GeoJSONSource).setData(lineFeature(routePathsRef.current.walk));
    };
    map.on('style.load', restore);
    return () => {
      map.off('style.load', restore);
    };
  }, []);

  // Swap basemap when the toggle changes. DOM markers are unaffected by setStyle.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !isLoadedRef.current) return;
    map.setStyle(styleFor(basemap));
  }, [basemap]);

  // Selecting a lot: if its pin is hidden (off screen or under the panel), glide it
  // into view. Zoom is never changed. Deselecting never moves the camera.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !isLoadedRef.current || !selectedLocationId) return;

    const targetLot = lots.find((l) => l.locationId === selectedLocationId);
    if (!targetLot) return;

    const point = map.project([targetLot.longitude, targetLot.latitude]);
    const { width, height } = map.getContainer().getBoundingClientRect();
    const pad = paddingRef.current;
    const isVisible =
      point.x >= pad.left && point.x <= width - pad.right &&
      point.y >= pad.top && point.y <= height - pad.bottom;
    if (isVisible) return;

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    map.easeTo({
      center: [targetLot.longitude, targetLot.latitude],
      padding: pad,
      duration: prefersReducedMotion ? 0 : MAP_CONFIG.FLY_DURATION_MS,
    });
  }, [selectedLocationId, lots]);

  // Opening/closing the panel only shifts the map's visual center; zoom stays put.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !isLoadedRef.current) return;
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    map.easeTo({ padding: paddingRef.current, duration: prefersReducedMotion ? 0 : 300 });
  }, [isPanelOpen]);

  return (
    <>
      <div
        ref={mapContainerRef}
        className="absolute inset-0 w-full h-full bg-[#f8f9fa] z-0 focus:outline-none"
        aria-label="Interactive UCSD Campus Parking Map"
      />

      {/* Placeholder while map tiles load, so the first seconds are not a blank screen */}
      <div
        aria-hidden={isMapReady}
        className={`absolute inset-0 z-[1] flex items-center justify-center bg-slate-100 pointer-events-none transition-opacity duration-500 ${
          isMapReady ? 'opacity-0' : 'opacity-100'
        }`}
      >
        <div role="status" className="flex items-center gap-2 text-xs font-medium text-slate-500">
          <span className="w-4 h-4 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin" />
          {isMapReady ? '' : 'Loading map...'}
        </div>
      </div>

      {/* Map / Satellite toggle (iOS segmented control), mounted inside the map's
          top-right control row. Height matches a zoom button (34px incl. border). */}
      {basemapControlEl &&
        createPortal(
          <div
            role="radiogroup"
            aria-label="Map style"
            className="flex h-[34px] p-[2px] rounded-xl bg-white/55 backdrop-blur-xl backdrop-saturate-150 border border-white/50 shadow-lg shadow-black/10"
          >
            {BASEMAP_OPTIONS.map(({ mode, label }) => (
              <button
                key={mode}
                type="button"
                role="radio"
                aria-checked={basemap === mode}
                onClick={() => setBasemap(mode)}
                className={`relative h-[28px] px-3 text-xs font-semibold rounded-[10px] transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-900/30 cursor-pointer ${
                  basemap === mode ? 'text-slate-900' : 'text-slate-700 hover:text-slate-900'
                }`}
              >
                {basemap === mode && (
                  <motion.span
                    layoutId="basemap-thumb"
                    className="absolute inset-0 rounded-[10px] bg-white shadow-sm"
                    transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                  />
                )}
                <span className="relative">{label}</span>
              </button>
            ))}
          </div>,
          basemapControlEl
        )}
    </>
  );
};
