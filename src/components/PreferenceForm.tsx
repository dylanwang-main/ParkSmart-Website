/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Search, ChevronDown, Check, MapPin, Star, X } from 'lucide-react';
import { motion } from 'motion/react';
import { PERMIT_OPTIONS } from '../constants.ts';
import { POPULAR_DESTINATIONS, findDestination, searchDestinations } from '../data/destinations.ts';
import { ALL_PARKING } from '../data/parkingLots.ts';
import { ParkingPlannerRequest, CampusDestination, ParkingLot } from '../types.ts';

interface PreferenceFormProps {
  formData: ParkingPlannerRequest;
  onChange: (newData: Partial<ParkingPlannerRequest>) => void;
  onSubmit: (e: React.FormEvent) => void;
  isLoading: boolean;
  /** Problem with the arrival date/time, shown under the fields; blocks searching. */
  arrivalError: string | null;
  /** Resets the arrival date/time to right now. */
  onSetArrivalNow: () => void;
  /** "Find parking", or "Update results" when the shown results are stale. */
  submitLabel: string;
  /** A parking lot picked from the search box: show it on the map (not a destination). */
  onSelectParking: (locationId: string) => void;
}

/** One row in the destination dropdown: a place to go, or a lot to look at. */
type Option =
  | { kind: 'place'; destination: CampusDestination; matchedOn?: string }
  | { kind: 'parking'; lot: ParkingLot };

const MAX_PARKING_MATCHES = 6;

/** Parking lots whose name or P-number matches the query ("gilman", "p406", "406"). */
function searchParking(query: string): ParkingLot[] {
  const q = query.trim().toLowerCase();
  if (q.length < 2) return [];
  return ALL_PARKING.filter((lot) => {
    const name = lot.name.toLowerCase();
    return name.includes(q) || (/^\d+$/.test(q) && name.includes(`p${q.padStart(3, '0')}`));
  })
    .sort((a, b) => Number(b.name.toLowerCase().startsWith(q)) - Number(a.name.toLowerCase().startsWith(q)))
    .slice(0, MAX_PARKING_MATCHES);
}

/** Small section heading inside the dropdown. */
const SectionLabel: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <li role="presentation" className="px-3 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
    {children}
  </li>
);

/**
 * Clean floating preference form with searchable destination dropdown,
 * date/time inputs, permit pills, and primary submission action.
 */
