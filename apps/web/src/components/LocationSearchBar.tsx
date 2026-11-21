"use client";

import React, { useState, useEffect, useRef } from "react";
import { Search, MapPin, Loader2, AlertCircle, Compass, X } from "lucide-react";
import { searchLocations } from "@/lib/api";
import { LocationSearchResult } from "@/types";

interface LocationSearchBarProps {
  onLocationSelect: (location: LocationSearchResult) => void;
  selectedLocation: LocationSearchResult | null;
}

export const LocationSearchBar: React.FC<LocationSearchBarProps> = ({
  onLocationSelect,
  selectedLocation,
}) => {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<LocationSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Debounced search against real Open-Meteo Geocoding
  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setResults([]);
      setIsOpen(false);
      setHasSearched(false);
      setSearchError(null);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      setSearchError(null);
      try {
        const data = await searchLocations(trimmed);
        setResults(data);
        setHasSearched(true);
        setIsOpen(true);
      } catch (err: any) {
        console.error("Geocoding lookup error:", err);
        setSearchError(err.message || "Failed to query geocoding provider.");
        setResults([]);
        setIsOpen(true);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  // Click outside to dismiss dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (loc: LocationSearchResult) => {
    onLocationSelect(loc);
    setQuery("");
    setIsOpen(false);
  };

  const handleClear = () => {
    setQuery("");
    setResults([]);
    setIsOpen(false);
    inputRef.current?.focus();
  };

  return (
    <div className="w-full relative" ref={dropdownRef}>
      <div className="flex items-center justify-between mb-2">
        <label htmlFor="location-search" className="block text-xs font-semibold tracking-wider uppercase text-slate-400">
          Search Location (City, Town, or District)
        </label>
        {selectedLocation && (
          <span className="text-[11px] font-mono text-sky-400 flex items-center gap-1">
            <Compass className="w-3 h-3 text-sky-400" />
            {selectedLocation.latitude.toFixed(2)}°N, {selectedLocation.longitude.toFixed(2)}°E
          </span>
        )}
      </div>

      <div className="relative group">
        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 group-focus-within:text-sky-400 transition-colors">
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin text-sky-400" />
          ) : (
            <Search className="w-4 h-4" />
          )}
        </div>

        <input
          ref={inputRef}
          id="location-search"
          type="text"
          className="w-full pl-10 pr-24 py-3 bg-[#0c1220]/90 border border-white/[0.1] rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500/50 focus:border-sky-500/60 transition-all shadow-inner backdrop-blur-md"
          placeholder={
            selectedLocation
              ? `Current location: ${selectedLocation.formatted_label}`
              : "Type at least 2 characters (e.g. Warangal, Tokyo, London, Delhi)..."
          }
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => (results.length > 0 || hasSearched || searchError) && setIsOpen(true)}
          autoComplete="off"
        />

        <div className="absolute inset-y-0 right-0 pr-3 flex items-center gap-1.5">
          {query && (
            <button
              type="button"
              onClick={handleClear}
              className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-white/[0.06] transition-colors"
              title="Clear search"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          <span className="hidden sm:inline-block text-[10px] font-mono font-medium text-slate-500 bg-white/[0.04] border border-white/[0.08] px-1.5 py-0.5 rounded">
            /
          </span>
        </div>
      </div>

      {/* Autocomplete Dropdown */}
      {isOpen && (
        <div className="absolute left-0 right-0 mt-2 z-50 rounded-2xl bg-[#090f1d]/95 border border-white/[0.12] shadow-2xl backdrop-blur-2xl overflow-hidden divide-y divide-white/[0.06] animate-in fade-in-50 slide-in-from-top-2 duration-150">
          {loading && (
            <div className="p-4 flex items-center justify-center gap-2 text-xs text-slate-400 font-medium">
              <Loader2 className="w-4 h-4 animate-spin text-sky-400" />
              <span>Querying Open-Meteo Global Geocoding API...</span>
            </div>
          )}

          {searchError && (
            <div className="p-4 flex items-start gap-2.5 text-xs text-rose-300 bg-rose-950/30">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-rose-200">Geocoding Search Error</p>
                <p className="text-rose-400 text-[11px]">{searchError}</p>
              </div>
            </div>
          )}

          {!loading && !searchError && results.length === 0 && hasSearched && (
            <div className="p-6 text-center text-xs text-slate-400 space-y-1">
              <p className="font-semibold text-slate-300">No matching locations found</p>
              <p className="text-[11px] text-slate-500">
                Check spelling or try a broader district, major town, or country name.
              </p>
            </div>
          )}

          {!loading && results.length > 0 && (
            <div className="max-h-72 overflow-y-auto py-1">
              {results.map((loc) => (
                <button
                  key={`${loc.id}-${loc.latitude}-${loc.longitude}`}
                  type="button"
                  onClick={() => handleSelect(loc)}
                  className="w-full px-4 py-3 text-left flex items-center justify-between gap-3 hover:bg-sky-500/10 hover:text-sky-200 transition-colors group focus:outline-none focus:bg-sky-500/15"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="p-2 rounded-lg bg-white/[0.04] border border-white/[0.06] text-slate-400 group-hover:text-sky-400 group-hover:border-sky-500/30 transition-colors">
                      <MapPin className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-white group-hover:text-sky-100 truncate">
                        {loc.name}
                      </p>
                      <p className="text-xs text-slate-400 truncate font-normal">
                        {loc.formatted_label}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 text-right">
                    <span className="text-[10px] font-mono text-slate-500">
                      {loc.latitude.toFixed(2)}°, {loc.longitude.toFixed(2)}°
                    </span>
                    {loc.country_code && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-white/[0.06] text-slate-300 border border-white/[0.1] group-hover:bg-sky-500/20 group-hover:text-sky-200">
                        {loc.country_code}
                      </span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
