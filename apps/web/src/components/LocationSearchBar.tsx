"use client";

import React, { useState, useEffect, useRef } from "react";
import { Search, MapPin, Loader2, AlertCircle, Compass, X, Target } from "lucide-react";
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
        <label htmlFor="location-search" className="block text-xs font-mono font-bold tracking-widest uppercase text-zinc-400 flex items-center gap-1.5">
          <Target className="w-3.5 h-3.5 text-amber-400" />
          <span>Search Location (City, Town, or District)</span>
        </label>
        {selectedLocation && (
          <span className="text-[11px] font-mono text-amber-400/90 flex items-center gap-1 px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/20">
            <Compass className="w-3 h-3 text-amber-400" />
            <span>{selectedLocation.latitude.toFixed(2)}°N, {selectedLocation.longitude.toFixed(2)}°E</span>
          </span>
        )}
      </div>

      <div className="relative group">
        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-400 group-focus-within:text-amber-400 transition-colors">
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
          ) : (
            <Search className="w-4 h-4" />
          )}
        </div>

        <input
          ref={inputRef}
          id="location-search"
          type="text"
          className="w-full pl-10 pr-24 py-3 bg-[#11141b] border border-[#202633] rounded-xl text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-amber-500/60 focus:border-amber-500/70 transition-all font-mono shadow-inner"
          placeholder={
            selectedLocation
              ? `Target: ${selectedLocation.formatted_label}`
              : "Enter target coordinates or city name (e.g. Warangal, Tokyo, London, Sydney)..."
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
              className="p-1 text-zinc-400 hover:text-white rounded-md hover:bg-white/[0.06] transition-colors"
              title="Clear search"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          <span className="hidden sm:inline-block text-[10px] font-mono font-medium text-zinc-500 bg-[#161a24] border border-[#262c3b] px-1.5 py-0.5 rounded">
            /
          </span>
        </div>
      </div>

      {/* Autocomplete Dropdown */}
      {isOpen && (
        <div className="absolute left-0 right-0 mt-2 z-50 rounded-xl bg-[#0f1218] border border-[#262d3d] shadow-2xl overflow-hidden divide-y divide-[#1e2330] animate-in fade-in-50 slide-in-from-top-2 duration-150">
          {loading && (
            <div className="p-4 flex items-center justify-center gap-2 text-xs text-zinc-400 font-mono">
              <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
              <span>Querying Open-Meteo Global Geocoding API...</span>
            </div>
          )}

          {searchError && (
            <div className="p-4 flex items-start gap-2.5 text-xs text-rose-300 bg-rose-950/20 font-mono">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Geocoding Error</p>
                <p className="text-[11px] text-rose-300/80 mt-0.5">{searchError}</p>
              </div>
            </div>
          )}

          {!loading && !searchError && results.length === 0 && hasSearched && (
            <div className="p-6 text-center text-xs text-zinc-400 font-mono">
              <p>No geographic matching coordinates found for &quot;{query}&quot;.</p>
              <p className="text-[11px] text-zinc-500 mt-1">Try another municipality, district, or coordinate pair.</p>
            </div>
          )}

          {!loading && results.length > 0 && (
            <div className="max-h-80 overflow-y-auto">
              <div className="px-3.5 py-2 text-[10px] font-mono uppercase tracking-wider text-zinc-500 bg-[#0c0e13]">
                Matched Geodetic Coordinates ({results.length})
              </div>
              {results.map((loc) => (
                <button
                  key={`${loc.id}-${loc.latitude}-${loc.longitude}`}
                  onClick={() => handleSelect(loc)}
                  className="w-full text-left px-4 py-3 flex items-center justify-between hover:bg-[#181d27] transition-colors group"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-[#141822] text-zinc-400 group-hover:text-amber-400 border border-[#222836] group-hover:border-amber-500/30 transition-colors">
                      <MapPin className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-white group-hover:text-amber-300 transition-colors">
                        {loc.name}
                      </p>
                      <p className="text-xs text-zinc-400">
                        {loc.admin1 ? `${loc.admin1}, ` : ""}
                        {loc.country_code ? `${loc.country_code}` : ""}
                        {loc.elevation !== undefined && loc.elevation !== null ? ` · ${loc.elevation}m` : ""}
                      </p>
                    </div>
                  </div>

                  <div className="text-right text-[11px] font-mono text-zinc-500 group-hover:text-zinc-300">
                    <p>{loc.latitude.toFixed(2)}°N</p>
                    <p>{loc.longitude.toFixed(2)}°E</p>
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
