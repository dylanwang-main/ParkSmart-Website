/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { motion } from 'motion/react';
import { CalendarClock, CheckCircle2, Clock, Footprints, Info, X, XCircle } from 'lucide-react';
import { SpotActions } from './SpotActions.tsx';
import { LotAerial } from './LotAerial.tsx';
import { CampusDestination, ParkingLot, PermitType } from '../types.ts';
import { estimateWalkingTime } from '../data/sampleRecommendations.ts';
import { availabilityStatus } from '../utils/availability.ts';
import { availabilityAt, tightFrom } from '../utils/availabilityModel.ts';
import { accessLabel, formatAccessTime, lotAccess, relyOnUnverifiedDAccess, usableCategories } from '../utils/permitRules.ts';

interface LotDetailCardProps {
  lot: ParkingLot;
  /** Permit currently chosen in the planner form. */
  userPermit: PermitType;
  /** Arrival time from the form; null if the date/time is missing or invalid. */
  arrival: Date | null;
  /** Time the availability numbers describe (the time scrubber). */
  availabilityTime: Date;
  /** Null until the user picks a destination; the walk row is hidden then. */
  destination: CampusDestination | null;
  isConfirmed: boolean;
  onConfirm: () => void;
  /** Moves the arrival to a time when this permit can use the lot. */
  onPlanFor: (date: Date) => void;
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
  availabilityTime,
  destination,
  isConfirmed,
  onConfirm,
  onPlanFor,
  onClose,
}) => {
  const percent = availabilityAt(lot, availabilityTime);
  const tight = tightFrom(lot, availabilityTime);
  const isWeekend = availabilityTime.getDay() === 0 || availabilityTime.getDay() === 6;
  const timeLabel = availabilityTime.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  const status = availabilityStatus(percent);
  // Hours are checked at the arrival time in the form (falls back to now)
  const when = arrival ?? new Date();
  const access = lotAccess(userPermit, lot.spaceCategories, when);
  const permitWorks = access.status === 'always' || access.status === 'until';
  const usable = usableCategories(userPermit, lot.spaceCategories, when);
  const walkMinutes = destination ? estimateWalkingTime(lot, destination.id) : null;

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
      {/* Aerial photo of the lot (USGS NAIP), keyed so switching lots restarts the fade */}
      <LotAerial key={lot.locationId} lot={lot} />

      {/* Header: glyph, name, close */}
      <div className="flex items-start gap-3">
        <div className="shrink-0 w-10 h-10 rounded-full bg-[#007aff] border-2 border-white text-white font-extrabold text-lg flex items-center justify-center shadow-md shadow-black/20">
          P
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-[15px] font-bold leading-tight tracking-tight truncate">{lot.name}</h2>
          <p className="text-xs text-slate-600 mt-0.5">
            {lot.kind === 'lot' ? 'Surface lot' : 'Parking structure'}
          </p>
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
            <div className="text-xs text-slate-600 mt-1">of spaces estimated open at {timeLabel}</div>
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
        {/* Campus-specific insight from the (sample) daily pattern */}
        <p className="mt-2 text-[12px] text-slate-600">
          {tight
            ? `Usually gets tight from ${tight.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })} on ${isWeekend ? 'weekends' : 'weekdays'}.`
            : `Usually stays open all day on ${isWeekend ? 'weekends' : 'weekdays'}.`}
        </p>
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
          <span className="font-medium">{accessLabel(access, userPermit, when, lot.spaceCategories)}</span>
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
        {relyOnUnverifiedDAccess(userPermit, lot.spaceCategories, when) && (
          <div className="flex items-start gap-2 px-3 py-2.5 text-[#8a4b00]">
            <span>Needs verification: this relies on D stalls, and UCSD's Sept 18, 2026 D restriction may change who can use them.</span>
          </div>
        )}
        {lot.accessNote && (
          <div className="flex items-start gap-2 px-3 py-2.5 text-[#8a4b00]">
            <Info className="w-4 h-4 shrink-0 mt-px" aria-hidden="true" />
            <span>{lot.accessNote}</span>
          </div>
        )}
        {destination && walkMinutes !== null && (
          <div className="flex items-center gap-2 px-3 py-2.5">
            <Footprints className="w-4 h-4 text-slate-500 shrink-0" aria-hidden="true" />
            <span>
              <span className="font-medium">{walkMinutes} min walk</span>
              <span className="text-slate-600"> to {destination.name}</span>
            </span>
          </div>
        )}
      </div>

      <div className="mt-3">
        {permitWorks ? (
          <SpotActions
            tone="primary"
            isConfirmed={isConfirmed}
            onConfirm={onConfirm}
            lot={lot}
          />
        ) : access.status === 'from' ? (
          // Not usable at this time, but later today/this week: offer to plan for then
          <button
            type="button"
            onClick={() => onPlanFor(access.from)}
            className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-[13px] font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-900/30 cursor-pointer"
          >
            <CalendarClock className="w-4 h-4" aria-hidden="true" />
            Plan for {formatAccessTime(access.from, when)} instead
          </button>
        ) : (
          <p className="py-2.5 rounded-xl bg-black/[0.05] text-center text-[13px] font-medium text-slate-600">
            Your {userPermit} permit can't park here. Try another permit or lot.
          </p>
        )}
      </div>

      <p className="mt-2 text-[11px] text-slate-500 text-center">
        Sample estimate, not live availability
      </p>
    </motion.div>
  );
};
