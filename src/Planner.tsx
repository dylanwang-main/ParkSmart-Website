/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Menu } from 'lucide-react';
import { AnimatePresence, MotionConfig, motion } from 'motion/react';
import 'maplibre-gl/dist/maplibre-gl.css';
import { MapContainer } from './components/MapContainer.tsx';
import { PreferenceForm } from './components/PreferenceForm.tsx';
import { ResultsList } from './components/ResultsList.tsx';
import { DevStateControl } from './components/DevStateControl.tsx';
import { LotDetailCard } from './components/LotDetailCard.tsx';
import { UsualTripCard } from './components/UsualTripCard.tsx';
import { SCRUB_MAX, SCRUB_MIN, TimeScrubber } from './components/TimeScrubber.tsx';
import ucsdLogo from './assets/ucsd-logo.png';
import { ANIMATION_TIMINGS, isOnCampus } from './constants.ts';
import { findDestination, getDestination, makePinDestinationId } from './data/destinations.ts';
import { getArrivalError } from './utils/arrival.ts';
import { UsualTrip, forgetUsualTrip, loadUsualTrip, nextUsualDate, saveUsualTrip } from './utils/usualTrip.ts';
import { tightFrom } from './utils/availabilityModel.ts';
import { parseArrival } from './utils/permitRules.ts';
import { SAMPLE_LOTS, getSampleRecommendations } from './data/sampleRecommendations.ts';
import { USE_RECOMMENDATION_API } from './config.ts';
import { fetchRecommendations } from './api/recommendations.ts';
import { DirectionsPanel } from './components/DirectionsPanel.tsx';
import { useRoutes } from './hooks/useRoutes.ts';
import type { ResultInfo } from './components/ResultsList.tsx';
import {
  ParkingPlannerRequest,
  ParkingRecommendation,
  DevSimulationState,
} from './types.ts';

/** How many earlier searches "Recent" keeps for this visit. */
const MAX_HISTORY = 5;

/** Same destination, date, time and permit. */
function sameRequest(a: ParkingPlannerRequest, b: ParkingPlannerRequest): boolean {
  return (
    a.destinationId === b.destinationId &&
    a.arrivalDate === b.arrivalDate &&
    a.arrivalTime === b.arrivalTime &&
    a.permitType === b.permitType
  );
}

/** Width the open planner panel covers on the left (380px panel + 24px gap). */
const PANEL_OFFSET_PX = 404;

/**
 * Returns today's date formatted as YYYY-MM-DD in local time.
 */
function toDateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getTodayDateString(): string {
  return toDateString(new Date());
}

/**
 * Returns the current local time formatted as HH:MM (24-hour, as <input type="time"> expects).
 */
function getCurrentTimeString(): string {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
}

