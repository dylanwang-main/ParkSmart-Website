/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Footprints, CheckCircle2, ShieldAlert } from 'lucide-react';
import { motion } from 'motion/react';
import { ParkingRecommendation, PermitType } from '../types.ts';

interface RecommendationCardProps {
  recommendation: ParkingRecommendation;
  userPermit: PermitType;
  isSelected: boolean;
  onSelect: () => void;
}

/**
 * Clickable, keyboard-accessible card displaying parking lot details,
 * estimated capacity bar, walking time, and recommendation reasoning.
 */
export const RecommendationCard: React.FC<RecommendationCardProps> = ({
  recommendation,
  userPermit,
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
          ? 'bg-white/85 border-white shadow-lg shadow-black/10 ring-1 ring-slate-900/15 -translate-y-0.5'
          : 'bg-white/40 border-white/50 hover:bg-white/65 hover:shadow-md hover:shadow-black/5 hover:-translate-y-0.5'
      }`}
    >
      {/* Top Header: Badge label */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <span
            className={`px-2 py-0.5 rounded-full text-[11px] font-semibold tracking-wide uppercase ${
              isFirstChoice
                ? 'bg-slate-900 text-white'
                : 'bg-black/[0.07] text-slate-700'
            }`}
          >
            {badgeLabel}
          </span>
          {isSelected && (
            <span className="flex items-center gap-1 text-[11px] font-medium text-slate-600">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Selected</span>
            </span>
          )}
        </div>
      </div>

      {/* Lot Title & Walk Time */}
      <div className="flex items-baseline justify-between gap-2 mb-2">
        <h3 className="text-base font-bold text-slate-900 ">
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
        <div className="w-full h-1.5 bg-black/[0.07] rounded-full overflow-hidden">
          <motion.div
            className={`h-full rounded-full ${getBarColorClass(lot.estimatedAvailabilityPercent)}`}
            initial={{ width: 0 }}
            animate={{ width: `${lot.estimatedAvailabilityPercent}%` }}
            transition={{ duration: 0.8, delay: 0.25, ease: [0.22, 1, 0.36, 1] }}
          />
        </div>
      </div>

      {/* One-line Reasoning */}
      <div className="text-xs text-slate-600 leading-relaxed font-normal bg-black/[0.03] p-2 rounded-lg mb-2">
        {reason}
      </div>

      {/* Allowed Permits Footnote */}
      <div className="flex items-center justify-between pt-1 border-t border-black/5 text-[11px]">
        <span className="flex items-center gap-1 font-medium text-emerald-700">
          <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
          Your {userPermit} permit works here
        </span>
        <div className="flex gap-1" aria-label={`Eligible permits: ${lot.allowedPermitTypes.join(', ')}`}>
          {lot.allowedPermitTypes.map((permit) => (
            <span
              key={permit}
              className={`px-1.5 py-0.2 rounded font-mono text-[10px] ${
                permit === userPermit
                  ? 'bg-slate-900 text-white font-bold'
                  : 'bg-black/5 text-slate-500 font-medium'
              }`}
            >
              {permit}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
};
