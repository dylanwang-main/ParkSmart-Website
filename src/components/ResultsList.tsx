/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { motion } from 'motion/react';
import { ParkingRecommendation } from '../types.ts';
import { RecommendationCard } from './RecommendationCard.tsx';
import { SkeletonCard } from './SkeletonCard.tsx';
import { EmptyState } from './EmptyState.tsx';
import { ErrorState } from './ErrorState.tsx';

interface ResultsListProps {
  isLoading: boolean;
  isError: boolean;
  recommendations: ParkingRecommendation[];
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
  selectedLocationId,
  onSelectLot,
  onRetry,
  onResetFilters,
}) => {
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

  return (
    <div className="space-y-3 pt-2">
      <div className="flex items-center justify-between text-xs text-slate-700 font-medium px-1">
        <span>Recommended for your arrival</span>
        <span className="text-[11px] text-slate-600">Ranked by score</span>
      </div>

      <div className="space-y-3">
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
