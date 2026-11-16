/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import parkSmartLogoHd from '../assets/parksmart-logo-hd.png';

/** Must match the lift transition in index.css. */
const LEAVE_MS = 700;

/** Scene is drawn in a 1200 x 560 box. */
const STALL_TOP = 250;
const STALL_BOTTOM = 440;
const CAR_PARK_Y = 330;
const STALL_CENTERS = [200, 360, 520, 680, 840, 1000] as const;
const FIRST_CHOICE_X = 520;
const BACKUP_X = 680;
const PARKED_CARS = [
  { x: 200, tint: '#2C4468' },
  { x: 360, tint: '#3A5679' },
  { x: 840, tint: '#4A6690' },
  { x: 1000, tint: '#2C4468' },
] as const;

/** Where the arriving car drives: along the lower lane, then turns up into the first-choice stall. */
const DRIVE_PATH = `M -900 526 H 440 Q ${FIRST_CHOICE_X} 526 ${FIRST_CHOICE_X} 446 V ${CAR_PARK_Y}`;
/** Walking route from the stall to the destination pin. */
const WALK_PATH = `M ${FIRST_CHOICE_X} 206 C ${FIRST_CHOICE_X} 150 700 190 760 136`;

const PIN_PATH = 'M0 0 C -14 -22 -22 -30 -22 -42 A 22 22 0 1 1 22 -42 C 22 -30 14 -22 0 0 Z';

/** Simplified top-down car, drawn at the origin facing right (+x). */
const CarShape: React.FC<{ body: string; glass: string }> = ({ body, glass }) => (
  <>
    <rect x={-46} y={-28} width={92} height={56} rx={16} fill={body} />
    <rect x={6} y={-20} width={24} height={40} rx={6} fill={glass} />
    <rect x={-34} y={-17} width={16} height={34} rx={5} fill={glass} />
  </>
);

interface LandingIntroProps {
  /** Called once the intro screen is fully gone. */
  onDone: () => void;
}

/**
 * Opening scene that waits for the visitor: a car drives in, parks in the first-choice
 * stall, and the route continues on foot to the destination. The screen only lifts away
 * when the visitor presses the button.
 */
