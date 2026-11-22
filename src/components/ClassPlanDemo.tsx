/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Check, MousePointerClick } from 'lucide-react';
import { ARRIVE_BEFORE_CLASS_MINUTES, formatClock } from '../utils/classTime';
import { prefersReducedMotion, useInView } from './LotParts';

/** Example classes for the demo. The places and times are made up; the 20-minute rule is the real one. */
const CLASSES = [
  { code: 'MATH 20C', room: 'WLH 2001', building: 'Warren Lecture Hall', start: 9 * 60, first: 'Lot P503', firstWalk: 5, backup: 'Lot P510', backupWalk: 7 },
  { code: 'CSE 100', room: 'CENTR 115', building: 'Center Hall', start: 11 * 60, first: 'Hopkins Parking Structure', firstWalk: 6, backup: 'Gilman Parking Structure', backupWalk: 8 },
  { code: 'PHYS 2A', room: 'YORK 2722', building: 'York Hall', start: 14 * 60, first: 'Pangea Parking Structure', firstWalk: 5, backup: 'Scholars Parking Structure', backupWalk: 8 },
] as const;

/** How long the demo shows the arrival time before the result appears. */
const RESULT_DELAY_MS = 800;
/** The class the demo taps on its own once it scrolls into view. */
const AUTO_PICK = 1;

type Stage = 'idle' | 'arrival' | 'result';

/**
 * Screen 3's picture: an imported schedule where one tap on a class sets the arrival 20 minutes
 * before it starts and shows a first choice and a backup near that building. It taps a class by
 * itself when it scrolls into view, and any class can be tapped. Example data only.
 */
export const ClassPlanDemo: React.FC = () => {
  const [ref, seen] = useInView<HTMLDivElement>();
  const [picked, setPicked] = React.useState<number | null>(null);
  const [stage, setStage] = React.useState<Stage>('idle');
  const touched = React.useRef(false);
  const timer = React.useRef<number | null>(null);

  const pick = React.useCallback((index: number) => {
    if (timer.current !== null) window.clearTimeout(timer.current);
    setPicked(index);
    if (prefersReducedMotion()) {
      setStage('result');
      return;
    }
    setStage('arrival');
    timer.current = window.setTimeout(() => setStage('result'), RESULT_DELAY_MS);
  }, []);

  React.useEffect(() => {
    if (!seen) return;
    const auto = window.setTimeout(() => {
      if (!touched.current) pick(AUTO_PICK);
    }, prefersReducedMotion() ? 0 : 900);
    return () => window.clearTimeout(auto);
  }, [seen, pick]);

  React.useEffect(
    () => () => {
      if (timer.current !== null) window.clearTimeout(timer.current);
    },
    []
  );

  const chosen = picked === null ? null : CLASSES[picked];

  return (
    <div className="cp" ref={ref}>
      <div className="cp-card" role="group" aria-label="Example class schedule and result">
        <p className="cp-head">
          <strong>Your classes</strong>
          <span>Mon, Nov 23</span>
        </p>
        <ul className="cp-list">
          {CLASSES.map((c, i) => (
            <li key={c.code}>
              <button
                type="button"
                className={`cp-class${picked === i ? ' cp-class--picked' : ''}`}
                aria-pressed={picked === i}
                onClick={() => {
                  touched.current = true;
                  pick(i);
                }}
              >
                <span className="cp-time">{formatClock(c.start)}</span>
                <span className="cp-title">
                  <strong>{c.code}</strong>
                  <span>{c.room}</span>
                </span>
                {picked === i ? (
                  <Check className="cp-icon" aria-hidden="true" />
                ) : (
                  <MousePointerClick className="cp-icon cp-icon--hint" aria-hidden="true" />
                )}
              </button>
            </li>
          ))}
        </ul>

        <div className="cp-out" aria-live="polite">
          {chosen === null || stage === 'idle' ? (
            <p className="cp-cue">Tap a class</p>
          ) : (
            <>
              <p className="cp-arrive">
                Arrive <strong>{formatClock(chosen.start - ARRIVE_BEFORE_CLASS_MINUTES)}</strong>, {ARRIVE_BEFORE_CLASS_MINUTES} min before class
              </p>
              {stage === 'result' && (
                <div className="cp-result">
                  <p className="cp-first">
                    <span className="cp-tag">First choice</span>
                    <strong>{chosen.first}</strong>
                    <span>
                      {chosen.firstWalk} min walk to {chosen.building}
                    </span>
                  </p>
                  <p className="cp-backup">
                    <span className="cp-tag cp-tag--quiet">Backup</span>
                    <strong>{chosen.backup}</strong>
                    <span>{chosen.backupWalk} min walk</span>
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
