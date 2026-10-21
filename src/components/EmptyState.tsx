/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { SearchX } from 'lucide-react';

interface EmptyStateProps {
  onResetFilters?: () => void;
}

/**
 * Friendly notification when no parking lots match selected criteria.
 */
export const EmptyState: React.FC<EmptyStateProps> = ({ onResetFilters }) => {
  return (
    <div className="p-5 text-center bg-white/40 rounded-2xl border border-white/50 space-y-3">
      <div className="w-10 h-10 mx-auto rounded-full bg-black/5 flex items-center justify-center text-slate-400">
        <SearchX className="w-5 h-5" />
      </div>
      <div>
        <h4 className="text-sm font-bold text-slate-800">
          No eligible parking found for these settings
        </h4>
        <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto leading-relaxed">
          Try choosing a different permit type or switching to another campus destination.
        </p>
      </div>
      {onResetFilters && (
        <button
          type="button"
          onClick={onResetFilters}
          className="text-xs font-semibold text-slate-900 hover:text-slate-700 underline underline-offset-4 focus:outline-none cursor-pointer"
        >
          Reset to default permit (S)
        </button>
      )}
    </div>
  );
};
