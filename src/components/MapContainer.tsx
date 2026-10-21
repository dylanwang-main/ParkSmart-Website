/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef } from 'react';
import * as maplibregl from 'maplibre-gl';
import { MAP_CONFIG, MAP_STYLE_CONFIG, COLOR_TOKENS } from '../constants.ts';
import { ParkingLot, CampusDestination } from '../types.ts';

interface MapContainerProps {
  lots: ParkingLot[];
  selectedLocationId: string | null;
  selectedDestination: CampusDestination | null;
  onSelectLot: (locationId: string) => void;
  onClearSelection: () => void;
}

/**
 * Interactive full-screen map rendered with MapLibre GL and free Carto Positron light tiles.
 * Supports custom DOM markers, smooth flyTo camera glides, and marker focus rings.
 */
export const MapContainer: React.FC<MapContainerProps> = ({
  lots,
  selectedLocationId,
  selectedDestination,
  onSelectLot,
  onClearSelection,
}) => {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const lotMarkersRef = useRef<Map<string, maplibregl.Marker>>(new Map());
  const destinationMarkerRef = useRef<maplibregl.Marker | null>(null);

  // Initialize MapLibre instance
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: MAP_STYLE_CONFIG as unknown as maplibregl.StyleSpecification,
      center: MAP_CONFIG.DEFAULT_CENTER,
      zoom: MAP_CONFIG.DEFAULT_ZOOM,
      minZoom: MAP_CONFIG.MIN_ZOOM,
      maxZoom: MAP_CONFIG.MAX_ZOOM,
      attributionControl: false,
    });

    // Add minimal navigation controls in top-right
    map.addControl(
      new maplibregl.NavigationControl({
        showCompass: true,
        showZoom: true,
        visualizePitch: false,
      }),
      'top-right'
    );

    // Add subtle attribution in bottom right
    map.addControl(
      new maplibregl.AttributionControl({
        compact: true,
      }),
      'bottom-right'
    );

    // Clicking map background clears selection
    map.on('click', (e) => {
      // Check if original event target was a marker element
      const target = e.originalEvent.target as HTMLElement;
      if (!target.closest('.parksmart-marker')) {
        onClearSelection();
      }
    });

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
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
          <svg class="w-3 h-3 text-sky-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
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
    lots.forEach((lot) => {
      const isSelected = selectedLocationId === lot.locationId;
      let marker = lotMarkersRef.current.get(lot.locationId);

      // Create new marker if not exists
      if (!marker) {
        const el = document.createElement('div');
        el.className = 'parksmart-marker cursor-pointer group transition-transform duration-200';
        el.setAttribute('role', 'button');
        el.setAttribute('tabindex', '0');
        el.setAttribute('aria-label', `Parking Lot ${lot.name}, ${lot.estimatedAvailabilityPercent}% estimated capacity`);

        el.addEventListener('click', (e) => {
          e.stopPropagation();
          onSelectLot(lot.locationId);
        });

        el.addEventListener('keydown', (e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            e.stopPropagation();
            onSelectLot(lot.locationId);
          }
        });

        marker = new maplibregl.Marker({
          element: el,
          anchor: 'bottom',
        })
          .setLngLat([lot.longitude, lot.latitude])
          .addTo(map);

        lotMarkersRef.current.set(lot.locationId, marker);
      }

      // Update marker element styling and contents
      const el = marker.getElement();
      const availabilityColor =
        lot.estimatedAvailabilityPercent >= 75
          ? 'bg-emerald-500'
          : lot.estimatedAvailabilityPercent >= 50
          ? 'bg-amber-500'
          : 'bg-rose-500';

      el.innerHTML = `
        <div class="relative flex flex-col items-center">
          ${
            isSelected
              ? `<div class="absolute -inset-2.5 rounded-full bg-blue-500/25 animate-ping pointer-events-none"></div>
                 <div class="absolute -inset-1.5 rounded-full bg-blue-500/20 pointer-events-none"></div>`
              : ''
          }
          <div class="relative flex items-center gap-1.5 px-2.5 py-1.5 rounded-full transition-all duration-200 shadow-md border ${
            isSelected
              ? 'bg-blue-600 text-white border-blue-400 scale-110 shadow-blue-500/30 shadow-lg ring-2 ring-blue-300/60 z-30'
              : 'bg-white/95 text-slate-800 border-slate-200/90 hover:scale-105 hover:border-slate-300 hover:bg-white z-20'
          }">
            <span class="inline-flex items-center justify-center w-4 h-4 rounded-full ${
              isSelected ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-700'
            } text-[10px] font-bold font-mono">P</span>
            <span class="text-xs font-semibold tracking-tight whitespace-nowrap">${lot.name.replace('Sample ', '')}</span>
            <span class="w-2 h-2 rounded-full ${availabilityColor} shrink-0 ring-1 ring-white/60"></span>
          </div>
          <div class="w-1.5 h-1.5 rotate-45 -mt-0.5 border-r border-b ${
            isSelected ? 'bg-blue-600 border-blue-400' : 'bg-white border-slate-200'
          }"></div>
        </div>
      `;
    });
  }, [lots, selectedLocationId, onSelectLot]);

  // Smooth flyTo camera glide when selected lot changes
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !selectedLocationId) return;

    const targetLot = lots.find((l) => l.locationId === selectedLocationId);
    if (!targetLot) return;

    // Check prefers-reduced-motion
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (prefersReducedMotion) {
      map.setCenter([targetLot.longitude, targetLot.latitude]);
      map.setZoom(MAP_CONFIG.FOCUSED_ZOOM);
    } else {
      map.flyTo({
        center: [targetLot.longitude, targetLot.latitude],
        zoom: MAP_CONFIG.FOCUSED_ZOOM,
        speed: 1.0,
        curve: 1.2,
        essential: true,
      });
    }
  }, [selectedLocationId, lots]);

  return (
    <div
      ref={mapContainerRef}
      className="absolute inset-0 w-full h-full bg-[#f8f9fa] z-0 focus:outline-none"
      aria-label="Interactive UCSD Campus Parking Map"
    />
  );
};
