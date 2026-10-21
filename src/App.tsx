/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Menu } from 'lucide-react';
import { MapContainer } from './components/MapContainer.tsx';
import { PreferenceForm } from './components/PreferenceForm.tsx';
import { ResultsList } from './components/ResultsList.tsx';
import { DevStateControl } from './components/DevStateControl.tsx';
import { ANIMATION_TIMINGS } from './constants.ts';
import { CAMPUS_DESTINATIONS, DEFAULT_DESTINATION_ID } from './data/destinations.ts';
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
 * Returns the current local time formatted as HH:MM (24-hour, as <input type="time"> expects).
 */
function getCurrentTimeString(): string {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
}

/**
 * Main application component.
 * Owns state for formInputs, recommendations, selectedLocationId, and simulated UI states.
 */
export default function App() {
  // 1. Form Inputs State (defaulting to Geisel Library, today, next hour, 'S' permit)
  const [formInputs, setFormInputs] = useState<ParkingPlannerRequest>({
    destinationId: DEFAULT_DESTINATION_ID,
    arrivalDate: getTodayDateString(),
    arrivalTime: getCurrentTimeString(),
    permitType: 'S',
  });

  // 2. Recommendations State
  const [recommendations, setRecommendations] = useState<ParkingRecommendation[]>([]);

  // 3. Selection State (synchronizes selected card with map marker)
  const [selectedLocationId, setSelectedLocationId] = useState<string | null>(null);

  // 4. Loading & Animation State
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [hasCalculatedOnce, setHasCalculatedOnce] = useState<boolean>(false);

  // Permit the current results were computed for (so card highlights stay
  // accurate even if the user changes the permit pill before searching again)
  const [searchedPermit, setSearchedPermit] = useState<PermitType>('S');

  // Side panel open/closed (hamburger toggle)
  const [isPanelOpen, setIsPanelOpen] = useState<boolean>(true);

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
        setSearchedPermit(inputs.permitType);
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
      destinationId: DEFAULT_DESTINATION_ID,
    };
    setFormInputs(updated);
    setDevState('normal');
    runPlanner(updated);
  };

  // Selected campus destination object
  const currentDestination = useMemo(
    () =>
      CAMPUS_DESTINATIONS.find((d) => d.id === formInputs.destinationId) ||
      CAMPUS_DESTINATIONS.find((d) => d.id === DEFAULT_DESTINATION_ID)!,
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
        isPanelOpen={isPanelOpen}
      />

      {/* Hamburger toggle: stays in the top-left whether the panel is open or closed */}
      <button
        type="button"
        onClick={() => setIsPanelOpen((open) => !open)}
        aria-label={isPanelOpen ? 'Hide planner panel' : 'Show planner panel'}
        aria-expanded={isPanelOpen}
        aria-controls="planner-panel"
        className={`absolute top-[34px] left-7 z-30 w-9 h-9 rounded-xl flex items-center justify-center text-slate-800 transition-all duration-300 hover:bg-black/5 active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-900/30 cursor-pointer ${
          isPanelOpen
            ? ''
            : 'bg-white/55 backdrop-blur-2xl backdrop-saturate-150 border border-white/50 shadow-lg shadow-black/15 hover:bg-white/70'
        }`}
      >
        <Menu className="w-5 h-5" aria-hidden="true" />
      </button>

      {/* Left Floating Frosted-Glass Panel (approx 380px wide), slides out when hidden */}
      <aside
        id="planner-panel"
        aria-label="Parking planner controls and recommendations"
        aria-hidden={!isPanelOpen}
        inert={!isPanelOpen}
        className={`absolute top-4 left-4 bottom-4 w-[380px] max-w-[calc(100vw-2rem)] z-20 flex flex-col transition-all duration-300 ease-out motion-reduce:transition-none ${
          isPanelOpen
            ? 'translate-x-0 opacity-100 pointer-events-auto'
            : '-translate-x-[calc(100%+2rem)] opacity-0 pointer-events-none'
        }`}
      >
        <div className="flex-1 flex flex-col bg-white/45 backdrop-blur-2xl backdrop-saturate-[1.8] rounded-[28px] border border-white/50 shadow-2xl shadow-black/25 overflow-hidden ring-1 ring-black/5">
          {/* Panel Header */}
          {/* Left padding leaves room for the hamburger button that sits on top */}
          <header className="pl-[60px] pr-5 pt-5 pb-3 border-b border-black/5 shrink-0">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-slate-900 flex items-center justify-center text-white font-black text-base shadow-sm">
                P
              </div>
              <div>
                <h1 className="text-lg font-bold text-slate-900 tracking-tight leading-none">
                  ParkSmart
                </h1>
                <p className="text-[11px] font-medium text-slate-600 mt-0.5">
                  Campus parking planner
                </p>
              </div>
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
            <div className="flex items-center gap-3 py-1 text-[10px] uppercase tracking-widest text-slate-500">
              <div className="flex-1 border-t border-black/10" />
              <span>Results</span>
              <div className="flex-1 border-t border-black/10" />
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
                userPermit={searchedPermit}
                selectedLocationId={selectedLocationId}
                onSelectLot={handleSelectLot}
                onRetry={handleRetry}
                onResetFilters={handleResetFilters}
              />
            </section>
          </div>

          {/* Panel Footer Note */}
          <footer className="px-5 py-2.5 bg-white/20 border-t border-black/5 text-[11px] text-slate-500 flex items-center justify-center shrink-0">
            <span>Sample data</span>
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
