/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Footprints, CheckCircle2, ShieldAlert } from 'lucide-react';
import { ParkingRecommendation } from '../types.ts';

interface RecommendationCardProps {
  recommendation: ParkingRecommendation;
  isSelected: boolean;
  onSelect: () => void;
}

/**
 * Clickable, keyboard-accessible card displaying parking lot details,
 * estimated capacity bar, walking time, and recommendation reasoning.
 */
export const RecommendationCard: React.FC<RecommendationCardProps> = ({
  recommendation,
  isSelected,
  onSelect,
}) => {
  const { badgeLabel, lot, reason } = recommendation;

  // Determine availability status color
  const getAvailabilityColorClass = (percent: number) => {
    if (percent >= 75) return 'text-emerald-700 bg-emerald-50 border-emerald-200';
    if (percent >= 50) return 'text-amber-700 bg-amber-50 border-amber-200';
    return 'text-rose-700 bg-rose-50 border-rose-200';
  };

  const getBarColorClass = (percent: number) => {
    if (percent >= 75) return 'bg-emerald-500';
    if (percent >= 50) return 'bg-amber-500';
    return 'bg-rose-500';
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onSelect();
    }
  };

  const isFirstChoice = badgeLabel === 'First choice';

  return (
    <div
      role="button"
      tabIndex={0}
      aria-pressed={isSelected}
      aria-label={`${badgeLabel}: ${lot.name}, ${lot.walkingMinutes} minute walk, ${lot.estimatedAvailabilityPercent}% estimated capacity`}
      onClick={onSelect}
      onKeyDown={handleKeyDown}
      className={`group relative p-3.5 rounded-2xl transition-all duration-200 cursor-pointer text-left border select-none ${
        isSelected
          ? 'bg-blue-50/70 border-blue-400 shadow-md ring-2 ring-blue-400/30 -translate-y-0.5'
          : 'bg-white/80 border-slate-200/90 hover:bg-white/95 hover:border-slate-300 hover:shadow-sm hover:-translate-y-0.5'
      }`}
    >
      {/* Top Header: Badge label and Sample tag */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <span
            className={`px-2 py-0.5 rounded-full text-[11px] font-semibold tracking-wide uppercase ${
              isFirstChoice
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-slate-200 text-slate-700'
            }`}
          >
            {badgeLabel}
          </span>
          {isSelected && (
            <span className="flex items-center gap-1 text-[11px] font-medium text-blue-600">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Selected</span>
            </span>
          )}
        </div>
        <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold tracking-wide uppercase bg-slate-100 text-slate-500 border border-slate-200/60">
          Sample
        </span>
      </div>

      {/* Lot Title & Walk Time */}
      <div className="flex items-baseline justify-between gap-2 mb-2">
        <h3 className="text-base font-bold text-slate-900 group-hover:text-blue-900 transition-colors">
          {lot.name}
        </h3>
        <div className="flex items-center gap-1 text-slate-600 font-semibold text-xs shrink-0">
          <Footprints className="w-3.5 h-3.5 text-slate-400" />
          <span>{lot.walkingMinutes} min walk</span>
        </div>
      </div>

      {/* Availability Meter */}
      <div className="mb-2.5">
        <div className="flex items-center justify-between text-xs mb-1">
          <span className="text-slate-500 font-medium">Estimated availability</span>
          <span
            className={`font-semibold px-1.5 py-0.2 rounded border text-[11px] ${getAvailabilityColorClass(
              lot.estimatedAvailabilityPercent
            )}`}
          >
            {lot.estimatedAvailabilityPercent}%
          </span>
        </div>
        {/* Subtle color bar with filled indicator */}
        <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden border border-slate-200/50">
          <div
            className={`h-full rounded-full transition-all duration-300 ${getBarColorClass(
              lot.estimatedAvailabilityPercent
            )}`}
            style={{ width: `${lot.estimatedAvailabilityPercent}%` }}
          />
        </div>
      </div>

      {/* One-line Reasoning */}
      <div className="text-xs text-slate-600 leading-relaxed font-normal bg-slate-50/80 p-2 rounded-lg border border-slate-200/50 mb-2">
        {reason}
      </div>

      {/* Allowed Permits Footnote */}
      <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-[11px]">
        <span className="text-slate-400">Eligible permits</span>
        <div className="flex gap-1">
          {lot.allowedPermitTypes.map((permit) => (
            <span
              key={permit}
              className="px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 font-mono text-[10px] font-medium"
            >
              {permit}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
};
