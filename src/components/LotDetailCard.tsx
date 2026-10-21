/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { motion } from 'motion/react';
import { CheckCircle2, Footprints, X, XCircle } from 'lucide-react';
import { CampusDestination, ParkingLot, PermitType } from '../types.ts';
import { estimateWalkingTime } from '../data/sampleRecommendations.ts';

interface LotDetailCardProps {
  lot: ParkingLot;
  /** Permit currently chosen in the planner form. */
  userPermit: PermitType;
  destination: CampusDestination;
  onClose: () => void;
}

/** Availability thresholds (percent of spaces open) for the plain-language status. */
const PLENTY_THRESHOLD = 75;
const FILLING_THRESHOLD = 50;

/** Plain-language status plus iOS system color for an availability percentage. */
function availabilityStatus(percent: number): { label: string; color: string } {
  if (percent >= PLENTY_THRESHOLD) return { label: 'Plenty of space', color: '#34c759' };
  if (percent >= FILLING_THRESHOLD) return { label: 'Filling up', color: '#ff9f0a' };
  return { label: 'Nearly full', color: '#ff3b30' };
}

/**
 * Apple Maps style place card for a single parking structure. Opens when any pin is
 * selected, so people can check a lot without running a full recommendation search.
 * Positioning and the enter/exit animation are handled by the parent.
 */
export const LotDetailCard: React.FC<LotDetailCardProps> = ({
  lot,
  userPermit,
  destination,
  onClose,
}) => {
  const percent = lot.estimatedAvailabilityPercent;
  const status = availabilityStatus(percent);
  const permitWorks = lot.allowedPermitTypes.includes(userPermit);
  const walkMinutes = estimateWalkingTime(lot, destination.id);

  return (
    <div
      role="dialog"
      aria-label={`${lot.name} details`}
      className="w-[340px] max-w-[calc(100vw-2rem)] p-4 rounded-[24px] bg-white/70 backdrop-blur-2xl backdrop-saturate-[1.8] border border-white/60 shadow-2xl shadow-black/25 text-slate-900"
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
            style={{ color: status.color, backgroundColor: `${status.color}1f` }}
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
            transition={{ duration: 0.7, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
          />
        </div>
      </div>

      {/* Facts */}
      <div className="mt-4 rounded-2xl bg-black/[0.04] divide-y divide-black/5 text-[13px]">
        <div className="flex items-center gap-2 px-3 py-2.5">
          {permitWorks ? (
            <CheckCircle2 className="w-4 h-4 text-[#34c759] shrink-0" aria-hidden="true" />
          ) : (
            <XCircle className="w-4 h-4 text-[#ff3b30] shrink-0" aria-hidden="true" />
          )}
          <span className="font-medium">
            {permitWorks ? `Your ${userPermit} permit works here` : `Not valid with your ${userPermit} permit`}
          </span>
          <div className="ml-auto flex gap-1">
            {lot.allowedPermitTypes.map((permit) => (
              <span
                key={permit}
                className={`px-1.5 rounded font-mono text-[10px] leading-4 ${
                  permit === userPermit ? 'bg-slate-900 text-white font-bold' : 'bg-black/5 text-slate-500'
                }`}
              >
                {permit}
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

      <p className="mt-3 text-[11px] text-slate-500 text-center">
        Sample estimate, not live availability
      </p>
    </div>
  );
};
