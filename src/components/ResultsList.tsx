/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { motion } from 'motion/react';
import { MapPin } from 'lucide-react';
import { ParkingPlannerRequest, ParkingRecommendation } from '../types.ts';
import { getDestination } from '../data/destinations.ts';
import { parseArrival } from '../utils/permitRules.ts';
import { RecommendationCard } from './RecommendationCard.tsx';
import { SkeletonCard } from './SkeletonCard.tsx';
import { EmptyState } from './EmptyState.tsx';
import { ErrorState } from './ErrorState.tsx';

interface ResultsListProps {
  isLoading: boolean;
  isError: boolean;
  recommendations: ParkingRecommendation[];
  /** The request these results were computed for (null before the first search). */
  searchedRequest: ParkingPlannerRequest | null;
  /** Show the "enter your trip details" prompt instead of results. */
  showIntroPrompt: boolean;
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
  showIntroPrompt,
  isStale,
  confirmedLotId,
  onConfirmLot,
  onStartRoute,
  selectedLocationId,
  onSelectLot,
  onRetry,
  onResetFilters,
}) => {
  if (showIntroPrompt && !isLoading) {
    return (
      <div className="pt-2">
        <div className="p-5 text-center rounded-2xl bg-white/40 border border-white/50 space-y-2">
          <div className="w-10 h-10 mx-auto rounded-full bg-black/5 flex items-center justify-center text-slate-600">
            <MapPin className="w-5 h-5" aria-hidden="true" />
          </div>
          <p className="text-sm font-semibold text-slate-900">Enter your trip details to see options</p>
          <p className="text-xs text-slate-600 leading-relaxed">
            Pick where you're going, when you'll arrive and your permit, then press Find parking.
            You can also tap any P on the map to check a structure.
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
        <span className="text-[11px] text-slate-600">Ranked by score</span>
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
        {recommendations.map((rec, index) => {
          return (
            <motion.div
              key={rec.lot.locationId}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: 0.25,
                delay: index * 0.08,
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
    </div>
  );
};
