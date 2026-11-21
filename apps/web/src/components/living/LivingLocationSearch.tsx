"use client";

import React, { useState, useEffect, useRef } from "react";
import { Search, MapPin, Loader2, Navigation } from "lucide-react";
import { LocationSearchResult } from "@/types";
import { searchLocations } from "@/lib/api";

interface LivingLocationSearchProps {
  onSelectLocation: (loc: LocationSearchResult) => void;
  selectedLocationName?: string;
}

const CURATED_CITIES: LocationSearchResult[] = [
  { id: 1850147, name: "Tokyo", latitude: 35.6895, longitude: 139.6917, country: "Japan", admin1: "Tokyo", formatted_label: "Tokyo, Japan" },
  { id: 5128581, name: "New York", latitude: 40.7128, longitude: -74.006, country: "United States", admin1: "New York", formatted_label: "New York, USA" },
  { id: 2643743, name: "London", latitude: 51.5074, longitude: -0.1278, country: "United Kingdom", admin1: "England", formatted_label: "London, UK" },
  { id: 1261481, name: "New Delhi", latitude: 28.6139, longitude: 77.209, country: "India", admin1: "Delhi", formatted_label: "New Delhi, India" },
  { id: 2988507, name: "Paris", latitude: 48.8566, longitude: 2.3522, country: "France", admin1: "Île-de-France", formatted_label: "Paris, France" },
];

export function LivingLocationSearch({ onSelectLocation, selectedLocationName }: LivingLocationSearchProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<LocationSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [geoLocating, setGeoLocating] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!query || query.trim().length < 2) {
      setResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await searchLocations(query.trim());
        setResults(res || []);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [query]);

  // Click outside listener
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleUseMyLocation = () => {
    if (!navigator.geolocation) return;
    setGeoLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGeoLocating(false);
        setIsOpen(false);
        onSelectLocation({
          id: 0,
          name: "Current Location",
          latitude: Number(pos.coords.latitude.toFixed(4)),
          longitude: Number(pos.coords.longitude.toFixed(4)),
          country: "GPS Coordinates",
          formatted_label: "Current GPS Location",
        });
      },
      () => {
        setGeoLocating(false);
      },
      { timeout: 10000 }
    );
  };

  return (
    <div ref={searchRef} className="relative w-full max-w-lg mx-auto z-40">
      <div className="relative flex items-center">
        <Search className="absolute left-4 w-4 h-4 text-slate-400 pointer-events-none" />
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          placeholder={selectedLocationName ? `Current: ${selectedLocationName}` : "Search city, region or coordinates..."}
          className="w-full pl-11 pr-24 py-3 bg-slate-900/70 border border-slate-700/60 rounded-full text-sm text-slate-100 placeholder:text-slate-400 backdrop-blur-md focus:outline-none focus:ring-1 focus:ring-sky-500/50 transition-all shadow-lg"
          aria-label="Search location"
        />
        <div className="absolute right-2 flex items-center gap-1">
          {loading && <Loader2 className="w-4 h-4 text-slate-400 animate-spin mr-2" />}
          <button
            type="button"
            onClick={handleUseMyLocation}
            disabled={geoLocating}
            className="flex items-center gap-1 px-3 py-1.5 text-xs text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-700/80 rounded-full transition-colors"
            title="Use current geolocation"
          >
            <Navigation className={`w-3 h-3 ${geoLocating ? "animate-spin text-sky-400" : ""}`} />
            <span className="hidden sm:inline">GPS</span>
          </button>
        </div>
      </div>

      {isOpen && (
        <div className="absolute top-full mt-2 w-full bg-slate-900/95 border border-slate-800 rounded-2xl shadow-2xl backdrop-blur-xl overflow-hidden z-50">
          {results.length > 0 ? (
            <div className="py-2 max-h-64 overflow-y-auto">
              <div className="px-4 py-1.5 text-[11px] font-mono uppercase tracking-wider text-slate-400">
                Resolved Locations
              </div>
              {results.map((item) => (
                <button
                  key={`${item.id}-${item.latitude}-${item.longitude}`}
                  type="button"
                  onClick={() => {
                    onSelectLocation(item);
                    setIsOpen(false);
                    setQuery("");
                  }}
                  className="w-full px-4 py-2.5 text-left text-sm text-slate-200 hover:bg-slate-800/80 flex items-center justify-between group transition-colors"
                >
                  <span className="flex items-center gap-2">
                    <MapPin className="w-3.5 h-3.5 text-sky-400 opacity-60 group-hover:opacity-100" />
                    <span className="font-medium text-slate-100">{item.name}</span>
                    <span className="text-xs text-slate-400">{[item.admin1, item.country].filter(Boolean).join(", ")}</span>
                  </span>
                  <span className="text-[11px] font-mono text-slate-400">
                    {item.latitude.toFixed(2)}°, {item.longitude.toFixed(2)}°
                  </span>
                </button>
              ))}
            </div>
          ) : query.trim().length >= 2 && !loading ? (
            <div className="p-4 text-center text-xs text-slate-400">
              No matching locations found.
            </div>
          ) : (
            <div className="p-3">
              <div className="px-2 py-1 text-[11px] font-mono uppercase tracking-wider text-slate-400">
                Explore Atmosphere
              </div>
              <div className="flex flex-wrap gap-1.5 mt-1">
                {CURATED_CITIES.map((city) => (
                  <button
                    key={city.id}
                    type="button"
                    onClick={() => {
                      onSelectLocation(city);
                      setIsOpen(false);
                      setQuery("");
                    }}
                    className="px-3 py-1.5 text-xs text-slate-300 hover:text-white bg-slate-800/60 hover:bg-slate-700/80 rounded-full transition-colors flex items-center gap-1.5"
                  >
                    <span>{city.name}</span>
                    <span className="text-[10px] text-slate-400">{city.country}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
