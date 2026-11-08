/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { recordFeedback } from '../utils/spotFeedback.ts';

interface FoundSpotPromptProps {
  locationId: string;
  /** Arrival time the search was for. */
  arrival: Date | null;
  /** Navy first-choice card. */
  onDark?: boolean;
}

/**
 * "Did you find a spot?" shown once a spot is selected. Answers are kept in this browser
 * only (see utils/spotFeedback.ts) until the backend has somewhere to receive them.
 */
export const FoundSpotPrompt: React.FC<FoundSpotPromptProps> = ({ locationId, arrival, onDark = false }) => {
  const [answered, setAnswered] = useState<boolean | null>(null);
  const answer = (found: boolean) => (e: React.MouseEvent) => {
    e.stopPropagation();
    recordFeedback({ locationId, found, arrival: arrival ? arrival.toISOString() : null });
    setAnswered(found);
  };
  const muted = onDark ? 'text-white/70' : 'text-muted';
  const button = `px-3 py-1 rounded-md text-[12px] font-semibold border transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-sky/40 ${
    onDark ? 'border-white/40 text-white hover:bg-white/15' : 'border-navy/30 text-navy hover:bg-paper'
  }`;

  if (answered !== null) {
    return (
      <p role="status" className={`mt-2.5 text-[12px] ${muted}`}>
        Thanks, that helps us check our estimates.
      </p>
    );
  }
  return (
    <div className="mt-2.5 flex items-center justify-between gap-2" onClick={(e) => e.stopPropagation()}>
      <span className={`text-[12px] ${muted}`}>Did you find a spot here?</span>
      <span className="flex gap-1.5">
        <button type="button" onClick={answer(true)} className={button}>Yes</button>
        <button type="button" onClick={answer(false)} className={button}>No</button>
      </span>
    </div>
  );
};
