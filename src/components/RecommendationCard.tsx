/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Footprints, CheckCircle2, Clock } from 'lucide-react';
import { SpotActions } from './SpotActions.tsx';
import { motion } from 'motion/react';
import { ParkingRecommendation, PermitType } from '../types.ts';
import { availabilityStatus } from '../utils/availability.ts';
import { accessLabel, relyOnUnverifiedDAccess, usableCategories } from '../utils/permitRules.ts';

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
  const status = availabilityStatus(lot.estimatedAvailabilityPercent);

  // The first choice is the one bold moment: a solid navy card. The rest stay quiet and white.
  const hero = badgeLabel === 'First choice';
  const muted = hero ? 'text-white/70' : 'text-muted';
  const strong = hero ? 'text-white' : 'text-navy';

  return (
    // Clicking anywhere on the card highlights the lot on the map; keyboard users use
    // the title button. (The card itself is not a button because it contains one.)
    <article
      onClick={onSelect}
      aria-label={`${badgeLabel}: ${lot.name}`}
      // The left edge carries the availability color, so a list scans at a glance
      style={{ borderLeftColor: status.color }}
      className={`relative p-4 rounded-lg border border-l-[5px] transition-[box-shadow,transform] duration-150 cursor-pointer text-left select-none ${
        hero ? 'bg-navy border-navy text-white' : 'bg-white border-line'
      } ${
        isSelected
          ? 'ring-2 ring-sky shadow-[0_6px_18px_rgba(24,43,73,0.18)]'
          : 'shadow-[0_1px_2px_rgba(24,43,73,0.06)] hover:shadow-[0_6px_18px_rgba(24,43,73,0.14)]'
      }`}
    >
      {/* Rank and selection */}
      <div className="flex items-center gap-2 mb-1.5">
        <span
          className={`px-2 py-0.5 rounded text-[12px] font-semibold ${
            hero ? 'bg-sun text-navy' : 'bg-paper text-navy border border-line'
          }`}
        >
          {badgeLabel}
        </span>
        {isSelected && (
          <span className={`flex items-center gap-1 text-[12px] font-medium ${muted}`}>
            <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
            Selected
          </span>
        )}
      </div>

      {/* Lot name and walk time */}
      <h3 className={`font-serif font-semibold leading-tight tracking-[-0.005em] ${hero ? 'text-[24px]' : 'text-[19px]'} ${strong}`}>
        <button
          type="button"
          aria-pressed={isSelected}
          onClick={(e) => {
            e.stopPropagation();
            onSelect();
          }}
          className="text-left rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-sun cursor-pointer"
        >
          {lot.name}
        </button>
      </h3>
      <div className={`mt-1 flex items-center gap-1.5 text-[13px] ${muted}`}>
        <Footprints className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
        <span>
          <span className={`font-semibold ${strong}`}>{lot.walkingMinutes} min walk</span> to {destinationName}
        </span>
      </div>

      {/* Availability */}
      <div className="mt-3.5">
        <div className="flex items-baseline justify-between gap-2">
          <span className={`font-serif font-semibold tabular-nums leading-none ${hero ? 'text-[34px] text-sun' : 'text-[26px] text-navy'}`}>
            {lot.estimatedAvailabilityPercent}%
            <span className={`ml-1.5 font-sans text-[13px] font-medium ${muted}`}>open</span>
          </span>
          <span className="text-[13px] font-semibold" style={{ color: hero ? '#fff' : status.textColor }}>
            {status.label}
          </span>
        </div>
        <div className={`mt-2 w-full h-1.5 rounded-full overflow-hidden ${hero ? 'bg-white/20' : 'bg-line'}`}>
          <motion.div
            className="h-full rounded-full"
            style={{ backgroundColor: status.color }}
            initial={{ width: 0 }}
            animate={{ width: `${lot.estimatedAvailabilityPercent}%` }}
            transition={{ duration: 0.5, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
          />
        </div>
      </div>

      {/* One-line reasoning */}
      <p className={`mt-3 text-[13px] leading-relaxed ${hero ? 'text-white/90' : 'text-ink'}`}>{reason}</p>

      {/* Non-D permits that get in only through D stalls: the Sept 18 D restriction is unresolved */}
      {arrival && relyOnUnverifiedDAccess(userPermit, lot.spaceCategories, arrival) && (
        <p className={`mt-2 text-[12px] font-medium ${hero ? 'text-sun' : 'text-[#835300]'}`}>
          Needs verification: this relies on D stalls, and UCSD's Sept 18, 2026 D restriction may change who can use them.
        </p>
      )}

      {/* Parking hours for this permit, and which stall types it can use */}
      <div className={`mt-3 flex items-center justify-between gap-2 pt-2.5 border-t text-[12px] ${hero ? 'border-white/20' : 'border-line'}`}>
        <span className={`flex items-center gap-1.5 font-medium ${hero ? 'text-white' : 'text-[#136B42]'}`}>
          {access.status === 'always' ? (
            <CheckCircle2 className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
          ) : (
            <Clock className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
          )}
          {arrival ? accessLabel(access, userPermit, arrival, lot.spaceCategories) : ''}
        </span>
        <div className="flex items-center gap-1 shrink-0" aria-label={`Space types here: ${lot.spaceCategories.join(', ')}. Usable now: ${usable.join(', ')}`}>
          {lot.spaceCategories.map((category) => (
            <span
              key={category}
              title={usable.includes(category) ? `You can use ${category} spaces` : `${category} spaces not valid for you at this time`}
              className={`px-1.5 rounded text-[11px] leading-[18px] font-semibold ${
                usable.includes(category)
                  ? hero
                    ? 'bg-sun text-navy'
                    : 'bg-navy text-white'
                  : hero
                  ? 'bg-white/10 text-white/50 line-through'
                  : 'bg-paper text-muted line-through'
              }`}
            >
              {category}
            </span>
          ))}
        </div>
      </div>

      {/* Confirm, then open directions in Google Maps */}
      <div className="mt-3.5">
        <SpotActions
          tone={hero ? 'onDark' : 'subtle'}
          isConfirmed={isConfirmed}
          disabled={isStale}
          onConfirm={onConfirm}
          lot={lot}
        />
      </div>
    </article>
  );
};