/** True on phone-width screens, where the planner becomes a bottom sheet instead of a left panel. */
function useIsMobile(): boolean {
  const query = '(max-width: 639px)';
  const [isMobile, setIsMobile] = useState<boolean>(() => window.matchMedia(query).matches);
  useEffect(() => {
    const media = window.matchMedia(query);
    const update = () => setIsMobile(media.matches);
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);
  return isMobile;
}

/** True when searches attempt the backend; falls back to sample data if env vars are missing or API fails. */
const USE_API = USE_RECOMMENDATION_API;

/** The state simulator is for developers: shown in dev builds, or in production with ?dev in the URL. */
const showDevTools = import.meta.env.DEV || new URLSearchParams(window.location.search).has('dev');

/** "HH:MM" to minutes after midnight, clamped to the scrubber's range. */
function minutesOf(time: string): number {
  const [h, m] = time.split(':').map(Number);
  const minutes = Number.isFinite(h) && Number.isFinite(m) ? h * 60 + m : 9 * 60;
  return Math.min(SCRUB_MAX, Math.max(SCRUB_MIN, minutes));
}

/** Minutes after midnight to "HH:MM". */
function timeOf(minutes: number): string {
  return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
}

/**
 * Existing ParkSmart planner view (loaded lazily only after the user opens the planner).
 */
export default function Planner() {
  const [usualTrip, setUsualTrip] = useState<UsualTrip | null>(() => loadUsualTrip());

  const [formInputs, setFormInputs] = useState<ParkingPlannerRequest>(() => ({
    destinationId: '',
    arrivalDate: getTodayDateString(),
    arrivalTime: getCurrentTimeString(),
    permitType: 'S',
  }));

  const [searchHistory, setSearchHistory] = useState<ParkingPlannerRequest[]>([]);
  const [recommendations, setRecommendations] = useState<ParkingRecommendation[]>([]);
  const [selectedLocationId, setSelectedLocationId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const [resultInfo, setResultInfo] = useState<ResultInfo | null>(null);
  const requestRef = useRef<AbortController | null>(null);

  const [searchedRequest, setSearchedRequest] = useState<ParkingPlannerRequest | null>(null);
  const searchedRequestRef = useRef<ParkingPlannerRequest | null>(null);

  const [confirmedLotId, setConfirmedLotId] = useState<string | null>(null);

  const [startPoint, setStartPoint] = useState<{ latitude: number; longitude: number } | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [locateError, setLocateError] = useState<string | null>(null);
  const [routeRetry, setRouteRetry] = useState(0);

  const [isDetailOpen, setIsDetailOpen] = useState<boolean>(false);

  const [previewMinutes, setPreviewMinutes] = useState<number>(() => minutesOf(formInputs.arrivalTime));
  const [isTimelinePlaying, setIsTimelinePlaying] = useState<boolean>(false);
  const [isTimeOpen, setIsTimeOpen] = useState<boolean>(false);
  useEffect(() => {
    setPreviewMinutes(minutesOf(formInputs.arrivalTime));
  }, [formInputs.arrivalTime]);
  const handleTimeToggle = useCallback(() => {
    setIsTimeOpen((open) => {
      if (open) setIsTimelinePlaying(false);
      return !open;
    });
  }, []);
  useEffect(() => {
    if (!isTimeOpen) setPreviewMinutes(minutesOf(formInputs.arrivalTime));
  }, [isTimeOpen, formInputs.arrivalTime]);
  const previewTime = useMemo(() => {
    const day = parseArrival(formInputs.arrivalDate, '00:00') ?? new Date();
    day.setHours(Math.floor(previewMinutes / 60), previewMinutes % 60, 0, 0);
    return day;
  }, [formInputs.arrivalDate, previewMinutes]);

  const [isPanelOpen, setIsPanelOpen] = useState<boolean>(true);
  const isMobile = useIsMobile();
  const [devState, setDevState] = useState<DevSimulationState>('normal');

  useEffect(() => {
    if (isMobile && isDetailOpen) setIsPanelOpen(false);
  }, [isMobile, isDetailOpen]);

  useEffect(() => {
    if (!isMobile || searchedRequest === null || isLoading) return;
    const results = document.getElementById('planner-results');
    const box = document.getElementById('planner-scroll');
    if (results && box) {
      box.scrollTo({
        top: box.scrollTop + results.getBoundingClientRect().top - box.getBoundingClientRect().top - 8,
        behavior: 'smooth',
      });
    }
  }, [isMobile, searchedRequest, isLoading]);

  const runPlanner = useCallback(
    (customInputs?: ParkingPlannerRequest) => {
      const inputs = customInputs || formInputs;
      if (getArrivalError(inputs)) return;
      if (!findDestination(inputs.destinationId)) return;
      setIsLoading(true);
      setIsDetailOpen(false);
      setConfirmedLotId(null);

      const finish = (results: ParkingRecommendation[], info: ResultInfo) => {
        setRecommendations(results);
        setResultInfo(info);
        const previous = searchedRequestRef.current;
        if (previous && !sameRequest(previous, inputs)) {
          setSearchHistory((history) =>
            [previous, ...history.filter((r) => !sameRequest(r, previous) && !sameRequest(r, inputs))].slice(0, MAX_HISTORY)
          );
        }
        searchedRequestRef.current = inputs;
        setSearchedRequest(inputs);
        setIsLoading(false);

        setSelectedLocationId(results[0]?.lot.locationId ?? null);

        if (findDestination(inputs.destinationId)?.isPin) return;
        const usual: UsualTrip = {
          destinationId: inputs.destinationId,
          permitType: inputs.permitType,
          arrivalTime: inputs.arrivalTime,
        };
        saveUsualTrip(usual);
        setUsualTrip(usual);
      };

      const finishWithSample = () => {
        finish(getSampleRecommendations(inputs).recommendations, { source: 'sample' });
      };

      if (USE_API) {
        requestRef.current?.abort();
        const controller = new AbortController();
        requestRef.current = controller;
        fetchRecommendations(inputs, { signal: controller.signal })
          .then((outcome) => {
            if (controller.signal.aborted) return;
            if (outcome.kind === 'error') {
              // Fall back cleanly to built-in sample data; never show an error screen
              finishWithSample();
              return;
            }
            const { response } = outcome;
            finish(outcome.recommendations, {
              source: 'api',
              status: response.status,
              explanation: response.explanation,
              limitations: response.limitations,
              isExample: response.is_example,
            });
          })
          .catch((error: unknown) => {
            if ((error as Error)?.name === 'AbortError' || controller.signal.aborted) return;
            finishWithSample();
          });
        return () => controller.abort();
      }

      if (ANIMATION_TIMINGS.SHIMMER_DURATION_MS === 0) {
        finishWithSample();
        return;
      }
      const timer = setTimeout(finishWithSample, ANIMATION_TIMINGS.SHIMMER_DURATION_MS);
      return () => clearTimeout(timer);
    },
    [formInputs]
  );

  const handleFormChange = (changes: Partial<ParkingPlannerRequest>) => {
    if (changes.destinationId !== undefined) setPinNotice(null);
    setFormInputs((prev) => ({
      ...prev,
      ...changes,
    }));
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (devState !== 'normal') {
      setDevState('normal');
    }
    runPlanner();
  };

  const handleSelectLot = useCallback((locationId: string) => {
    setSelectedLocationId((prev) => (prev === locationId ? null : locationId));
  }, []);

  const selectedIdRef = useRef<string | null>(null);
  selectedIdRef.current = selectedLocationId;
  const handleSelectLotFromMap = useCallback((locationId: string) => {
    const next = selectedIdRef.current === locationId ? null : locationId;
    setSelectedLocationId(next);
    setIsDetailOpen(next !== null);
  }, []);

  useEffect(() => {
    if (!selectedLocationId) setIsDetailOpen(false);
  }, [selectedLocationId]);

  const handleClearSelection = useCallback(() => {
    setIsDetailOpen(false);
    setSelectedLocationId(null);
  }, []);

  const selectedLot = useMemo(
    () => SAMPLE_LOTS.find((lot) => lot.locationId === selectedLocationId) ?? null,
    [selectedLocationId]
  );

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

  const handleRetry = () => {
    setDevState('normal');
    runPlanner();
  };

  const handleResetFilters = () => {
    const updated: ParkingPlannerRequest = { ...formInputs, permitType: 'S' };
    setFormInputs(updated);
    setDevState('normal');
    runPlanner(updated);
  };

  const currentDestination = useMemo(
    () => findDestination(formInputs.destinationId) ?? null,
    [formInputs.destinationId]
  );

  const handleSelectParking = useCallback((locationId: string) => {
    setSelectedLocationId(locationId);
    setIsDetailOpen(true);
  }, []);

  const [pinNotice, setPinNotice] = useState<string | null>(null);
  const handleDropPin = useCallback((latitude: number, longitude: number): boolean => {
    if (!isOnCampus(latitude, longitude)) {
      setPinNotice('That spot is off campus. Drop the pin on the UCSD campus, or pick a building.');
      return false;
    }
    setPinNotice(null);
    setFormInputs((prev) => ({ ...prev, destinationId: makePinDestinationId(latitude, longitude) }));
    return true;
  }, []);

  const handleClearPin = useCallback(() => {
    setPinNotice(null);
    setFormInputs((prev) => (findDestination(prev.destinationId)?.isPin ? { ...prev, destinationId: '' } : prev));
  }, []);

  const handleRestoreSearch = (request: ParkingPlannerRequest) => {
    setFormInputs(request);
    setDevState('normal');
    runPlanner(request);
  };

  const isApiResults = resultInfo?.source === 'api';

  const usualPreview = useMemo(() => {
    if (!usualTrip) return null;
    const request: ParkingPlannerRequest = {
      destinationId: usualTrip.destinationId,
      permitType: usualTrip.permitType,
      arrivalTime: usualTrip.arrivalTime,
      arrivalDate: nextUsualDate(usualTrip.arrivalTime),
    };
    const arrival = parseArrival(request.arrivalDate, request.arrivalTime);
    if (!arrival) return null;
    if (!findDestination(request.destinationId)) return null;
    const topPick = USE_API ? null : getSampleRecommendations(request).recommendations[0] ?? null;
    const tight = topPick ? tightFrom(topPick.lot, arrival) : null;
    const fmt = (d: Date) => d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    const isToday = request.arrivalDate === getTodayDateString();
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const isTomorrow = request.arrivalDate === toDateString(tomorrow);
    return {
      request,
      destinationName: getDestination(request.destinationId).name,
      whenLabel: `${isToday ? 'today' : isTomorrow ? 'tomorrow' : arrival.toLocaleDateString('en-US', { weekday: 'long' })} at ${fmt(arrival)}`,
      topPick,
      tightAt: tight ? fmt(tight) : null,
    };
  }, [usualTrip]);

  const handleShowUsual = () => {
    if (!usualPreview) return;
    setFormInputs(usualPreview.request);
    runPlanner(usualPreview.request);
  };
  const handleForgetUsual = () => {
    forgetUsualTrip();
    setUsualTrip(null);
  };

  const isStale =
    searchedRequest !== null &&
    (searchedRequest.destinationId !== formInputs.destinationId ||
      searchedRequest.permitType !== formInputs.permitType ||
      searchedRequest.arrivalDate !== formInputs.arrivalDate ||
      searchedRequest.arrivalTime !== formInputs.arrivalTime);

  const arrivalError = getArrivalError(formInputs);

  const rankedLotIds = useMemo(() => {
    if (isStale || devState !== 'normal') return { first: null, backup: null, third: null };
    return {
      first: recommendations[0]?.lot.locationId ?? null,
      backup: recommendations[1]?.lot.locationId ?? null,
      third: recommendations[2]?.lot.locationId ?? null,
    };
  }, [recommendations, isStale, devState]);

  const handleConfirmLot = useCallback((locationId: string) => {
    setConfirmedLotId((prev) => (prev === locationId ? null : locationId));
    setSelectedLocationId(locationId);
  }, []);

  const handleUseMyLocation = useCallback(() => {
    if (!('geolocation' in navigator)) {
      setLocateError('This browser cannot share your location.');
      return;
    }
    setIsLocating(true);
    setLocateError(null);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setIsLocating(false);
        setStartPoint({ latitude: position.coords.latitude, longitude: position.coords.longitude });
      },
      (error) => {
        setIsLocating(false);
        setLocateError(
          error.code === error.PERMISSION_DENIED
            ? 'Location permission is off. Allow it in your browser to see driving directions.'
            : "Couldn't find your location. Try again."
        );
      },
      { enableHighAccuracy: false, timeout: 10_000, maximumAge: 5 * 60_000 }
    );
  }, []);

  const activeIsLoading = devState === 'loading' || isLoading;
  const activeIsError = false;
  const activeRecommendations = useMemo(() => {
    if (devState === 'empty') return [];
    if (devState === 'error' || devState === 'loading') return [];
    return recommendations;
  }, [devState, recommendations]);

  const routedRecommendation =
    isApiResults && !isStale && devState === 'normal'
      ? activeRecommendations.find((rec) => rec.lot.locationId === selectedLocationId) ?? null
      : null;
  const routedDestination = searchedRequest ? findDestination(searchedRequest.destinationId) ?? null : null;
  const routeLegs = useRoutes(
    routedRecommendation !== null,
    routedRecommendation ? routedRecommendation.lot : null,
    routedDestination,
    startPoint,
    routeRetry
  );

  return (
    <MotionConfig reducedMotion="user">
      <div className="relative w-screen h-screen overflow-hidden bg-slate-100 font-sans text-navy select-none">
        {/* Full-Screen MapLibre GL Map */}
        <MapContainer
          lots={SAMPLE_LOTS}
          selectedLocationId={selectedLocationId}
          selectedDestination={currentDestination}
          onSelectLot={handleSelectLotFromMap}
          onClearSelection={handleClearSelection}
          onDropPin={handleDropPin}
          hasDroppedPin={currentDestination?.isPin === true}
          onClearPin={handleClearPin}
          isTimeOpen={isTimeOpen}
          onTimeToggle={handleTimeToggle}
          timePanel={
            <TimeScrubber
              day={previewTime}
              minutes={previewMinutes}
              onMinutesChange={setPreviewMinutes}
              isPlaying={isTimelinePlaying}
              onPlayingChange={setIsTimelinePlaying}
              differsFromArrival={previewMinutes !== minutesOf(formInputs.arrivalTime)}
              onUseTime={() => handleFormChange({ arrivalTime: timeOf(previewMinutes) })}
            />
          }
          isPanelOpen={isPanelOpen}
          isDetailOpen={isDetailOpen}
          rankedLotIds={rankedLotIds}
          availabilityTime={previewTime}
          showSampleAvailability={!isApiResults}
          routeLines={{
            driving: routeLegs.driving.status === 'ok' ? routeLegs.driving.route.geometry : null,
            walking: routeLegs.walking.status === 'ok' ? routeLegs.walking.route.geometry : null,
          }}
          startPoint={routedRecommendation ? startPoint : null}
        />

        {/* Hamburger toggle: stays in the top-left whether the panel is open or closed */}
        <button
          type="button"
          onClick={() => setIsPanelOpen((open) => !open)}
          aria-label={isPanelOpen ? 'Hide planner panel' : 'Show planner panel'}
          aria-expanded={isPanelOpen}
          aria-controls="planner-panel"
          className={`absolute top-[22px] left-4 max-sm:left-[29px] ${
            isPanelOpen ? 'max-sm:top-[calc(50%+23px)]' : 'top-4 max-sm:left-4'
          } z-30 w-9 h-9 rounded-[10px] flex items-center justify-center text-navy transition-colors duration-200 hover:bg-paper active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky/50 cursor-pointer ${
            isPanelOpen
              ? ''
              : 'bg-white border border-line shadow-[0_1px_2px_rgba(24,43,73,0.08),0_4px_12px_rgba(24,43,73,0.1)]'
          }`}
        >
          <Menu className="w-5 h-5" aria-hidden="true" />
        </button>

        {/* Planner: a solid sheet on the left edge (a bottom sheet on phones), slides out when hidden */}
        <aside
          id="planner-panel"
          aria-label="Parking planner controls and recommendations"
          aria-hidden={!isPanelOpen}
          inert={!isPanelOpen}
          className={`absolute top-0 left-0 bottom-0 w-[388px] max-w-full max-sm:top-1/2 max-sm:bottom-9 max-sm:left-3 max-sm:right-3 max-sm:w-auto max-sm:max-w-none z-20 flex flex-col transition-transform duration-300 ease-out motion-reduce:transition-none ${
            isPanelOpen
              ? 'translate-x-0 pointer-events-auto'
              : '-translate-x-full max-sm:translate-x-0 max-sm:translate-y-[calc(100%+3rem)] pointer-events-none'
          }`}
        >
          <div className="flex-1 flex flex-col bg-white border-r border-line max-sm:border max-sm:rounded-2xl shadow-[4px_0_24px_rgba(24,43,73,0.12)] max-sm:shadow-[0_4px_24px_rgba(24,43,73,0.2)] overflow-hidden">
            {/* Panel header. Left padding leaves room for the hamburger button that sits on top. */}
            <header className="pl-[60px] pr-4 pt-[22px] pb-3.5 border-b-2 border-gold shrink-0">
              <div className="flex items-center justify-between gap-3 h-9">
                <div className="flex items-center gap-2 min-w-0">
                  <div
                    aria-hidden="true"
                    className="w-9 h-9 rounded-lg bg-navy flex items-center justify-center text-sun font-serif font-semibold text-[20px] leading-none"
                  >
                    <span className="-translate-y-px">P</span>
                  </div>
                  <h1 className="font-serif text-[26px] font-semibold text-navy tracking-[-0.01em] leading-none -translate-y-px">
                    ParkSmart
                  </h1>
                </div>

                {/* UC San Diego wordmark (transparent PNG, sits directly on the panel) */}
                <img src={ucsdLogo} alt="UC San Diego" className="h-[20px] w-auto block shrink-0" />
              </div>
              <p className="mt-2 text-[13px] text-muted leading-snug">
                Find where to park before you arrive.
              </p>
            </header>

            {/* Internally Scrollable Body */}
            <div id="planner-scroll" className="flex-1 overflow-y-auto px-5 py-4 space-y-4 overscroll-contain focus:outline-none">
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
                  onSelectParking={handleSelectParking}
                />
                {pinNotice && (
                  <p role="status" className="mt-3 px-3 py-2 rounded-lg bg-[#D98A00]/12 border border-[#D98A00]/30 text-[12px] font-medium text-[#835300]">
                    {pinNotice}
                  </p>
                )}
              </section>

              <div className="flex items-center gap-3 py-0.5 text-[13px] font-semibold text-navy">
                <span>Results</span>
                <div className="flex-1 border-t border-line" />
              </div>

              <section id="planner-results" aria-labelledby="planner-results-title">
                <h2 id="planner-results-title" className="sr-only">
                  Recommended Parking
                </h2>
                <ResultsList
                  isLoading={activeIsLoading}
                  isError={activeIsError}
                  recommendations={activeRecommendations}
                  searchedRequest={searchedRequest}
                  searchHistory={searchHistory}
                  onRestoreSearch={handleRestoreSearch}
                  showIntroPrompt={searchedRequest === null && devState === 'normal'}
                  usualTripCard={
                    usualPreview && (
                      <UsualTripCard
                        destinationName={usualPreview.destinationName}
                        whenLabel={usualPreview.whenLabel}
                        topPick={usualPreview.topPick}
                        tightAt={usualPreview.tightAt}
                        showPreview={!isApiResults}
                        onShowOptions={handleShowUsual}
                        onForget={handleForgetUsual}
                      />
                    )
                  }
                  isStale={isStale}
                  availabilityTime={previewTime}
                  confirmedLotId={confirmedLotId}
                  onConfirmLot={handleConfirmLot}
                  selectedLocationId={selectedLocationId}
                  onSelectLot={handleSelectLot}
                  onRetry={handleRetry}
                  onResetFilters={handleResetFilters}
                  errorMessage={null}
                  resultInfo={devState === 'normal' ? resultInfo : null}
                  directions={
                    routedRecommendation && routedDestination ? (
                      <DirectionsPanel
                        lotName={routedRecommendation.lot.name}
                        destinationName={routedDestination.name}
                        legs={routeLegs}
                        startLabel={startPoint ? 'your location' : null}
                        isLocating={isLocating}
                        locateError={locateError}
                        onUseMyLocation={handleUseMyLocation}
                        onClearStart={() => {
                          setStartPoint(null);
                          setLocateError(null);
                        }}
                        onRetry={() => setRouteRetry((n) => n + 1)}
                      />
                    ) : null
                  }
                />
              </section>
            </div>

            {/* Panel Footer Note */}
            <footer className="px-5 py-2.5 bg-paper border-t border-line text-[11px] text-muted leading-snug shrink-0">
              <span>
                {isApiResults
                  ? 'Historical estimates from past surveys, not live availability.'
                  : 'Sample data. Estimates only.'}{' '}
                Unofficial student project, not affiliated with UC San Diego.
              </span>
            </footer>
          </div>
        </aside>

        {/* Lot detail card: centered in the visible map area (beside the panel when it is open) */}
        <div
          className="absolute bottom-6 max-sm:bottom-10 z-20 -translate-x-1/2 transition-[left] duration-300 ease-out pointer-events-none"
          style={{ left: isPanelOpen && !isMobile ? `calc(${PANEL_OFFSET_PX}px + (100% - ${PANEL_OFFSET_PX}px) / 2)` : '50%' }}
        >
          <AnimatePresence mode="wait">
            {isDetailOpen && selectedLot && (
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
                  availabilityTime={previewTime}
                  destination={currentDestination}
                  rankLabel={
                    isStale
                      ? null
                      : activeRecommendations.find((r) => r.lot.locationId === selectedLot.locationId)?.badgeLabel ?? null
                  }
                  isConfirmed={confirmedLotId === selectedLot.locationId}
                  onConfirm={() => handleConfirmLot(selectedLot.locationId)}
                  backendMode={isApiResults}
                  backendEstimate={
                    isStale
                      ? null
                      : activeRecommendations.find((r) => r.lot.locationId === selectedLot.locationId)?.estimate ?? null
                  }
                  onPlanFor={(date) =>
                    handleFormChange({
                      arrivalDate: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`,
                      arrivalTime: `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`,
                    })
                  }
                  onClose={handleClearSelection}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {showDevTools && (
          <DevStateControl
            currentState={devState}
            onStateChange={(state) => setDevState(state)}
          />
        )}
      </div>
    </MotionConfig>
  );
}
