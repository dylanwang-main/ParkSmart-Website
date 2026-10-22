/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { ChevronDown, MapPin } from 'lucide-react';
import { ParkingPlannerRequest, ParkingRecommendation } from '../types.ts';
import { getDestination } from '../data/destinations.ts';
import { parseArrival } from '../utils/permitRules.ts';
import { RecommendationCard } from './RecommendationCard.tsx';
import { SkeletonCard } from './SkeletonCard.tsx';
import { EmptyState } from './EmptyState.tsx';
import { ErrorState } from './ErrorState.tsx';
import { RecentSearches } from './RecentSearches.tsx';

/** Results shown before "Show more", and how many each click reveals. */
const INITIAL_VISIBLE = 3;
const LOAD_MORE_STEP = 5;

interface ResultsListProps {
  isLoading: boolean;
  isError: boolean;
  recommendations: ParkingRecommendation[];
  /** The request these results were computed for (null before the first search). */
  searchedRequest: ParkingPlannerRequest | null;
  /** Earlier searches this visit (most recent first), for the "Recent" menu. */
  searchHistory: ParkingPlannerRequest[];
  onRestoreSearch: (request: ParkingPlannerRequest) => void;
  /** Show the "enter your trip details" prompt instead of results. */
  showIntroPrompt: boolean;
  /** "Your usual" card, shown in place of the generic prompt when a trip is saved. */
  usualTripCard?: React.ReactNode;
  /** True when trip details changed since the search; results are greyed out. */
  isStale: boolean;
  confirmedLotId: string | null;
  onConfirmLot: (locationId: string) => void;
  onStartRoute: (locationId: string) => void;
  selectedLocationId: string | null;
  onSelectLot: (locationId: string) => void;
  onRetry: () => void;
  onResetFilters: () => void;
}

/**
 * Animated results container orchestrating loading skeletons,
 * empty/error messages, and staggered recommendation cards.
 */
export const ResultsList: React.FC<ResultsListProps> = ({
  isLoading,
  isError,
  recommendations,
  searchedRequest,
  searchHistory,
  onRestoreSearch,
  showIntroPrompt,
  usualTripCard,
  isStale,
  confirmedLotId,
  onConfirmLot,
  onStartRoute,
  selectedLocationId,
  onSelectLot,
  onRetry,
  onResetFilters,
}) => {
  // Show the top 3, then reveal 5 more per "Show more" click; reset on every new search
  const [visibleCount, setVisibleCount] = useState(INITIAL_VISIBLE);
  const previousVisibleRef = useRef(INITIAL_VISIBLE);
  useEffect(() => {
    setVisibleCount(INITIAL_VISIBLE);
    previousVisibleRef.current = INITIAL_VISIBLE;
  }, [recommendations]);

  if (showIntroPrompt && !isLoading && usualTripCard) {
    return <div className="pt-2">{usualTripCard}</div>;
  }

  if (showIntroPrompt && !isLoading) {
    return (
      <div className="pt-2">
        <div className="p-5 text-center rounded-2xl bg-white/40 border border-white/50 space-y-2">
          <div className="w-10 h-10 mx-auto rounded-full bg-black/5 flex items-center justify-center text-slate-600">
            <MapPin className="w-5 h-5" aria-hidden="true" />
          </div>
          <p className="text-sm font-semibold text-slate-900">Enter your trip details to see options</p>
          <p className="text-xs text-slate-600 leading-relaxed">
            Pick where you're going (or tap the map to drop a pin), when you'll arrive and your
            permit, then press Find parking. Search a lot by name or tap any P to check it.
          </p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-3 pt-2">
        <div className="flex items-center justify-between text-xs text-slate-500 font-medium px-1">
          <span>Finding best matches...</span>
          <span className="text-[11px] animate-pulse">Calculating walking routes</span>
        </div>
        <SkeletonCard />
        <SkeletonCard />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="pt-2">
        <ErrorState onRetry={onRetry} />
      </div>
    );
  }

  if (recommendations.length === 0) {
    return (
      <div className="pt-2">
        <EmptyState onResetFilters={onResetFilters} />
      </div>
    );
  }

  // Cards describe the search that produced them, not whatever the form says now
  const arrival = searchedRequest ? parseArrival(searchedRequest.arrivalDate, searchedRequest.arrivalTime) : null;
  const destinationName = searchedRequest ? getDestination(searchedRequest.destinationId).name : '';

  return (
    <div className="space-y-3 pt-2">
      <div className="flex items-center justify-between text-xs text-slate-700 font-medium px-1">
        <span>Recommended for your arrival</span>
        <RecentSearches history={searchHistory} onRestore={onRestoreSearch} />
      </div>

      {/* Results no longer match the form: say so and grey them out */}
      {isStale && (
        <div role="status" className="px-3 py-2 rounded-xl bg-[#ff9f0a]/15 text-[12px] font-medium text-[#8a4b00]">
          Trip details changed. Press Update results to refresh these options.
        </div>
      )}

      <div
        className={`space-y-3 transition-[opacity,filter] duration-200 ${isStale ? 'opacity-50 grayscale' : ''}`}
        aria-disabled={isStale}
      >
        {recommendations.slice(0, visibleCount).map((rec, index) => {
          // Newly revealed cards stagger from their own start, not from the top of the list
          const staggerIndex = index >= previousVisibleRef.current ? index - previousVisibleRef.current : index;
          return (
            <motion.div
              key={rec.lot.locationId}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: 0.25,
                delay: staggerIndex * 0.06,
                ease: [0.16, 1, 0.3, 1],
              }}
            >
              <RecommendationCard
                recommendation={rec}
                userPermit={searchedRequest!.permitType}
                arrival={arrival}
                destinationName={destinationName}
                isStale={isStale}
                isConfirmed={confirmedLotId === rec.lot.locationId}
                onConfirm={() => onConfirmLot(rec.lot.locationId)}
                onStartRoute={() => onStartRoute(rec.lot.locationId)}
                isSelected={selectedLocationId === rec.lot.locationId}
                onSelect={() => onSelectLot(rec.lot.locationId)}
              />
            </motion.div>
          );
        })}
      </div>

      {visibleCount < recommendations.length && (
        <button
          type="button"
          disabled={isStale}
          onClick={() => {
            previousVisibleRef.current = visibleCount;
            setVisibleCount((n) => Math.min(recommendations.length, n + LOAD_MORE_STEP));
          }}
          className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-white/45 border border-white/60 hover:bg-white/70 text-[13px] font-semibold text-slate-800 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <ChevronDown className="w-4 h-4" aria-hidden="true" />
          Show {Math.min(LOAD_MORE_STEP, recommendations.length - visibleCount)} more
          <span className="font-normal text-slate-500">
            ({recommendations.length - visibleCount} left)
          </span>
        </button>
      )}
    </div>
  );
};
