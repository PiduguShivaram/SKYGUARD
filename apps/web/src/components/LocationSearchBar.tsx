"use client";

import React, { useState, useEffect, useRef } from "react";
import { Search, MapPin, Loader2, AlertCircle, X, Navigation, History } from "lucide-react";
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
  const [recentLocations, setRecentLocations] = useState<LocationSearchResult[]>([]);
  const [locatingUser, setLocatingUser] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);

  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Load recent locations from localStorage on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem("skyguard_recent_locations");
        if (stored) {
          setRecentLocations(JSON.parse(stored).slice(0, 5));
        }
      } catch (e) {
        console.error("Failed to parse recent locations:", e);
      }
    }
  }, []);

  // Save selected location to recent list
  const saveRecentLocation = (loc: LocationSearchResult) => {
    try {
      const filtered = recentLocations.filter(
        (item) => !(item.latitude === loc.latitude && item.longitude === loc.longitude)
      );
      const updated = [loc, ...filtered].slice(0, 5);
      setRecentLocations(updated);
      localStorage.setItem("skyguard_recent_locations", JSON.stringify(updated));
    } catch (e) {
      console.error("Failed to save recent location:", e);
    }
  };

  // Debounced search against Open-Meteo Geocoding
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
        console.error("Geocoding error:", err);
        setSearchError(err.message || "Failed to search locations.");
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
    saveRecentLocation(loc);
    setQuery("");
    setIsOpen(false);
  };

  const handleClear = () => {
    setQuery("");
    setResults([]);
    setIsOpen(false);
    inputRef.current?.focus();
  };

  const handleUseMyLocation = () => {
    setGeoError(null);
    if (!navigator.geolocation) {
      setGeoError("Geolocation is not supported by your browser.");
      return;
    }

    setLocatingUser(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocatingUser(false);
        const lat = position.coords.latitude;
        const lon = position.coords.longitude;
        const loc: LocationSearchResult = {
          id: Math.round(lat * 10000 + lon * 100),
          name: "Current Location",
          latitude: lat,
          longitude: lon,
          formatted_label: `${lat.toFixed(2)}°N, ${lon.toFixed(2)}°E`,
        };
        onLocationSelect(loc);
        saveRecentLocation(loc);
      },
      (err) => {
        setLocatingUser(false);
        if (err.code === err.PERMISSION_DENIED) {
          setGeoError("Location permission denied. Please allow location access or search manually.");
        } else {
          setGeoError("Unable to retrieve your current location.");
        }
      },
      { timeout: 10000, enableHighAccuracy: false }
    );
  };

  return (
    <div className="w-full relative max-w-2xl mx-auto" ref={dropdownRef}>
      <div className="flex items-center justify-between mb-1.5">
        <label htmlFor="location-search" className="text-xs font-medium text-text-muted">
          Search Location
        </label>
        {selectedLocation && (
          <span className="text-[11px] text-text-muted font-mono">
            {selectedLocation.latitude.toFixed(2)}°N, {selectedLocation.longitude.toFixed(2)}°E
          </span>
        )}
      </div>

      <div className="flex items-center gap-2">
        <div className="relative flex-1 group">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-text-muted">
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin text-brand-text" />
            ) : (
              <Search className="w-4 h-4" />
            )}
          </div>

          <input
            ref={inputRef}
            id="location-search"
            type="text"
            className="w-full pl-10 pr-10 py-2.5 bg-surface-panel border border-border-subtle rounded-sg text-sm text-white placeholder-text-muted focus:outline-none focus:ring-1 focus:ring-brand-fill focus:border-brand-fill transition-colors shadow-sm min-h-[44px]"
            placeholder={
              selectedLocation
                ? selectedLocation.formatted_label
                : "Search city, town, or district..."
            }
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setIsOpen(true)}
            autoComplete="off"
          />

          {query && (
            <button
              type="button"
              onClick={handleClear}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-text-muted hover:text-white"
              title="Clear search"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Use My Location Button */}
        <button
          type="button"
          onClick={handleUseMyLocation}
          disabled={locatingUser}
          className="shrink-0 flex items-center gap-1.5 px-3 py-2.5 bg-surface-panel hover:bg-surface-elevated text-text-primary hover:text-white border border-border-subtle rounded-sg text-xs font-medium transition-colors disabled:opacity-50 min-h-[44px]"
          title="Use current device location"
        >
          {locatingUser ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin text-brand-text" />
          ) : (
            <Navigation className="w-3.5 h-3.5 text-brand-text" />
          )}
          <span className="hidden sm:inline">Use my location</span>
        </button>
      </div>

      {geoError && (
        <p className="mt-1.5 text-xs text-rose-400 flex items-center gap-1">
          <AlertCircle className="w-3.5 h-3.5" />
          <span>{geoError}</span>
        </p>
      )}

      {/* Autocomplete / Recent Dropdown */}
      {isOpen && (
        <div className="absolute left-0 right-0 mt-1.5 z-50 rounded-sg bg-surface-panel border border-border-subtle shadow-dialog overflow-hidden divide-y divide-border-subtle">
          {loading && (
            <div className="p-3 text-center text-xs text-text-muted flex items-center justify-center gap-2">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-brand-text" />
              <span>Searching Open-Meteo geocoding...</span>
            </div>
          )}

          {searchError && (
            <div className="p-3 text-xs text-rose-300 bg-rose-950/20 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{searchError}</span>
            </div>
          )}

          {!loading && !searchError && results.length === 0 && hasSearched && (
            <div className="p-4 text-center text-xs text-text-muted">
              No matching locations found for &quot;{query}&quot;.
            </div>
          )}

          {/* Search Results */}
          {!loading && results.length > 0 && (
            <div className="max-h-64 overflow-y-auto">
              <div className="px-3 py-1.5 text-[11px] font-medium text-text-muted uppercase tracking-wider bg-surface-base">
                Search Results
              </div>
              {results.map((loc) => (
                <button
                  key={`${loc.id}-${loc.latitude}-${loc.longitude}`}
                  onClick={() => handleSelect(loc)}
                  className="w-full text-left px-3.5 py-2.5 flex items-center justify-between hover:bg-surface-elevated transition-colors group min-h-[44px]"
                >
                  <div className="flex items-center gap-2.5">
                    <MapPin className="w-4 h-4 text-text-muted group-hover:text-brand-text" />
                    <div>
                      <p className="text-sm font-medium text-white group-hover:text-brand-text">
                        {loc.name}
                      </p>
                      <p className="text-xs text-text-muted">
                        {loc.admin1 ? `${loc.admin1}, ` : ""}
                        {loc.country_code ? `${loc.country_code}` : ""}
                        {loc.elevation !== undefined && loc.elevation !== null ? ` · ${loc.elevation}m` : ""}
                      </p>
                    </div>
                  </div>
                  <span className="text-xs text-text-muted font-mono">
                    {loc.latitude.toFixed(2)}°, {loc.longitude.toFixed(2)}°
                  </span>
                </button>
              ))}
            </div>
          )}

          {/* Recent Searches (when query is short and dropdown is open) */}
          {!query && recentLocations.length > 0 && (
            <div>
              <div className="px-3 py-1.5 text-[11px] font-medium text-text-muted uppercase tracking-wider bg-surface-base flex items-center justify-between">
                <span>Recent Locations</span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setRecentLocations([]);
                    localStorage.removeItem("skyguard_recent_locations");
                  }}
                  className="text-text-muted hover:text-white text-[10px] lowercase"
                >
                  clear
                </button>
              </div>
              {recentLocations.map((loc, idx) => (
                <button
                  key={`recent-${idx}`}
                  onClick={() => handleSelect(loc)}
                  className="w-full text-left px-3.5 py-2.5 flex items-center justify-between hover:bg-surface-elevated transition-colors group text-xs text-text-primary min-h-[44px]"
                >
                  <div className="flex items-center gap-2">
                    <History className="w-3.5 h-3.5 text-text-muted group-hover:text-brand-text" />
                    <span>{loc.formatted_label || loc.name}</span>
                  </div>
                  <span className="text-[11px] text-text-muted font-mono">
                    {loc.latitude.toFixed(2)}°, {loc.longitude.toFixed(2)}°
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
