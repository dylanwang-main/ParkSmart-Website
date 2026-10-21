/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'motion/react';
import * as maplibregl from 'maplibre-gl';
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

// Must run before the first map is created.
maplibregl.setWorkerUrl(maplibreWorkerUrl);

/** Returns the MapLibre style for a basemap mode. */
function styleFor(mode: BasemapMode): string | maplibregl.StyleSpecification {
  return mode === 'satellite'
    ? (SATELLITE_STYLE as unknown as maplibregl.StyleSpecification)
    : OPENFREEMAP_POSITRON_STYLE_URL;
}

/** Height of the bottom strip covered by the lot detail card (card + margins). */
const DETAIL_CARD_INSET_PX = 330;

/** Pin drop-in timing; must match the .pin-drop duration in index.css. */
const PIN_DROP_DURATION_MS = 520;
const PIN_DROP_BASE_DELAY_MS = 300;
const PIN_DROP_STAGGER_MS = 70;

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
  /** Whether the left planner panel is showing; controls how much map is covered. */
  isPanelOpen: boolean;
  /** Whether the lot detail card is showing at the bottom of the map. */
  isDetailOpen: boolean;
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
  isPanelOpen,
  isDetailOpen,
}) => {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const lotMarkersRef = useRef<Map<string, maplibregl.Marker>>(new Map());
  const destinationMarkerRef = useRef<maplibregl.Marker | null>(null);
  const isLoadedRef = useRef<boolean>(false);
  const [basemap, setBasemap] = useState<BasemapMode>(DEFAULT_BASEMAP);
  const [basemapControlEl, setBasemapControlEl] = useState<HTMLElement | null>(null);

  // Map padding: reserve the panel's width on the left only while it is open.
  // Clamped to half the window so a narrow window can't produce an impossible camera.
  const viewportWidth = typeof window === 'undefined' ? 1440 : window.innerWidth;
  const padding = {
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
      duration: !animate || prefersReducedMotion ? 0 : 900,
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

    // On initial map style load, fit bounds to all lots plus the destination
    map.on('load', () => {
      isLoadedRef.current = true;
      frameAllPoints(map, false);
    });

    // Clicking map background clears selection
    map.on('click', (e) => {
      const target = e.originalEvent.target as HTMLElement;
      if (!target.closest('.parksmart-marker')) {
        onClearSelection();
      }
    });

    mapRef.current = map;

    return () => {
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
          <span>${selectedDestination.name}</span>
        </div>
        <div class="w-2.5 h-2.5 rounded-full bg-slate-900 border-2 border-white shadow"></div>
      `;

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
    if (map && isLoadedRef.current) frameAllPoints(map, true);
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
        el.addEventListener('mouseenter', () => { el.style.zIndex = '4'; });
        el.addEventListener('mouseleave', () => {
          el.style.zIndex = el.getAttribute('aria-pressed') === 'true' ? '3' : '1';
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
      // Selected pin always stacks above neighbors (Gilman and Triton overlap when zoomed out)
      // Every pin gets an explicit z-index (creating its own stacking context) so the
      // selected/hovered pin reliably stacks above overlapping neighbors.
      el.style.zIndex = isSelected ? '3' : '1';
      el.setAttribute('aria-pressed', String(isSelected));
      // iOS system green / orange / red
      const availabilityColor =
        lot.estimatedAvailabilityPercent >= 75
          ? '#34c759'
          : lot.estimatedAvailabilityPercent >= 50
          ? '#ff9f0a'
          : '#ff3b30';
      const avail = `<span class="ps-avail" style="background:${availabilityColor}"></span>`;
      const label = `<span class="ps-label">${pinLabel(lot.name)}</span>`;

      // The pin's HTML is rebuilt on every selection change. To keep the drop-in
      // from replaying (or snapping) we offset its delay by the time already elapsed:
      // a negative delay resumes the animation part-way through.
      const elapsed = performance.now() - Number(el.dataset.createdAt);
      const remainingDelay = Number(el.dataset.dropDelay) - elapsed;
      const stillDropping = remainingDelay + PIN_DROP_DURATION_MS > 0;

      // Label style follows the basemap: white-on-dark for satellite, dark-on-light for map
      el.classList.toggle('ps-on-light', basemap === 'map');
      el.classList.toggle('ps-selected', isSelected);

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
  }, [lots, selectedLocationId, onSelectLot, basemap]);

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

      {/* Map / Satellite toggle (iOS segmented control), mounted inside the map's
          top-right control row. Height matches a zoom button (34px incl. border). */}
      {basemapControlEl &&
        createPortal(
          <div
            role="radiogroup"
            aria-label="Map style"
            className="flex h-[34px] p-[2px] rounded-xl bg-white/55 backdrop-blur-2xl backdrop-saturate-150 border border-white/50 shadow-lg shadow-black/10"
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