export const PreferenceForm: React.FC<PreferenceFormProps> = ({
  formData,
  onChange,
  onSubmit,
  isLoading,
  arrivalError,
  onSetArrivalNow,
  submitLabel,
  onSelectParking,
}) => {
  const [isDestinationOpen, setIsDestinationOpen] = useState(false);
  const [destinationSearch, setDestinationSearch] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const dropdownRef = useRef<HTMLDivElement | null>(null);
  const listRef = useRef<HTMLUListElement | null>(null);

  // No destination until the user picks one (or drops a pin on the map)
  const selectedDestination = findDestination(formData.destinationId) ?? null;
  const query = destinationSearch.trim();

  // Before typing: popular places. While typing: matching places and parking, with
  // parking first when the query is clearly a lot ("Gilman", "P406")
  const { places, parking } = useMemo(() => {
    if (!query) {
      return { places: POPULAR_DESTINATIONS.map((d): Option => ({ kind: 'place', destination: d })), parking: [] as Option[] };
    }
    return {
      places: searchDestinations(query).map((m): Option => ({ kind: 'place', destination: m.destination, matchedOn: m.matchedOn })),
      parking: searchParking(query).map((lot): Option => ({ kind: 'parking', lot })),
    };
  }, [query]);
  const parkingFirst =
    parking.length > 0 &&
    (places.length === 0 || (parking[0].kind === 'parking' && parking[0].lot.name.toLowerCase().startsWith(query.toLowerCase())));
  const sections: Array<{ label: string; options: Option[] }> = (
    parkingFirst
      ? [{ label: 'Parking', options: parking }, { label: 'Places', options: places }]
      : [{ label: query ? 'Places' : 'Popular', options: places }, { label: 'Parking', options: parking }]
  ).filter((section) => section.options.length > 0);
  const flatOptions = sections.flatMap((section) => section.options);

  // Highlight the best match whenever the results change
  useEffect(() => setActiveIndex(0), [query]);

  // Keep the highlighted row in view while arrowing through the list
  useEffect(() => {
    listRef.current?.querySelector(`[data-index="${activeIndex}"]`)?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex]);

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

  const closeDropdown = () => {
    setDestinationSearch('');
    setIsDestinationOpen(false);
  };

  const chooseOption = (option: Option) => {
    if (option.kind === 'place') onChange({ destinationId: option.destination.id });
    else onSelectParking(option.lot.locationId);
    closeDropdown();
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((i) => Math.min(flatOptions.length - 1, i + 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((i) => Math.max(0, i - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const option = flatOptions[activeIndex];
      if (option) chooseOption(option);
    } else if (e.key === 'Escape') {
      e.stopPropagation();
      closeDropdown();
    }
  };

  let rowIndex = -1;

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {/* Campus Destination Field */}
      <div className="relative" ref={dropdownRef}>
        <label
          id="destination-label"
          className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5"
        >
          Destination
        </label>
        <button
          type="button"
          aria-labelledby="destination-label"
          aria-haspopup="listbox"
          aria-expanded={isDestinationOpen}
          onClick={() => setIsDestinationOpen(!isDestinationOpen)}
          className="w-full text-left px-3.5 py-2.5 rounded-xl bg-white/50 border border-white/60 hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-900/15 focus:border-white transition-all duration-150 flex items-center justify-between shadow-xs group"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            {selectedDestination?.isPin ? (
              <MapPin className="w-4 h-4 text-slate-700 shrink-0" />
            ) : (
              <Search className="w-4 h-4 text-slate-400 group-hover:text-slate-600 shrink-0 transition-colors" />
            )}
            <div className="truncate">
              {selectedDestination ? (
                <span className="text-sm font-medium text-slate-800">{selectedDestination.name}</span>
              ) : (
                <span className="text-sm text-slate-500">Where are you headed?</span>
              )}
            </div>
          </div>
          <ChevronDown
            className={`w-4 h-4 text-slate-400 transition-transform duration-200 shrink-0 ${
              isDestinationOpen ? 'rotate-180 text-slate-700' : ''
            }`}
          />
        </button>

        {/* Searchable Dropdown Popup */}
        {isDestinationOpen && (
          <div className="absolute top-full left-0 right-0 mt-1.5 p-2 bg-white/95 backdrop-blur-xl backdrop-saturate-150 rounded-xl border border-white/60 shadow-xl shadow-black/20 z-50 animate-in fade-in zoom-in-95 duration-150">
            <div className="relative mb-1">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={destinationSearch}
                onChange={(e) => setDestinationSearch(e.target.value)}
                onKeyDown={handleSearchKeyDown}
                placeholder="Building, code (WLH) or parking lot"
                aria-label="Search buildings, class codes or parking"
                aria-controls="destination-options"
                aria-activedescendant={flatOptions.length ? `destination-option-${activeIndex}` : undefined}
                autoFocus
                className="w-full pl-8 pr-7 py-1.5 text-xs rounded-lg bg-black/5 border border-transparent focus:outline-none focus:ring-1 focus:ring-slate-900/20 text-slate-800"
              />
              {destinationSearch && (
                <button
                  type="button"
                  onClick={() => setDestinationSearch('')}
                  aria-label="Clear search"
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-black/5 cursor-pointer"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
            <ul ref={listRef} id="destination-options" className="max-h-72 overflow-y-auto py-0.5 text-sm" role="listbox">
              {sections.map((section) => (
                <React.Fragment key={section.label}>
                  <SectionLabel>{section.label}</SectionLabel>
                  {section.options.map((option) => {
                    rowIndex += 1;
                    const index = rowIndex;
                    const isActive = index === activeIndex;
                    if (option.kind === 'parking') {
                      const { lot } = option;
                      return (
                        <li
                          key={`lot-${lot.locationId}`}
                          id={`destination-option-${index}`}
                          data-index={index}
                          role="option"
                          aria-selected={isActive}
                          onClick={() => chooseOption(option)}
                          onMouseMove={() => setActiveIndex(index)}
                          className={`px-3 py-2 rounded-lg cursor-pointer flex items-center gap-2.5 text-xs text-slate-700 ${isActive ? 'bg-black/[0.06]' : ''}`}
                        >
                          <span className="w-5 h-5 shrink-0 rounded-md bg-[#007aff] text-white text-[10px] font-extrabold flex items-center justify-center">P</span>
                          <div className="min-w-0 flex-1">
                            <div className="font-semibold truncate">{lot.name}</div>
                            <div className="text-[11px] text-slate-500">
                              {lot.kind === 'structure' ? 'Parking structure' : 'Surface lot'} · show on map
                            </div>
                          </div>
                        </li>
                      );
                    }
                    const { destination, matchedOn } = option;
                    const isCurrent = destination.id === formData.destinationId;
                    return (
                      <li
                        key={destination.id}
                        id={`destination-option-${index}`}
                        data-index={index}
                        role="option"
                        aria-selected={isActive}
                        onClick={() => chooseOption(option)}
                        onMouseMove={() => setActiveIndex(index)}
                        className={`px-3 py-2 rounded-lg cursor-pointer flex items-center gap-2.5 text-xs ${
                          isCurrent ? 'text-slate-900' : 'text-slate-700'
                        } ${isActive ? 'bg-black/[0.06]' : ''}`}
                      >
                        {!query && destination.popular !== undefined ? (
                          <Star className="w-3.5 h-3.5 shrink-0 text-slate-400" aria-hidden="true" />
                        ) : (
                          <MapPin className="w-3.5 h-3.5 shrink-0 text-slate-400" aria-hidden="true" />
                        )}
                        <div className="min-w-0 flex-1">
                          <div className="font-semibold truncate">{destination.name}</div>
                          {matchedOn && !destination.codes?.includes(matchedOn) && (
                            <div className="text-[11px] text-slate-500 truncate">Also called {matchedOn}</div>
                          )}
                        </div>
                        {destination.codes?.[0] && (
                          <span
                            className={`shrink-0 px-1.5 py-0.5 rounded-md text-[10px] font-bold tracking-wide ${
                              matchedOn && destination.codes.includes(matchedOn)
                                ? 'bg-slate-900 text-white'
                                : 'bg-black/[0.06] text-slate-600'
                            }`}
                          >
                            {matchedOn && destination.codes.includes(matchedOn) ? matchedOn : destination.codes[0]}
                          </span>
                        )}
                        {isCurrent && <Check className="w-3.5 h-3.5 shrink-0 text-slate-900" />}
                      </li>
                    );
                  })}
                </React.Fragment>
              ))}
              {flatOptions.length === 0 && (
                <li className="px-3 py-3 text-xs text-slate-500 text-center">
                  No matches. Tip: tap the map to drop a pin anywhere.
                </li>
              )}
            </ul>
            {!query && (
              <p className="px-3 pt-1.5 pb-0.5 text-[11px] text-slate-500 border-t border-black/5 mt-1">
                Not listed? Tap the map to drop a pin.
              </p>
            )}
          </div>
        )}
      </div>

      {/* Arrival Date and Time Grid */}
      <div className="grid grid-cols-2 gap-2.5">
        <div>
          <label
            htmlFor="arrival-date"
            className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5"
          >
            Arrival date
          </label>
          <div className="relative">
            <input
              id="arrival-date"
              type="date"
              value={formData.arrivalDate}
              onChange={(e) => onChange({ arrivalDate: e.target.value })}
              aria-invalid={arrivalError !== null}
              aria-describedby={arrivalError ? 'arrival-error' : undefined}
              className="w-full px-2.5 py-2 rounded-xl bg-white/50 border border-white/60 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900/15 focus:border-white transition-all shadow-xs"
            />
          </div>
        </div>

        <div>
          <label
            htmlFor="arrival-time"
            className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5"
          >
            Arrival time
          </label>
          <div className="relative">
            <input
              id="arrival-time"
              type="time"
              value={formData.arrivalTime}
              onChange={(e) => onChange({ arrivalTime: e.target.value })}
              aria-invalid={arrivalError !== null}
              aria-describedby={arrivalError ? 'arrival-error' : undefined}
              className="w-full px-2.5 py-2 rounded-xl bg-white/50 border border-white/60 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900/15 focus:border-white transition-all shadow-xs"
            />
          </div>
        </div>
      </div>

      {/* Arrival validation: empty or past date/time */}
      {arrivalError && (
        <div
          id="arrival-error"
          role="alert"
          className="-mt-2 flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-[#ff3b30]/10 text-[12px] text-[#c0261d] font-medium"
        >
          <span>{arrivalError}</span>
          <button
            type="button"
            onClick={onSetArrivalNow}
            className="shrink-0 px-2 py-0.5 rounded-md bg-white/70 text-slate-800 font-semibold hover:bg-white cursor-pointer"
          >
            Use now
          </button>
        </div>
      )}

      {/* Permit Type Pill Selector */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
            Permit type
          </label>
          <span className="text-[11px] text-slate-500">
            {PERMIT_OPTIONS.find((p) => p.type === formData.permitType)?.description}
          </span>
        </div>
        <div
          role="radiogroup"
          aria-label="Permit type"
          className="grid grid-cols-6 gap-0.5 p-0.5 bg-black/[0.06] rounded-xl"
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
                className={`relative py-1.5 text-xs font-semibold rounded-[10px] transition-colors duration-200 text-center focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-900/30 cursor-pointer ${
                  isSelected ? 'text-slate-900' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {/* Shared layoutId makes the white thumb slide between options */}
                {isSelected && (
                  <motion.span
                    layoutId="permit-thumb"
                    className="absolute inset-0 rounded-[10px] bg-white shadow-sm shadow-black/10"
                    transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                  />
                )}
                <span className="relative">{permit.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Primary Action Button */}
      <button
        type="submit"
        disabled={isLoading || arrivalError !== null || !selectedDestination}
        className="w-full py-2.5 px-4 rounded-xl font-semibold text-sm btn-shine relative overflow-hidden text-white bg-gradient-to-b from-slate-800 to-slate-950 hover:from-slate-700 hover:to-slate-900 hover:-translate-y-px active:translate-y-0 active:scale-[0.99] focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-900/40 focus-visible:ring-offset-2 transition-all duration-150 shadow-md shadow-black/20 disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:translate-y-0 flex items-center justify-center gap-2 cursor-pointer"
      >
        {isLoading ? (
          <>
            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            <span>Finding parking options...</span>
          </>
        ) : (
          <span>{selectedDestination ? submitLabel : 'Choose a destination'}</span>
        )}
      </button>
    </form>
  );
};
