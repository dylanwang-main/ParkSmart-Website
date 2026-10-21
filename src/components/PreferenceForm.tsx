/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { Search, Calendar, Clock, ChevronDown, Check } from 'lucide-react';
import { SAMPLE_DESTINATIONS, PERMIT_OPTIONS } from '../constants.ts';
import { ParkingPlannerRequest, PermitType, CampusDestination } from '../types.ts';

interface PreferenceFormProps {
  formData: ParkingPlannerRequest;
  onChange: (newData: Partial<ParkingPlannerRequest>) => void;
  onSubmit: (e: React.FormEvent) => void;
  isLoading: boolean;
}

/**
 * Clean floating preference form with searchable destination dropdown,
 * date/time inputs, permit pills, and primary submission action.
 */
export const PreferenceForm: React.FC<PreferenceFormProps> = ({
  formData,
  onChange,
  onSubmit,
  isLoading,
}) => {
  const [isDestinationOpen, setIsDestinationOpen] = useState(false);
  const [destinationSearch, setDestinationSearch] = useState('');
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  const selectedDestination =
    SAMPLE_DESTINATIONS.find((d) => d.id === formData.destinationId) ||
    SAMPLE_DESTINATIONS[0];

  // Filter campus destinations based on search query
  const filteredDestinations = SAMPLE_DESTINATIONS.filter(
    (dest) =>
      dest.name.toLowerCase().includes(destinationSearch.toLowerCase()) ||
      dest.area.toLowerCase().includes(destinationSearch.toLowerCase())
  );

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDestinationOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectDestination = (dest: CampusDestination) => {
    onChange({ destinationId: dest.id });
    setDestinationSearch('');
    setIsDestinationOpen(false);
  };

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {/* Campus Destination Field */}
      <div className="relative" ref={dropdownRef}>
        <label
          id="destination-label"
          className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5"
        >
          Destination
        </label>
        <button
          type="button"
          aria-labelledby="destination-label"
          aria-haspopup="listbox"
          aria-expanded={isDestinationOpen}
          onClick={() => setIsDestinationOpen(!isDestinationOpen)}
          className="w-full text-left px-3.5 py-2.5 rounded-xl bg-slate-50/80 border border-slate-200/90 hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-600 transition-all duration-150 flex items-center justify-between shadow-xs group"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <Search className="w-4 h-4 text-slate-400 group-hover:text-slate-600 shrink-0 transition-colors" />
            <div className="truncate">
              <span className="text-sm font-medium text-slate-800">
                {selectedDestination.name}
              </span>
              <span className="text-xs text-slate-500 ml-1.5 font-normal">
                ({selectedDestination.area})
              </span>
            </div>
          </div>
          <ChevronDown
            className={`w-4 h-4 text-slate-400 transition-transform duration-200 shrink-0 ${
              isDestinationOpen ? 'rotate-180 text-blue-600' : ''
            }`}
          />
        </button>

        {/* Searchable Dropdown Popup */}
        {isDestinationOpen && (
          <div className="absolute top-full left-0 right-0 mt-1.5 p-2 bg-white/95 backdrop-blur-xl rounded-xl border border-slate-200/90 shadow-xl z-50 animate-in fade-in zoom-in-95 duration-150">
            <div className="relative mb-2">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={destinationSearch}
                onChange={(e) => setDestinationSearch(e.target.value)}
                placeholder="Search campus destinations..."
                autoFocus
                className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg bg-slate-100/80 border border-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500 text-slate-800"
              />
            </div>
            <ul className="max-h-48 overflow-y-auto space-y-1 py-0.5 text-sm" role="listbox">
              {filteredDestinations.length > 0 ? (
                filteredDestinations.map((dest) => {
                  const isCurrent = dest.id === formData.destinationId;
                  return (
                    <li
                      key={dest.id}
                      role="option"
                      aria-selected={isCurrent}
                      onClick={() => handleSelectDestination(dest)}
                      className={`px-3 py-2 rounded-lg cursor-pointer flex items-center justify-between transition-colors text-xs ${
                        isCurrent
                          ? 'bg-blue-50 text-blue-700 font-medium'
                          : 'hover:bg-slate-100 text-slate-700'
                      }`}
                    >
                      <div>
                        <span className="font-semibold">{dest.name}</span>
                        <span className="text-slate-400 ml-1.5 font-normal">
                          {dest.area}
                        </span>
                      </div>
                      {isCurrent && <Check className="w-3.5 h-3.5 text-blue-600" />}
                    </li>
                  );
                })
              ) : (
                <li className="px-3 py-3 text-xs text-slate-500 text-center">
                  No matching destinations
                </li>
              )}
            </ul>
          </div>
        )}
      </div>

      {/* Arrival Date and Time Grid */}
      <div className="grid grid-cols-2 gap-2.5">
        <div>
          <label
            htmlFor="arrival-date"
            className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5"
          >
            Arrival date
          </label>
          <div className="relative">
            <input
              id="arrival-date"
              type="date"
              value={formData.arrivalDate}
              onChange={(e) => onChange({ arrivalDate: e.target.value })}
              className="w-full px-2.5 py-2 rounded-xl bg-slate-50/80 border border-slate-200/90 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-600 transition-all shadow-xs"
            />
          </div>
        </div>

        <div>
          <label
            htmlFor="arrival-time"
            className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5"
          >
            Arrival time
          </label>
          <div className="relative">
            <input
              id="arrival-time"
              type="time"
              value={formData.arrivalTime}
              onChange={(e) => onChange({ arrivalTime: e.target.value })}
              className="w-full px-2.5 py-2 rounded-xl bg-slate-50/80 border border-slate-200/90 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-600 transition-all shadow-xs"
            />
          </div>
        </div>
      </div>

      {/* Permit Type Pill Selector */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600">
            Permit type
          </label>
          <span className="text-[11px] text-slate-400">
            {PERMIT_OPTIONS.find((p) => p.type === formData.permitType)?.description}
          </span>
        </div>
        <div
          role="radiogroup"
          aria-label="Permit type"
          className="grid grid-cols-6 gap-1 p-1 bg-slate-100/80 rounded-xl border border-slate-200/80"
        >
          {PERMIT_OPTIONS.map((permit) => {
            const isSelected = formData.permitType === permit.type;
            return (
              <button
                key={permit.type}
                type="button"
                role="radio"
                aria-checked={isSelected}
                title={`${permit.type}: ${permit.description}`}
                onClick={() => onChange({ permitType: permit.type })}
                className={`py-1.5 text-xs font-semibold rounded-lg transition-all duration-150 text-center ${
                  isSelected
                    ? 'bg-blue-600 text-white shadow-xs scale-[1.02]'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                }`}
              >
                {permit.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Primary Action Button */}
      <button
        type="submit"
        disabled={isLoading}
        className="w-full py-2.5 px-4 rounded-xl font-semibold text-sm text-white bg-blue-600 hover:bg-blue-700 active:scale-[0.99] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all duration-150 shadow-md shadow-blue-500/20 disabled:opacity-75 disabled:cursor-wait flex items-center justify-center gap-2 cursor-pointer"
      >
        {isLoading ? (
          <>
            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            <span>Finding parking options...</span>
          </>
        ) : (
          <span>Find parking</span>
        )}
      </button>
    </form>
  );
};
