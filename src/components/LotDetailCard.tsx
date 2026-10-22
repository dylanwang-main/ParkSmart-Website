/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { motion } from 'motion/react';
import { CheckCircle2, Clock, Footprints, Navigation, X, XCircle } from 'lucide-react';
import { CampusDestination, ParkingLot, PermitType } from '../types.ts';
import { estimateWalkingTime } from '../data/sampleRecommendations.ts';
import { availabilityStatus } from '../utils/availability.ts';
import { accessLabel, lotAccess, usableCategories } from '../utils/permitRules.ts';

interface LotDetailCardProps {
  lot: ParkingLot;
  /** Permit currently chosen in the planner form. */
  userPermit: PermitType;
  /** Arrival time from the form; null if the date/time is missing or invalid. */
  arrival: Date | null;
  destination: CampusDestination;
  isConfirmed: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

/**
 * Apple Maps style place card for a single parking structure. Opens when any pin is
 * selected, so people can check a lot without running a full recommendation search.
 * Positioning and the enter/exit animation are handled by the parent.
 */
export const LotDetailCard: React.FC<LotDetailCardProps> = ({
  lot,
  userPermit,
  arrival,
  destination,
  isConfirmed,
  onConfirm,
  onClose,
}) => {
  const percent = lot.estimatedAvailabilityPercent;
  const status = availabilityStatus(percent);
  // Hours are checked at the arrival time in the form (falls back to now)
  const when = arrival ?? new Date();
  const access = lotAccess(userPermit, lot.spaceCategories, when);
  const permitWorks = access.status === 'always' || access.status === 'until';
  const usable = usableCategories(userPermit, lot.spaceCategories, when);
  const walkMinutes = estimateWalkingTime(lot, destination.id);

  return (
    <motion.div
      // Fade lives on the glass element itself so the blur renders from the first frame
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.14, ease: 'easeOut' }}
      role="dialog"
      aria-label={`${lot.name} details`}
      className="w-[340px] max-w-[calc(100vw-2rem)] p-4 rounded-[24px] bg-white/70 backdrop-blur-xl backdrop-saturate-[1.8] border border-white/60 shadow-2xl shadow-black/25 text-slate-900"
    >
      {/* Header: glyph, name, close */}
      <div className="flex items-start gap-3">
        <div className="shrink-0 w-10 h-10 rounded-full bg-[#007aff] border-2 border-white text-white font-extrabold text-lg flex items-center justify-center shadow-md shadow-black/20">
          P
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-[15px] font-bold leading-tight tracking-tight truncate">{lot.name}</h2>
          <p className="text-xs text-slate-600 mt-0.5">Parking structure</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close lot details"
          className="shrink-0 w-7 h-7 rounded-full bg-black/[0.07] hover:bg-black/[0.12] text-slate-600 flex items-center justify-center transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-900/30 cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Availability */}
      <div className="mt-4">
        <div className="flex items-end justify-between">
          <div>
            <div className="text-[34px] font-bold leading-none tracking-tight tabular-nums">
              {percent}%
            </div>
            <div className="text-xs text-slate-600 mt-1">of spaces estimated open</div>
          </div>
          <span
            className="px-2.5 py-1 rounded-full text-xs font-semibold"
            style={{ color: status.textColor, backgroundColor: `${status.color}26` }}
          >
            {status.label}
          </span>
        </div>
        <div className="mt-3 h-2 rounded-full bg-black/[0.07] overflow-hidden">
          <motion.div
            key={lot.locationId}
            className="h-full rounded-full"
            style={{ backgroundColor: status.color }}
            initial={{ width: 0 }}
            animate={{ width: `${percent}%` }}
            transition={{ duration: 0.45, delay: 0.05, ease: [0.22, 1, 0.36, 1] }}
          />
        </div>
      </div>

      {/* Facts */}
      <div className="mt-4 rounded-2xl bg-black/[0.04] divide-y divide-black/5 text-[13px]">
        <div className="flex items-center gap-2 px-3 py-2.5">
          {access.status === 'always' ? (
            <CheckCircle2 className="w-4 h-4 text-[#34c759] shrink-0" aria-hidden="true" />
          ) : permitWorks ? (
            <Clock className="w-4 h-4 text-[#34c759] shrink-0" aria-hidden="true" />
          ) : (
            <XCircle className="w-4 h-4 text-[#ff3b30] shrink-0" aria-hidden="true" />
          )}
          <span className="font-medium">{accessLabel(access, userPermit, when)}</span>
          <div className="ml-auto flex gap-1" aria-label={`Space types: ${lot.spaceCategories.join(', ')}`}>
            {lot.spaceCategories.map((category) => (
              <span
                key={category}
                className={`px-1.5 rounded font-mono text-[10px] leading-4 ${
                  usable.includes(category)
                    ? 'bg-slate-900 text-white font-bold'
                    : 'bg-black/5 text-slate-400 line-through decoration-slate-400/60'
                }`}
              >
                {category}
              </span>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2 px-3 py-2.5">
          <Footprints className="w-4 h-4 text-slate-500 shrink-0" aria-hidden="true" />
          <span>
            <span className="font-medium">{walkMinutes} min walk</span>
            <span className="text-slate-600"> to {destination.name}</span>
          </span>
        </div>
      </div>

      <button
        type="button"
        onClick={onConfirm}
        disabled={!permitWorks}
        className={`mt-3 w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-[13px] font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-900/30 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 ${
          isConfirmed ? 'bg-[#34c759]/15 text-[#1f7a37]' : 'bg-[#007aff] text-white hover:bg-[#0067d6]'
        }`}
      >
        {isConfirmed ? (
          <>
            <CheckCircle2 className="w-4 h-4" aria-hidden="true" /> Parking here. Directions coming soon
          </>
        ) : (
          <>
            <Navigation className="w-4 h-4" aria-hidden="true" /> Select this spot
          </>
        )}
      </button>

      <p className="mt-2 text-[11px] text-slate-500 text-center">
        Sample estimate, not live availability
      </p>
    </motion.div>
  );
};
