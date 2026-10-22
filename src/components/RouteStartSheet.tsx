/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion } from 'motion/react';
import { CheckCircle2, LocateFixed, MapPin, Navigation, X } from 'lucide-react';
import { ParkingLot } from '../types.ts';

/** Where the route starts: the browser location, or text the user typed. */
export type RouteStart =
  | { kind: 'location'; latitude: number; longitude: number }
  | { kind: 'manual'; label: string };

interface RouteStartSheetProps {
  lot: ParkingLot;
  destinationName: string;
  /** Walk from the lot to the destination, in minutes. */
  walkMinutes: number;
  /** Set once the user has chosen a start; switches the sheet to its summary view. */
  start: RouteStart | null;
  onStart: (start: RouteStart) => void;
  onClose: () => void;
}

/** How long to wait for the browser's location before falling back to manual entry. */
const LOCATION_TIMEOUT_MS = 10_000;

type Step = 'ask' | 'locating' | 'manual';

/**
 * Asks for the user's location only at the moment it is needed (starting a route),
 * explains why, and offers a manual starting point if they decline or it fails.
 * Actual turn-by-turn routing is a later task; this sheet ends at a clear summary.
 */
export const RouteStartSheet: React.FC<RouteStartSheetProps> = ({
  lot,
  destinationName,
  walkMinutes,
  start,
  onStart,
  onClose,
}) => {
  const [step, setStep] = useState<Step>('ask');
  const [manualText, setManualText] = useState('');
  const [locationError, setLocationError] = useState<string | null>(null);

  const requestLocation = () => {
    if (!('geolocation' in navigator)) {
      setLocationError('This browser cannot share your location. Enter a starting point instead.');
      setStep('manual');
      return;
    }
    setStep('locating');
    setLocationError(null);
    navigator.geolocation.getCurrentPosition(
      (position) =>
        onStart({
          kind: 'location',
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        }),
      (error) => {
        setLocationError(
          error.code === error.PERMISSION_DENIED
            ? 'Location is off for this site. Enter a starting point instead.'
            : 'We could not find your location. Enter a starting point instead.'
        );
        setStep('manual');
      },
      { enableHighAccuracy: false, timeout: LOCATION_TIMEOUT_MS, maximumAge: 60_000 }
    );
  };

  const submitManual = (e: React.FormEvent) => {
    e.preventDefault();
    const label = manualText.trim();
    if (label) onStart({ kind: 'manual', label });
  };

  return (
    <motion.div
      // Fade lives on the glass element itself so the blur renders from the first frame
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.14, ease: 'easeOut' }}
      role="dialog"
      aria-label={`Start route to ${lot.name}`}
      className="w-[360px] max-w-[calc(100vw-2rem)] p-4 rounded-[24px] bg-white/70 backdrop-blur-xl backdrop-saturate-[1.8] border border-white/60 shadow-2xl shadow-black/25 text-slate-900"
    >
      <div className="flex items-start gap-3">
        <div className="shrink-0 w-10 h-10 rounded-full bg-[#007aff] text-white flex items-center justify-center shadow-md shadow-black/20">
          <Navigation className="w-5 h-5" aria-hidden="true" />
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-[15px] font-bold leading-tight tracking-tight">
            {start ? 'Route ready to preview' : 'Start your route'}
          </h2>
          <p className="text-xs text-slate-600 mt-0.5 truncate">To {lot.name}</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close route"
          className="shrink-0 w-7 h-7 rounded-full bg-black/[0.07] hover:bg-black/[0.12] text-slate-600 flex items-center justify-center transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-900/30 cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {start ? (
        // Summary once a start is chosen
        <div className="mt-4 space-y-3">
          <ol className="rounded-2xl bg-black/[0.04] divide-y divide-black/5 text-[13px]">
            <li className="flex items-center gap-2 px-3 py-2.5">
              <LocateFixed className="w-4 h-4 text-[#007aff] shrink-0" aria-hidden="true" />
              <span className="truncate">
                {start.kind === 'location' ? 'From your current location' : `From ${start.label}`}
              </span>
            </li>
            <li className="flex items-center gap-2 px-3 py-2.5">
              <span className="w-4 h-4 rounded-full bg-[#007aff] text-white text-[9px] font-extrabold flex items-center justify-center shrink-0">
                P
              </span>
              <span className="truncate">Drive to {lot.name}</span>
            </li>
            <li className="flex items-center gap-2 px-3 py-2.5">
              <MapPin className="w-4 h-4 text-slate-500 shrink-0" aria-hidden="true" />
              <span className="truncate">
                Walk {walkMinutes} min to {destinationName}
              </span>
            </li>
          </ol>
          <p className="flex items-center justify-center gap-1.5 text-[12px] text-slate-600">
            <CheckCircle2 className="w-4 h-4 text-[#34c759]" aria-hidden="true" />
            Animated driving and walking routes come in a later version.
          </p>
        </div>
      ) : step === 'manual' ? (
        <form onSubmit={submitManual} className="mt-4 space-y-2.5">
          {locationError && (
            <p role="alert" className="px-3 py-2 rounded-xl bg-[#ff9f0a]/15 text-[12px] font-medium text-[#8a4b00]">
              {locationError}
            </p>
          )}
          <label htmlFor="route-start" className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
            Starting point
          </label>
          <input
            id="route-start"
            type="text"
            autoFocus
            value={manualText}
            onChange={(e) => setManualText(e.target.value)}
            placeholder="Address, neighborhood or freeway exit"
            className="w-full px-3 py-2.5 rounded-xl bg-white/70 border border-white/70 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/15"
          />
          <button
            type="submit"
            disabled={!manualText.trim()}
            className="w-full py-2.5 rounded-xl bg-[#007aff] hover:bg-[#0067d6] text-white text-[13px] font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
          >
            Use this starting point
          </button>
          {!locationError && (
            <button
              type="button"
              onClick={() => setStep('ask')}
              className="w-full py-1.5 text-[12px] font-semibold text-slate-600 hover:text-slate-900 cursor-pointer"
            >
              Back
            </button>
          )}
        </form>
      ) : (
        <div className="mt-4 space-y-2.5">
          <p className="text-[13px] text-slate-700 leading-snug">
            ParkSmart needs a starting point to route you to the structure. Your location is only
            used for this route.
          </p>
          <button
            type="button"
            onClick={requestLocation}
            disabled={step === 'locating'}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-[#007aff] hover:bg-[#0067d6] text-white text-[13px] font-semibold disabled:cursor-wait transition-colors cursor-pointer"
          >
            {step === 'locating' ? (
              <>
                <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                Waiting for your browser...
              </>
            ) : (
              <>
                <LocateFixed className="w-4 h-4" aria-hidden="true" /> Use my location
              </>
            )}
          </button>
          <button
            type="button"
            onClick={() => setStep('manual')}
            disabled={step === 'locating'}
            className="w-full py-2.5 rounded-xl bg-black/[0.06] hover:bg-black/[0.1] text-slate-800 text-[13px] font-semibold transition-colors cursor-pointer disabled:opacity-50"
          >
            Enter a starting point
          </button>
        </div>
      )}
    </motion.div>
  );
};
