/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Info } from 'lucide-react';

/**
 * Small, unobtrusive frosted glass pill positioned at top center of map
 * to clearly communicate that all numbers and predictions are sample prototype data.
 */
export const TopPrototypePill: React.FC = () => {
  return (
    <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 pointer-events-auto">
      <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/75 backdrop-blur-md border border-white/60 text-slate-700 text-xs font-medium shadow-sm shadow-slate-200/50 hover:bg-white/85 transition-colors">
        <Info className="w-3.5 h-3.5 text-blue-600 shrink-0" />
        <span>Prototype: sample data, not real predictions.</span>
      </div>
    </div>
  );
};
