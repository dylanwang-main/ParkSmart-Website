/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import parkSmartLogoHd from '../assets/parksmart-logo-hd.png';

/** How long the intro plays before the screen lifts away. */
const PLAY_MS = 2800;
/** Must match the lift transition in index.css. */
const LEAVE_MS = 700;

interface LandingIntroProps {
  /** Called once the intro screen is fully gone. */
  onDone: () => void;
}

/**
 * Full-screen opening moment: a stall is painted, the logo parks in it, then the
 * screen lifts away to reveal the hero (where the car parks next).
 */
export const LandingIntro: React.FC<LandingIntroProps> = ({ onDone }) => {
  const [leaving, setLeaving] = useState(false);
  const leavingRef = useRef(false);

  const leave = useCallback(() => {
    if (leavingRef.current) return;
    leavingRef.current = true;
    setLeaving(true);
  }, []);

  useEffect(() => {
    const playTimer = window.setTimeout(leave, PLAY_MS);
    return () => window.clearTimeout(playTimer);
  }, [leave]);

  useEffect(() => {
    if (!leaving) return;
    const doneTimer = window.setTimeout(onDone, LEAVE_MS);
    return () => window.clearTimeout(doneTimer);
  }, [leaving, onDone]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') leave();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [leave]);

  return (
    <div
      className={`lp-intro${leaving ? ' lp-intro--leaving' : ''}`}
      role="dialog"
      aria-label="ParkSmart intro"
      onClick={leave}
    >
      <div className="lp-intro-center">
        <div className="lp-intro-stage" aria-hidden="true">
          <svg className="lp-intro-stall" viewBox="0 0 200 220" preserveAspectRatio="none">
            <path
              className="lp-intro-stall-line"
              d="M4 220 V4 H196 V220"
              fill="none"
              stroke="#FFCD00"
              strokeWidth="6"
              strokeLinecap="square"
              pathLength={1}
              vectorEffect="non-scaling-stroke"
            />
          </svg>
          <img src={parkSmartLogoHd} alt="" className="lp-intro-logo" width={132} height={132} />
        </div>
        <p className="lp-intro-name">ParkSmart</p>
        <p className="lp-intro-tagline">Know where to park before you get to campus.</p>
      </div>

      <button
        type="button"
        className="lp-intro-skip"
        onClick={(e) => {
          e.stopPropagation();
          leave();
        }}
      >
        Skip intro
      </button>
    </div>
  );
};
