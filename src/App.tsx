/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { MapContainer } from './components/MapContainer.tsx';
import { PreferenceForm } from './components/PreferenceForm.tsx';
import { ResultsList } from './components/ResultsList.tsx';
import { TopPrototypePill } from './components/TopPrototypePill.tsx';
import { DevStateControl } from './components/DevStateControl.tsx';
import { SAMPLE_DESTINATIONS, ANIMATION_TIMINGS } from './constants.ts';
import { SAMPLE_LOTS, getSampleRecommendations } from './data/sampleRecommendations.ts';
import {
  ParkingPlannerRequest,
  ParkingRecommendation,
  DevSimulationState,
  PermitType,
} from './types.ts';

/**
 * Returns today's date formatted as YYYY-MM-DD in local time.
 */
function getTodayDateString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Returns the upcoming hour formatted as HH:00 in local time.
 */
function getNextHourTimeString(): string {
  const now = new Date();
  const nextHour = (now.getHours() + 1) % 24;
  return `${String(nextHour).padStart(2, '0')}:00`;
}

/**
 * Main application component.
 * Owns state for formInputs, recommendations, selectedLocationId, and simulated UI states.
 */
export default function App() {
  // 1. Form Inputs State (defaulting to Geisel Library, today, next hour, 'S' permit)
  const [formInputs, setFormInputs] = useState<ParkingPlannerRequest>({
    destinationId: SAMPLE_DESTINATIONS[0].id,
    arrivalDate: getTodayDateString(),
    arrivalTime: getNextHourTimeString(),
    permitType: 'S',
  });

  // 2. Recommendations State
  const [recommendations, setRecommendations] = useState<ParkingRecommendation[]>([]);

  // 3. Selection State (synchronizes selected card with map marker)
  const [selectedLocationId, setSelectedLocationId] = useState<string | null>(null);

  // 4. Loading & Animation State
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [hasCalculatedOnce, setHasCalculatedOnce] = useState<boolean>(false);

  // 5. Dev State Simulator
  const [devState, setDevState] = useState<DevSimulationState>('normal');

  // Compute recommendations from current formInputs
  const runPlanner = useCallback(
    (customInputs?: ParkingPlannerRequest) => {
      const inputs = customInputs || formInputs;
      setIsLoading(true);

      // 1-second shimmer duration as required by specs
      const timer = setTimeout(() => {
        const response = getSampleRecommendations(inputs);
        setRecommendations(response.recommendations);
        setIsLoading(false);
        setHasCalculatedOnce(true);

        // Pre-select the First Choice recommendation lot by default
        if (response.recommendations.length > 0) {
          setSelectedLocationId(response.recommendations[0].lot.locationId);
        } else {
          setSelectedLocationId(null);
        }
      }, ANIMATION_TIMINGS.SHIMMER_DURATION_MS);

      return () => clearTimeout(timer);
    },
    [formInputs]
  );

  // Initial calculation on first mount
  useEffect(() => {
    runPlanner();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Handle preference form changes
  const handleFormChange = (changes: Partial<ParkingPlannerRequest>) => {
    setFormInputs((prev) => ({
      ...prev,
      ...changes,
    }));
  };

  // Handle Form Submission
  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (devState !== 'normal') {
      setDevState('normal');
    }
    runPlanner();
  };

  // Handle lot selection (from card click or marker click)
  const handleSelectLot = useCallback((locationId: string) => {
    setSelectedLocationId((prev) => (prev === locationId ? null : locationId));
  }, []);

  // Handle clearing selection on map background click
  const handleClearSelection = useCallback(() => {
    setSelectedLocationId(null);
  }, []);

  // Handle retry from error state
  const handleRetry = () => {
    setDevState('normal');
    runPlanner();
  };

  // Handle resetting filters from empty state
  const handleResetFilters = () => {
    const updated: ParkingPlannerRequest = {
      ...formInputs,
      permitType: 'S',
      destinationId: SAMPLE_DESTINATIONS[0].id,
    };
    setFormInputs(updated);
    setDevState('normal');
    runPlanner(updated);
  };

  // Selected campus destination object
  const currentDestination = useMemo(
    () =>
      SAMPLE_DESTINATIONS.find((d) => d.id === formInputs.destinationId) ||
      SAMPLE_DESTINATIONS[0],
    [formInputs.destinationId]
  );

  // Derive active rendering state based on normal computation or dev simulator
  const activeIsLoading = devState === 'loading' || isLoading;
  const activeIsError = devState === 'error';
  const activeRecommendations = useMemo(() => {
    if (devState === 'empty') return [];
    if (devState === 'error' || devState === 'loading') return [];
    return recommendations;
  }, [devState, recommendations]);

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-slate-100 font-sans text-slate-900 select-none">
      {/* Full-Screen MapLibre GL Map */}
      <MapContainer
        lots={SAMPLE_LOTS}
        selectedLocationId={selectedLocationId}
        selectedDestination={currentDestination}
        onSelectLot={handleSelectLot}
        onClearSelection={handleClearSelection}
      />

      {/* Top Disclaimer Pill */}
      <TopPrototypePill />

      {/* Left Floating Frosted-Glass Panel (approx 380px wide) */}
      <aside
        aria-label="Parking planner controls and recommendations"
        className="absolute top-4 left-4 bottom-4 w-[380px] max-w-[calc(100vw-2rem)] z-20 flex flex-col pointer-events-auto"
      >
        <div className="flex-1 flex flex-col bg-white/75 backdrop-blur-xl rounded-3xl border border-white/60 shadow-2xl shadow-slate-900/10 overflow-hidden ring-1 ring-slate-900/5">
          {/* Panel Header */}
          <header className="px-5 pt-5 pb-3 border-b border-slate-200/50 shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-blue-600 flex items-center justify-center text-white font-black text-base shadow-xs shadow-blue-500/30">
                  P
                </div>
                <div>
                  <h1 className="text-lg font-bold text-slate-900 tracking-tight leading-none">
                    ParkSmart
                  </h1>
                  <p className="text-[11px] font-medium text-slate-500 mt-0.5">
                    Campus parking planner
                  </p>
                </div>
              </div>
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-slate-100/90 text-slate-600 border border-slate-200/80">
                Prototype
              </span>
            </div>
          </header>

          {/* Internally Scrollable Body */}
          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4 overscroll-contain focus:outline-none">
            {/* Preference Form Section */}
            <section aria-labelledby="planner-preferences-title">
              <h2 id="planner-preferences-title" className="sr-only">
                Trip Preferences
              </h2>
              <PreferenceForm
                formData={formInputs}
                onChange={handleFormChange}
                onSubmit={handleFormSubmit}
                isLoading={activeIsLoading}
              />
            </section>

            {/* Subtle Divider */}
            <div className="relative py-1">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200/60" />
              </div>
              <div className="relative flex justify-center text-[10px] uppercase tracking-widest text-slate-400">
                <span className="bg-white/80 px-2 rounded-full">Results</span>
              </div>
            </div>

            {/* Results Section */}
            <section aria-labelledby="planner-results-title">
              <h2 id="planner-results-title" className="sr-only">
                Recommended Parking
              </h2>
              <ResultsList
                isLoading={activeIsLoading}
                isError={activeIsError}
                recommendations={activeRecommendations}
                selectedLocationId={selectedLocationId}
                onSelectLot={handleSelectLot}
                onRetry={handleRetry}
                onResetFilters={handleResetFilters}
              />
            </section>
          </div>

          {/* Panel Footer Note */}
          <footer className="px-5 py-2.5 bg-slate-50/60 border-t border-slate-200/40 text-[11px] text-slate-500 flex items-center justify-between shrink-0">
            <span>65% availability · 35% walk time</span>
            <span className="text-slate-400">Sample data</span>
          </footer>
        </div>
      </aside>

      {/* Dev Simulator Toggle (Tucked into bottom right corner) */}
      <DevStateControl
        currentState={devState}
        onStateChange={(state) => setDevState(state)}
      />
    </div>
  );
}
