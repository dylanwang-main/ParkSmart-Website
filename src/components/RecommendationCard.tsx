/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Footprints, CheckCircle2, Clock } from 'lucide-react';
import { SpotActions } from './SpotActions.tsx';
import { motion } from 'motion/react';
import { ParkingRecommendation, PermitType } from '../types.ts';
import { AvailabilityLevel, availabilityStatus } from '../utils/availability.ts';
import { accessLabel, relyOnUnverifiedDAccess, usableCategories } from '../utils/permitRules.ts';

const BADGE_CLASS: Record<AvailabilityLevel, string> = {
  plenty: 'text-emerald-700 bg-emerald-50 border-emerald-200',
  filling: 'text-amber-700 bg-amber-50 border-amber-200',
  nearlyFull: 'text-rose-700 bg-rose-50 border-rose-200',
};

const BAR_CLASS: Record<AvailabilityLevel, string> = {
  plenty: 'bg-emerald-500',
  filling: 'bg-amber-500',
  nearlyFull: 'bg-rose-500',
};

interface RecommendationCardProps {
  recommendation: ParkingRecommendation;
  /** Permit the results were searched with. */
  userPermit: PermitType;
  /** Arrival time the results were searched with. */
  arrival: Date | null;
  /** Destination the walk time is measured to. */
  destinationName: string;
  /** Results no longer match the form; disables confirming. */
  isStale: boolean;
  isSelected: boolean;
  isConfirmed: boolean;
  onSelect: () => void;
  onConfirm: () => void;
}

/**
 * Clickable, keyboard-accessible card displaying parking lot details,
 * estimated capacity bar, walking time, and recommendation reasoning.
 */
export const RecommendationCard: React.FC<RecommendationCardProps> = ({
  recommendation,
  userPermit,
  arrival,
  destinationName,
  isStale,
  isSelected,
  isConfirmed,
  onSelect,
  onConfirm,
}) => {
  const { badgeLabel, lot, reason, access } = recommendation;
  const usable = arrival ? usableCategories(userPermit, lot.spaceCategories, arrival) : [];

  // Badge and bar colors come from the shared availability buckets
  const level = availabilityStatus(lot.estimatedAvailabilityPercent).level;
  const badgeClass = BADGE_CLASS[level];
  const barClass = BAR_CLASS[level];

  const isFirstChoice = badgeLabel === 'First choice';

  return (
    // Clicking anywhere on the card highlights the lot on the map; keyboard users use
    // the title button. (The card itself is not a button because it contains one.)
    <article
      onClick={onSelect}
      aria-label={`${badgeLabel}: ${lot.name}`}
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
                : recommendation.rank === 2
                ? 'bg-black/[0.07] text-slate-700'
                : 'bg-black/[0.04] text-slate-500'
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
        <h3 className="text-base font-bold text-slate-900">
          <button
            type="button"
            aria-pressed={isSelected}
            onClick={(e) => {
              e.stopPropagation();
              onSelect();
            }}
            className="text-left rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-900/30 cursor-pointer"
          >
            {lot.name}
          </button>
        </h3>
      </div>
      <div className="-mt-1 mb-2 flex items-center gap-1 text-slate-600 text-xs">
        <Footprints className="w-3.5 h-3.5 text-slate-400 shrink-0" aria-hidden="true" />
        <span>
          <span className="font-semibold">{lot.walkingMinutes} min walk</span> to {destinationName}
        </span>
      </div>

      {/* Availability Meter */}
      <div className="mb-2.5">
        <div className="flex items-center justify-between text-xs mb-1">
          <span className="text-slate-500 font-medium">Estimated availability</span>
          <span
            className={`font-semibold px-1.5 py-0.2 rounded border text-[11px] ${badgeClass}`}
          >
            {lot.estimatedAvailabilityPercent}% · {availabilityStatus(lot.estimatedAvailabilityPercent).label}
          </span>
        </div>
        {/* Subtle color bar with filled indicator */}
        <div className="w-full h-1.5 bg-black/[0.07] rounded-full overflow-hidden">
          <motion.div
            className={`h-full rounded-full ${barClass}`}
            initial={{ width: 0 }}
            animate={{ width: `${lot.estimatedAvailabilityPercent}%` }}
            transition={{ duration: 0.5, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
          />
        </div>
      </div>

      {/* One-line Reasoning */}
      <div className="text-xs text-slate-600 leading-relaxed font-normal bg-black/[0.03] p-2 rounded-lg mb-2">
        {reason}
      </div>

      {/* Non-D permits that get in only through D stalls: the Sept 18 D restriction is unresolved */}
      {arrival && relyOnUnverifiedDAccess(userPermit, lot.spaceCategories, arrival) && (
        <p className="text-[11px] font-medium text-[#8a4b00]">
          Needs verification: this relies on D stalls, and UCSD's Sept 18, 2026 D restriction may change who can use them.
        </p>
      )}

      {/* Parking hours for this permit, and which stall types it can use */}
      <div className="flex items-center justify-between gap-2 pt-1.5 border-t border-black/5 text-[11px]">
        <span className="flex items-center gap-1 font-medium text-emerald-700">
          {access.status === 'always' ? (
            <CheckCircle2 className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
          ) : (
            <Clock className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
          )}
          {arrival ? accessLabel(access, userPermit, arrival, lot.spaceCategories) : ''}
        </span>
        <div className="flex items-center gap-1" aria-label={`Space types here: ${lot.spaceCategories.join(', ')}. Usable now: ${usable.join(', ')}`}>
          {lot.spaceCategories.map((category) => (
            <span
              key={category}
              title={usable.includes(category) ? `You can use ${category} spaces` : `${category} spaces not valid for you at this time`}
              className={`px-1.5 py-0.2 rounded font-mono text-[10px] ${
                usable.includes(category)
                  ? 'bg-slate-900 text-white font-bold'
                  : 'bg-black/5 text-slate-400 font-medium line-through decoration-slate-400/60'
              }`}
            >
              {category}
            </span>
          ))}
        </div>
      </div>

      {/* Confirm, then open directions in Google Maps */}
      <div className="mt-3">
        <SpotActions
          tone="subtle"
          isConfirmed={isConfirmed}
          disabled={isStale}
          onConfirm={onConfirm}
          lot={lot}
        />
      </div>
    </article>
  );
};
