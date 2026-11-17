"use client";

import React, { useState, useEffect, useRef } from "react";
import { Search, MapPin, Loader2, Navigation, AlertCircle } from "lucide-react";
import { searchLocations } from "@/lib/api";
import { LocationSearchResult } from "@/types";

interface LocationSearchBarProps {
  onLocationSelect: (location: LocationSearchResult) => void;
  onGeolocationSelect: (lat: number, lon: number, label: string) => void;
  currentLabel: string;
}

export const LocationSearchBar: React.FC<LocationSearchBarProps> = ({
  onLocationSelect,
  onGeolocationSelect,
  currentLabel,
}) => {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<LocationSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Debounced search
  useEffect(() => {
    if (query.trim().length < 2) {
      setResults([]);
      setIsOpen(false);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const data = await searchLocations(query);
        setResults(data);
        setIsOpen(data.length > 0);
      } catch (err) {
        console.error("Geocoding lookup failed:", err);
      } finally {
        setLoading(false);
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [query]);

  // Click outside listener
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

  const handleUseLocation = () => {
    if (!navigator.geolocation) {
      setGeoError("Geolocation is not supported by your browser.");
      return;
    }

    setIsLocating(true);
    setGeoError(null);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setIsLocating(false);
        const lat = pos.coords.latitude;
        const lon = pos.coords.longitude;
        onGeolocationSelect(lat, lon, `My Location (${lat.toFixed(3)}°, ${lon.toFixed(3)}°)`);
      },
      (err) => {
        setIsLocating(false);
        switch (err.code) {
          case err.PERMISSION_DENIED:
            setGeoError("Location permission denied. Please search your city manually.");
            break;
          case err.POSITION_UNAVAILABLE:
            setGeoError("Position unavailable. Please search by name.");
            break;
          case err.TIMEOUT:
            setGeoError("Location request timed out.");
            break;
          default:
            setGeoError("Could not retrieve location.");
            break;
        }
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  return (
    <div className="w-full relative" ref={dropdownRef}>
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
        {/* Search Input */}
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin text-blue-400" />
            ) : (
              <Search className="w-4 h-4" />
            )}
          </div>
          <input
            type="text"
            className="w-full pl-10 pr-4 py-2.5 bg-slate-800/90 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all shadow-inner"
            placeholder={currentLabel ? `Location: ${currentLabel}` : "Search city, town, or district..."}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => results.length > 0 && setIsOpen(true)}
            aria-label="Search location"
          />
        </div>

        {/* Opt-in Geolocation Button */}
        <button
          onClick={handleUseLocation}
          disabled={isLocating}
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-800/90 hover:bg-slate-750 active:bg-slate-700 border border-slate-700 text-slate-200 hover:text-white rounded-xl text-sm font-medium transition-all shadow-sm"
          title="Opt-in to use device location"
        >
          {isLocating ? (
            <Loader2 className="w-4 h-4 animate-spin text-blue-400" />
          ) : (
            <Navigation className="w-4 h-4 text-blue-400" />
          )}
          <span className="whitespace-nowrap">Locate Me</span>
        </button>
      </div>

      {/* Geolocation error notification */}
      {geoError && (
        <div className="mt-2 p-2.5 bg-amber-500/10 border border-amber-500/20 rounded-lg flex items-center gap-2 text-xs text-amber-300">
          <AlertCircle className="w-4 h-4 shrink-0 text-amber-400" />
          <span>{geoError}</span>
        </div>
      )}

      {/* Autocomplete Dropdown */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-1.5 z-50 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl overflow-hidden max-h-72 overflow-y-auto">
          <div className="px-3 py-1.5 text-[11px] font-semibold text-slate-400 border-b border-slate-700/60 uppercase tracking-wider">
            Matching Locations (Open-Meteo Gazetteer)
          </div>
          {results.map((item) => (
            <button
              key={`${item.id}-${item.latitude}-${item.longitude}`}
              onClick={() => handleSelect(item)}
              className="w-full px-4 py-2.5 text-left flex items-start gap-3 hover:bg-slate-700/70 border-b border-slate-700/30 last:border-0 transition-colors"
            >
              <MapPin className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-white">{item.formatted_label}</p>
                <p className="text-xs text-slate-400">
                  Coordinates: {item.latitude.toFixed(3)}°, {item.longitude.toFixed(3)}°
                  {item.elevation ? ` · Elevation: ${item.elevation}m` : ""}
                </p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
