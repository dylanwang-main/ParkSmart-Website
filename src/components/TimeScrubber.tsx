/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef } from 'react';
import { Pause, Play } from 'lucide-react';

/** Scrubber range, in minutes after midnight (12:00 AM to 11:45 PM), so any arrival time shows truthfully. */
export const SCRUB_MIN = 0;
export const SCRUB_MAX = 23 * 60 + 45;
const SCRUB_STEP = 15;
/** Play sweeps the whole range in this long. */
const PLAY_DURATION_MS = 8000;

interface TimeScrubberProps {
  /** Day being previewed (time part ignored). */
  day: Date;
  /** Previewed time, minutes after midnight. */
  minutes: number;
  onMinutesChange: (minutes: number) => void;
  isPlaying: boolean;
  onPlayingChange: (playing: boolean) => void;
  /** Whether the previewed time differs from the arrival time in the form. */
  differsFromArrival: boolean;
  /** Copies the previewed time into the arrival time. */
  onUseTime: () => void;
}

/** "10:30 AM" for minutes after midnight. */
export function formatMinutes(minutes: number): string {
  const d = new Date(2000, 0, 1, Math.floor(minutes / 60), minutes % 60);
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

/**
 * Timeline for previewing how full campus gets through the day. Dragging or playing it
 * recolors every pin live (see MapContainer's availabilityTime). It never changes the
 * search on its own; "Use this time" copies the time into the form.
 */
export const TimeScrubber: React.FC<TimeScrubberProps> = ({
  day,
  minutes,
  onMinutesChange,
  isPlaying,
  onPlayingChange,
  differsFromArrival,
  onUseTime,
}) => {
  // Play: sweep from the current position (or the start) to the end, then stop
  const frameRef = useRef<number | null>(null);
  useEffect(() => {
    if (!isPlaying) return;
    const startMinutes = minutes >= SCRUB_MAX ? SCRUB_MIN : minutes;
    const startTime = performance.now();
    const span = SCRUB_MAX - SCRUB_MIN;
    const tick = (now: number) => {
      const progress = (now - startTime) / PLAY_DURATION_MS;
      const next = startMinutes + progress * span;
      if (next >= SCRUB_MAX) {
        onMinutesChange(SCRUB_MAX);
        onPlayingChange(false);
        return;
      }
      onMinutesChange(Math.round(next / SCRUB_STEP) * SCRUB_STEP);
      frameRef.current = requestAnimationFrame(tick);
    };
    frameRef.current = requestAnimationFrame(tick);
    return () => {
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    };
    // Only restart when play is toggled, not on every minute update
  }, [isPlaying]);

  const weekday = day.toLocaleDateString('en-US', { weekday: 'short' });
  const fillPercent = ((minutes - SCRUB_MIN) / (SCRUB_MAX - SCRUB_MIN)) * 100;

  return (
    <div className="flex items-center gap-3 max-sm:w-full pl-1.5 pr-3 py-1.5 rounded-2xl bg-white/60 backdrop-blur-xl backdrop-saturate-150 border border-white/60 shadow-lg shadow-black/15 text-slate-900">
      <button
        type="button"
        onClick={() => onPlayingChange(!isPlaying)}
        aria-label={isPlaying ? 'Pause timeline' : 'Play timeline: watch campus fill up'}
        className="shrink-0 w-9 h-9 rounded-full bg-slate-900 text-white flex items-center justify-center hover:bg-slate-800 active:scale-95 transition-transform focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-900/30 cursor-pointer"
      >
        {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 translate-x-px" />}
      </button>

      <div className="w-[110px] max-sm:w-[100px] shrink-0 leading-tight whitespace-nowrap">
        <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-600">Campus at</div>
        <div className="text-[13px] font-bold tabular-nums">
          {weekday} {formatMinutes(minutes)}
        </div>
      </div>

      <input
        type="range"
        min={SCRUB_MIN}
        max={SCRUB_MAX}
        step={SCRUB_STEP}
        value={minutes}
        onChange={(e) => {
          if (isPlaying) onPlayingChange(false);
          onMinutesChange(Number(e.target.value));
        }}
        aria-label="Preview time of day"
        aria-valuetext={`${weekday} ${formatMinutes(minutes)}`}
        className="ps-scrubber w-[220px] max-sm:w-auto max-sm:flex-1 max-sm:min-w-0"
        style={{ '--fill': `${fillPercent}%` } as React.CSSProperties}
      />

      {differsFromArrival && !isPlaying && (
        <button
          type="button"
          onClick={onUseTime}
          className="shrink-0 px-2.5 py-1 rounded-lg bg-black/[0.07] hover:bg-black/[0.12] text-[11px] font-semibold text-slate-800 transition-colors cursor-pointer"
        >
          Use this time
        </button>
      )}
    </div>
  );
};
