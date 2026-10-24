/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { CheckCircle2, Navigation } from 'lucide-react';
import { googleMapsDirectionsUrl } from '../utils/mapsLink.ts';

interface SpotActionsProps {
  isConfirmed: boolean;
  disabled?: boolean;
  /** Visual weight: 'primary' (blue, lot card) or 'subtle' (grey, result cards). */
  tone: 'primary' | 'subtle';
  onConfirm: () => void;
  /** Where "Open in Google Maps" navigates to. */
  lot: { latitude: number; longitude: number };
}

/**
 * Two-step choice: "Select this spot" confirms the lot, then "Open in Google Maps" hands
 * off to Google Maps for turn-by-turn directions. "Your spot" undoes the confirmation.
 */
export const SpotActions: React.FC<SpotActionsProps> = ({
  isConfirmed,
  disabled = false,
  tone,
  onConfirm,
  lot,
}) => {
  const stop = (fn: () => void) => (e: React.MouseEvent) => {
    e.stopPropagation();
    fn();
  };
  const base =
    'flex items-center justify-center gap-1.5 py-2 rounded-xl text-[13px] font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-900/30 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50';

  if (!isConfirmed) {
    return (
      <button
        type="button"
        disabled={disabled}
        onClick={stop(onConfirm)}
        className={`w-full ${base} ${
          tone === 'primary'
            ? 'bg-[#007aff] text-white hover:bg-[#0067d6]'
            : 'bg-black/[0.06] text-slate-800 hover:bg-black/[0.1]'
        }`}
      >
        <CheckCircle2 className="w-4 h-4" aria-hidden="true" /> Select this spot
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        disabled={disabled}
        onClick={stop(onConfirm)}
        aria-label="Change your selected spot"
        className={`${base} px-3 bg-[#34c759]/15 text-[#1f7a37] hover:bg-[#34c759]/25`}
      >
        <CheckCircle2 className="w-4 h-4" aria-hidden="true" /> Your spot
      </button>
      <a
        href={googleMapsDirectionsUrl(lot.latitude, lot.longitude)}
        target="_blank"
        rel="noopener noreferrer"
        aria-disabled={disabled}
        onClick={(e) => {
          e.stopPropagation();
          if (disabled) e.preventDefault();
        }}
        className={`flex-1 ${base} bg-[#007aff] text-white hover:bg-[#0067d6] ${disabled ? 'pointer-events-none opacity-50' : ''}`}
      >
        <Navigation className="w-4 h-4" aria-hidden="true" /> Open in Google Maps
      </a>
    </div>
  );
};
