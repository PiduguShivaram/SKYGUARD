"use client";

import React, { useState, useEffect, useRef } from "react";
import { Search, MapPin, Loader2, AlertCircle, Compass } from "lucide-react";
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
    }, 350);

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

  return (
    <div className="w-full relative" ref={dropdownRef}>
      <label htmlFor="location-search" className="block text-xs font-semibold text-slate-300 mb-1.5">
        Search Location (City, Town, or District)
      </label>
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin text-blue-400" />
          ) : (
            <Search className="w-4 h-4" />
          )}
        </div>
        <input
          id="location-search"
          type="text"
          className="w-full pl-10 pr-4 py-3 bg-slate-800/90 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all shadow-inner"
          placeholder={
            selectedLocation
              ? `Current location: ${selectedLocation.formatted_label}`
              : "Type at least 2 characters (e.g. Warangal, Hyderabad, Delhi)..."
          }
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => (results.length > 0 || hasSearched || searchError) && setIsOpen(true)}
          autoComplete="off"
        />
      </div>

      {/* Autocomplete / Results Dropdown */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-1.5 z-50 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl overflow-hidden max-h-80 overflow-y-auto">
          {/* Header */}
          <div className="px-3 py-2 text-[11px] font-semibold text-slate-400 border-b border-slate-700/60 uppercase tracking-wider flex items-center justify-between">
            <span>Matching Places (Open-Meteo Geocoding)</span>
            {loading && <span className="text-blue-400 normal-case font-normal">Searching...</span>}
          </div>

          {/* Loading state inside dropdown */}
          {loading && results.length === 0 && (
            <div className="p-4 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-blue-400" />
              <span>Querying Open-Meteo gazetteer...</span>
            </div>
          )}

          {/* Error State */}
          {searchError && (
            <div className="p-4 text-xs text-rose-300 bg-rose-950/20 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>Geocoding unavailable: {searchError}</span>
            </div>
          )}

          {/* No match state */}
          {!loading && !searchError && hasSearched && results.length === 0 && (
            <div className="p-5 text-center text-xs text-slate-400">
              <p className="font-medium text-slate-300">No matching locations found for &quot;{query}&quot;</p>
              <p className="text-[11px] text-slate-500 mt-1">
                Please check the spelling or search for a nearby major town or district.
              </p>
            </div>
          )}

          {/* Multiple Geo Results List */}
          {!loading &&
            results.map((item) => (
              <button
                key={`${item.id}-${item.latitude}-${item.longitude}`}
                onClick={() => handleSelect(item)}
                className="w-full px-4 py-3 text-left flex items-start gap-3 hover:bg-slate-700/70 border-b border-slate-700/30 last:border-0 transition-colors focus:bg-slate-700/80 focus:outline-none"
              >
                <MapPin className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-white">{item.formatted_label}</p>
                  <p className="text-xs text-slate-400 font-mono mt-0.5">
                    Exact coordinates: {item.latitude.toFixed(4)}°N, {item.longitude.toFixed(4)}°E
                    {item.elevation !== undefined && item.elevation !== null ? ` · Elevation: ${item.elevation}m` : ""}
                    {item.country_code ? ` · Country: ${item.country_code}` : ""}
                  </p>
                </div>
              </button>
            ))}
        </div>
      )}
    </div>
  );
};
