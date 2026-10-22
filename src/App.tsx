/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Menu } from 'lucide-react';
import { AnimatePresence, MotionConfig, motion } from 'motion/react';
import { MapContainer } from './components/MapContainer.tsx';
import { PreferenceForm } from './components/PreferenceForm.tsx';
import { ResultsList } from './components/ResultsList.tsx';
import { DevStateControl } from './components/DevStateControl.tsx';
import { LotDetailCard } from './components/LotDetailCard.tsx';
import { ANIMATION_TIMINGS } from './constants.ts';
import { DEFAULT_DESTINATION_ID, getDestination } from './data/destinations.ts';
import { getArrivalError } from './utils/arrival.ts';
import { parseArrival } from './utils/permitRules.ts';
import { SAMPLE_LOTS, getSampleRecommendations } from './data/sampleRecommendations.ts';
import {
  ParkingPlannerRequest,
  ParkingRecommendation,
  DevSimulationState,
} from './types.ts';

/** Width the open planner panel covers on the left (380px panel + 24px gap). */
const PANEL_OFFSET_PX = 404;

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

  // The exact request the current results were computed for. null until the first
  // search, which is how the panel knows to show its "enter your trip" prompt.
  const [searchedRequest, setSearchedRequest] = useState<ParkingPlannerRequest | null>(null);

  // Lot the user confirmed with "Select this spot" (routing will hook in here later)
  const [confirmedLotId, setConfirmedLotId] = useState<string | null>(null);

  // Lot detail card (opened by clicking a pin on the map)
  const [isDetailOpen, setIsDetailOpen] = useState<boolean>(false);

  // Side panel open/closed (hamburger toggle)
  const [isPanelOpen, setIsPanelOpen] = useState<boolean>(true);

  // 5. Dev State Simulator
  const [devState, setDevState] = useState<DevSimulationState>('normal');

  // Compute recommendations from current formInputs
  const runPlanner = useCallback(
    (customInputs?: ParkingPlannerRequest) => {
      const inputs = customInputs || formInputs;
      if (getArrivalError(inputs)) return; // the form shows the message; nothing to search
      setIsLoading(true);
      setIsDetailOpen(false); // a new search shows results in the panel, not the pin card
      setConfirmedLotId(null);

      // Short simulated request so the loading state is visible
      const timer = setTimeout(() => {
        const response = getSampleRecommendations(inputs);
        setRecommendations(response.recommendations);
        setSearchedRequest(inputs);
        setIsLoading(false);

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
  // Pin clicks on the map also open the lot detail card (panel card clicks do not,
  // since those cards already show the same details)
  const selectedIdRef = useRef<string | null>(null);
  selectedIdRef.current = selectedLocationId;
  const handleSelectLotFromMap = useCallback((locationId: string) => {
    const next = selectedIdRef.current === locationId ? null : locationId;
    setSelectedLocationId(next);
    setIsDetailOpen(next !== null);
  }, []);

  // Whenever nothing is selected (from any source), the card is closed too
  useEffect(() => {
    if (!selectedLocationId) setIsDetailOpen(false);
  }, [selectedLocationId]);

  const handleClearSelection = useCallback(() => {
    setIsDetailOpen(false);
    setSelectedLocationId(null);
  }, []);

  // Lot whose detail card is open (any selected pin or card)
  const selectedLot = useMemo(
    () => SAMPLE_LOTS.find((lot) => lot.locationId === selectedLocationId) ?? null,
    [selectedLocationId]
  );

  // Esc closes the lot card
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsDetailOpen(false);
        setSelectedLocationId(null);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
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
    () => getDestination(formInputs.destinationId),
    [formInputs.destinationId]
  );

  // Results go stale when any trip detail changes after the search that produced them
  const isStale =
    searchedRequest !== null &&
    (searchedRequest.destinationId !== formInputs.destinationId ||
      searchedRequest.permitType !== formInputs.permitType ||
      searchedRequest.arrivalDate !== formInputs.arrivalDate ||
      searchedRequest.arrivalTime !== formInputs.arrivalTime);

  // Inline validation for the arrival date/time (empty or already passed)
  const arrivalError = getArrivalError(formInputs);

  // First choice / backup IDs for labeling pins (hidden while results are stale)
  const rankedLotIds = useMemo(() => {
    if (isStale || devState !== 'normal') return { first: null, backup: null };
    return {
      first: recommendations[0]?.lot.locationId ?? null,
      backup: recommendations[1]?.lot.locationId ?? null,
    };
  }, [recommendations, isStale, devState]);

  const handleConfirmLot = useCallback((locationId: string) => {
    setConfirmedLotId((prev) => (prev === locationId ? null : locationId));
  }, []);

  // Derive active rendering state based on normal computation or dev simulator
  const activeIsLoading = devState === 'loading' || isLoading;
  const activeIsError = devState === 'error';
  const activeRecommendations = useMemo(() => {
    if (devState === 'empty') return [];
    if (devState === 'error' || devState === 'loading') return [];
    return recommendations;
  }, [devState, recommendations]);

  return (
    // reducedMotion="user" turns off Motion animations for people who ask their OS for less motion
    <MotionConfig reducedMotion="user">
    <div className="relative w-screen h-screen overflow-hidden bg-slate-100 font-sans text-slate-900 select-none">
      {/* Full-Screen MapLibre GL Map */}
      <MapContainer
        lots={SAMPLE_LOTS}
        selectedLocationId={selectedLocationId}
        selectedDestination={currentDestination}
        onSelectLot={handleSelectLotFromMap}
        onClearSelection={handleClearSelection}
        isPanelOpen={isPanelOpen}
        isDetailOpen={isDetailOpen}
        rankedLotIds={rankedLotIds}
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
            : 'bg-white/55 backdrop-blur-xl backdrop-saturate-150 border border-white/50 shadow-lg shadow-black/15 hover:bg-white/70'
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
        className={`absolute top-4 left-4 bottom-4 w-[380px] max-w-[calc(100vw-2rem)] z-20 flex flex-col transition-transform duration-300 ease-out motion-reduce:transition-none ${
          isPanelOpen
            ? 'translate-x-0 pointer-events-auto'
            : '-translate-x-[calc(100%+2rem)] pointer-events-none'
        }`}
      >
        <motion.div
          initial={{ opacity: 0, x: -24, scale: 0.98 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          className="flex-1 flex flex-col bg-white/45 backdrop-blur-xl backdrop-saturate-[1.8] rounded-[28px] border border-white/50 shadow-2xl shadow-black/25 overflow-hidden ring-1 ring-black/5">
          {/* Panel Header */}
          {/* Left padding leaves room for the hamburger button that sits on top */}
          <header className="pl-[60px] pr-5 pt-5 pb-3 border-b border-black/5 shrink-0">
            <div className="flex items-center justify-between gap-2">
              <motion.div
                className="flex items-center gap-2"
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.45, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
              >
                <motion.div
                  className="logo-sheen relative overflow-hidden w-8 h-8 rounded-xl bg-gradient-to-br from-slate-700 to-slate-950 flex items-center justify-center text-white font-black text-base shadow-md shadow-black/20"
                  initial={{ scale: 0.6, rotate: -12 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: 'spring', stiffness: 380, damping: 18, delay: 0.1 }}
                  whileHover={{ scale: 1.08, rotate: -4 }}
                >
                  P
                </motion.div>
                <h1 className="text-xl font-bold text-slate-900 tracking-tight leading-none">
                  ParkSmart
                </h1>
              </motion.div>

              {/* Campus badge (text only; the official UC San Diego logo is a trademark) */}
              <motion.span
                className="px-2.5 py-1 rounded-full bg-white/55 border border-white/60 text-[11px] font-semibold tracking-tight text-slate-700 shadow-sm shadow-black/5 whitespace-nowrap"
                initial={{ opacity: 0, x: 8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.45, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
              >
                UC San Diego
              </motion.span>
            </div>
            {/* One-line intro so first-time visitors know what this is for */}
            <motion.p
              className="mt-2 text-[13px] text-slate-700 leading-snug"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.4, delay: 0.35 }}
            >
              Find where to park before you arrive.
            </motion.p>
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
                arrivalError={arrivalError}
                onSetArrivalNow={() =>
                  handleFormChange({ arrivalDate: getTodayDateString(), arrivalTime: getCurrentTimeString() })
                }
                submitLabel={isStale ? 'Update results' : 'Find parking'}
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
                searchedRequest={searchedRequest}
                showIntroPrompt={searchedRequest === null && devState === 'normal'}
                isStale={isStale}
                confirmedLotId={confirmedLotId}
                onConfirmLot={handleConfirmLot}
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
        </motion.div>
      </aside>

      {/* Dev Simulator Toggle (Tucked into bottom right corner) */}
      {/* Lot detail card: centered in the visible map area (beside the panel when it is open) */}
      <div
        className="absolute bottom-6 z-20 -translate-x-1/2 transition-[left] duration-300 ease-out pointer-events-none"
        style={{ left: isPanelOpen ? `calc(${PANEL_OFFSET_PX}px + (100% - ${PANEL_OFFSET_PX}px) / 2)` : '50%' }}
      >
        <AnimatePresence mode="wait">
          {isDetailOpen && selectedLot && currentDestination && (
            // Only transforms here. Fading a *parent* of a backdrop-filter element makes
            // Chrome skip the blur until the fade ends (the frost "pops in"), so the
            // opacity fade lives on the glass card itself (see LotDetailCard).
            <motion.div
              key={selectedLot.locationId}
              className="pointer-events-auto"
              initial={{ y: 20, scale: 0.97 }}
              animate={{ y: 0, scale: 1 }}
              exit={{ y: 12, scale: 0.98 }}
              transition={{ type: 'spring', stiffness: 600, damping: 38 }}
            >
              <LotDetailCard
                lot={selectedLot}
                userPermit={formInputs.permitType}
                arrival={parseArrival(formInputs.arrivalDate, formInputs.arrivalTime)}
                destination={currentDestination}
                isConfirmed={confirmedLotId === selectedLot.locationId}
                onConfirm={() => handleConfirmLot(selectedLot.locationId)}
                onClose={handleClearSelection}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <DevStateControl
        currentState={devState}
        onStateChange={(state) => setDevState(state)}
      />
    </div>
    </MotionConfig>
  );
}