export const LandingIntro: React.FC<LandingIntroProps> = ({ onDone }) => {
  const [leaving, setLeaving] = useState(false);
  const leavingRef = useRef(false);
  const [reduced] = useState(() => {
    try {
      return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    } catch {
      return false;
    }
  });

  const enter = useCallback(() => {
    if (leavingRef.current) return;
    leavingRef.current = true;
    setLeaving(true);
  }, []);

  useEffect(() => {
    if (!leaving) return;
    const doneTimer = window.setTimeout(onDone, LEAVE_MS);
    return () => window.clearTimeout(doneTimer);
  }, [leaving, onDone]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter') enter();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [enter]);

  return (
    <div
      className={`lp-intro${leaving ? ' lp-intro--leaving' : ''}`}
      role="dialog"
      aria-label="ParkSmart intro"
    >
      <span className="lp-wordmark lp-intro-brand">
        <img src={parkSmartLogoHd} alt="" className="lp-wordmark-logo" width={52} height={52} />
        ParkSmart
      </span>

      <div className="lp-intro-inner">
        <h1 className="lp-intro-title">
          <span className="lp-fx" style={{ ['--d' as string]: '1.0s' }}>Your car.</span>{' '}
          <span className="lp-fx" style={{ ['--d' as string]: '4.3s' }}>Your spot.</span>{' '}
          <span className="lp-fx" style={{ ['--d' as string]: '5.8s' }}>Your destination.</span>
        </h1>

        <svg
          className="lp-scene"
          viewBox="0 0 1200 560"
          role="img"
          aria-label="A car drives into a parking lot, parks in the first-choice stall, and the route continues on foot to a destination."
        >
          {/* Road */}
          <rect x={-3000} y={STALL_BOTTOM} width={7200} height={120} fill="#1F3556" />
          <line
            x1={-3000}
            y1={500}
            x2={4200}
            y2={500}
            stroke="#F7F8FA"
            strokeOpacity={0.55}
            strokeWidth={4}
            strokeDasharray="18 16"
          />

          {/* First-choice stall fill */}
          <rect
            className="lp-fx"
            style={{ ['--d' as string]: '4.3s' }}
            x={FIRST_CHOICE_X - 80}
            y={STALL_TOP}
            width={160}
            height={STALL_BOTTOM - STALL_TOP}
            fill="#FFCD00"
            fillOpacity={0.2}
          />

          {/* Stall lines (the backup stall is open-sided and dashed on top) */}
          <path
            d={STALL_CENTERS.filter((cx) => cx !== BACKUP_X)
              .map((cx) => `M ${cx - 80} ${STALL_BOTTOM} V ${STALL_TOP} H ${cx + 80} V ${STALL_BOTTOM}`)
              .join(' ')}
            fill="none"
            stroke="#F7F8FA"
            strokeOpacity={0.85}
            strokeWidth={4}
            strokeLinecap="square"
          />
          <path
            d={`M ${BACKUP_X - 80} ${STALL_TOP} H ${BACKUP_X + 80}`}
            fill="none"
            stroke="#F7F8FA"
            strokeOpacity={0.9}
            strokeWidth={4}
            strokeDasharray="10 8"
          />
          <path
            d={`M ${FIRST_CHOICE_X - 80} ${STALL_BOTTOM} V ${STALL_TOP} H ${FIRST_CHOICE_X + 80} V ${STALL_BOTTOM}`}
            fill="none"
            stroke="#FFCD00"
            strokeWidth={6}
            strokeLinecap="square"
          />

          {/* Wheel stops */}
          {STALL_CENTERS.map((cx) => (
            <rect
              key={cx}
              x={cx - 42}
              y={STALL_TOP + 12}
              width={84}
              height={8}
              rx={3}
              fill={cx === FIRST_CHOICE_X ? '#FFCD00' : '#F7F8FA'}
              fillOpacity={cx === FIRST_CHOICE_X ? 0.85 : 0.5}
            />
          ))}

          {/* Cars already parked */}
          {PARKED_CARS.map((car) => (
            <g key={car.x} transform={`translate(${car.x} ${CAR_PARK_Y}) rotate(-90)`}>
              <CarShape body={car.tint} glass="#182B49" />
            </g>
          ))}

          {/* Destination pins */}
          <g className="lp-fx" style={{ ['--d' as string]: '0.4s' }}>
            <g transform="translate(240 128)">
              <path d={PIN_PATH} fill="#F7F8FA" fillOpacity={0.35} />
              <circle cx={0} cy={-42} r={8} fill="#182B49" />
            </g>
            <text className="lp-scene-label" x={240} y={160} textAnchor="middle">
              Library
            </text>
            <g transform="translate(1010 118)">
              <path d={PIN_PATH} fill="#F7F8FA" fillOpacity={0.35} />
              <circle cx={0} cy={-42} r={8} fill="#182B49" />
            </g>
            <text className="lp-scene-label" x={1010} y={150} textAnchor="middle">
              Gym
            </text>
            <g transform="translate(760 136)">
              <path d={PIN_PATH} fill="#F7F8FA" fillOpacity={0.35} />
              <circle cx={0} cy={-42} r={8} fill="#182B49" />
            </g>
          </g>

          {/* Walking route (revealed left to right with a mask) */}
          <mask id="lp-walk-mask" maskUnits="userSpaceOnUse" x={0} y={0} width={1200} height={560}>
            <path
              className="lp-draw"
              d={WALK_PATH}
              fill="none"
              stroke="#fff"
              strokeWidth={14}
              pathLength={1}
            />
          </mask>
          <path
            d={WALK_PATH}
            fill="none"
            stroke="#FFCD00"
            strokeWidth={5}
            strokeLinecap="round"
            strokeDasharray="1 11"
            mask="url(#lp-walk-mask)"
          />

          {/* Chosen destination lights up */}
          <g className="lp-fx" style={{ ['--d' as string]: '5.8s' }}>
            <circle className="lp-pulse" cx={760} cy={94} r={22} fill="none" stroke="#FFCD00" strokeWidth={3} />
            <g transform="translate(760 136)">
              <path d={PIN_PATH} fill="#FFCD00" />
              <circle cx={0} cy={-42} r={8} fill="#182B49" />
            </g>
            <text className="lp-scene-label lp-scene-label--strong" x={804} y={86}>
              Your destination
            </text>
          </g>

          {/* Plates */}
          <g className="lp-fx" style={{ ['--d' as string]: '4.3s' }}>
            <rect x={FIRST_CHOICE_X - 58} y={212} width={116} height={28} rx={5} fill="#FFCD00" />
            <text className="lp-scene-plate" x={FIRST_CHOICE_X} y={231} textAnchor="middle">
              First choice
            </text>
          </g>
          <g className="lp-fx" style={{ ['--d' as string]: '4.7s' }}>
            <rect x={BACKUP_X - 40} y={212} width={80} height={28} rx={5} fill="#F7F8FA" />
            <text className="lp-scene-plate" x={BACKUP_X} y={231} textAnchor="middle">
              Backup
            </text>
          </g>

          {/* The arriving car */}
          {reduced ? (
            <g transform={`translate(${FIRST_CHOICE_X} ${CAR_PARK_Y}) rotate(-90)`}>
              <CarShape body="#F7F8FA" glass="#182B49" />
            </g>
          ) : (
            <g>
              <CarShape body="#F7F8FA" glass="#182B49" />
              <animateMotion
                path={DRIVE_PATH}
                dur="3.4s"
                begin="0.9s"
                fill="freeze"
                rotate="auto"
                calcMode="spline"
                keyTimes="0;1"
                keyPoints="0;1"
                keySplines="0.45 0 0.2 1"
              />
            </g>
          )}
        </svg>

        <button
          type="button"
          className="lp-btn lp-btn--yellow lp-intro-cta lp-fx"
          style={{ ['--d' as string]: '1.2s' }}
          onClick={enter}
        >
          Enter ParkSmart
        </button>
      </div>
    </div>
  );
};
