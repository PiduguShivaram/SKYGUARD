"use client";

import React, { useState, useEffect, useRef } from "react";
import { Search, MapPin, Loader2, Navigation, Star, Trash2, Cloud } from "lucide-react";
import { LocationSearchResult } from "@/types";
import { searchLocations } from "@/lib/api";
import {
  getSavedLocations,
  removeSavedLocationFromCloud,
  SavedLocation,
} from "@/lib/supabase";

interface LivingLocationSearchProps {
  onSelectLocation: (loc: LocationSearchResult) => void;
  selectedLocationName?: string;
  savedLocationsUpdatedTrigger?: number;
}

const CURATED_CITIES: LocationSearchResult[] = [
  { id: 1850147, name: "Tokyo", latitude: 35.6895, longitude: 139.6917, country: "Japan", admin1: "Tokyo", formatted_label: "Tokyo, Japan" },
  { id: 5128581, name: "New York", latitude: 40.7128, longitude: -74.006, country: "United States", admin1: "New York", formatted_label: "New York, USA" },
  { id: 2643743, name: "London", latitude: 51.5074, longitude: -0.1278, country: "United Kingdom", admin1: "England", formatted_label: "London, UK" },
  { id: 1261481, name: "New Delhi", latitude: 28.6139, longitude: 77.209, country: "India", admin1: "Delhi", formatted_label: "New Delhi, India" },
  { id: 2988507, name: "Paris", latitude: 48.8566, longitude: 2.3522, country: "France", admin1: "Île-de-France", formatted_label: "Paris, France" },
  { id: 2147714, name: "Sydney", latitude: -33.8688, longitude: 151.2093, country: "Australia", admin1: "NSW", formatted_label: "Sydney, Australia" },
];

export function LivingLocationSearch({
  onSelectLocation,
  selectedLocationName,
  savedLocationsUpdatedTrigger = 0,
}: LivingLocationSearchProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<LocationSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [geoLocating, setGeoLocating] = useState(false);
  const [savedLocations, setSavedLocations] = useState<SavedLocation[]>([]);
  const searchRef = useRef<HTMLDivElement>(null);

  // Load saved locations from Supabase
  const reloadSaved = async () => {
    try {
      const locs = await getSavedLocations();
      setSavedLocations(locs || []);
    } catch {
      // Ignore
    }
  };

  useEffect(() => {
    reloadSaved();
  }, [savedLocationsUpdatedTrigger]);

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

  const handleDeleteSaved = async (e: React.MouseEvent, id?: string) => {
    e.stopPropagation();
    if (!id) return;
    await removeSavedLocationFromCloud(id);
    await reloadSaved();
  };

  return (
    <div ref={searchRef} className="relative w-full max-w-lg mx-auto z-40">
      <div className="relative flex items-center">
        <Search className="absolute left-4 w-4 h-4 text-white/60 pointer-events-none" />
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => {
            setIsOpen(true);
            reloadSaved();
          }}
          placeholder={selectedLocationName ? `Current: ${selectedLocationName}` : "Search city, region or coordinates..."}
          className="w-full pl-11 pr-28 py-2.5 bg-white/10 hover:bg-white/15 focus:bg-white/20 border border-white/20 rounded-sg text-sm text-white placeholder:text-white/50 backdrop-blur-md focus:outline-none focus:ring-1 focus:ring-white/40 focus:border-white/40 transition-all"
        />

        <div className="absolute right-1.5 flex items-center gap-1">
          {loading && <Loader2 className="w-4 h-4 text-white/70 animate-spin mr-1" />}
          <button
            type="button"
            onClick={handleUseMyLocation}
            disabled={geoLocating}
            title="Detect location using device GPS"
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-white/20 hover:bg-white/35 border border-white/30 hover:border-white/50 rounded-sg text-xs font-mono text-white hover:text-sky-200 shadow-sm hover:scale-105 active:scale-95 transition-all duration-200 min-h-[36px] cursor-pointer"
          >
            <Navigation className={`w-3.5 h-3.5 text-sky-300 ${geoLocating ? "animate-spin text-sky-400" : ""}`} />
            <span className="font-semibold tracking-wide">GPS</span>
          </button>
        </div>
      </div>

      {/* Autocomplete / Recent / Curated Dropdown */}
      {isOpen && (
        <div className="absolute top-full mt-1.5 w-full bg-[#0F172A]/95 backdrop-blur-xl border border-white/20 rounded-sg shadow-dialog overflow-hidden z-50 divide-y divide-white/10">
          {results.length > 0 ? (
            <div className="max-h-72 overflow-y-auto">
              <div className="px-3 py-1.5 text-[11px] font-mono uppercase tracking-wider text-white/60 bg-black/30">
                Matches from Open-Meteo
              </div>
              {results.map((item) => (
                <button
                  key={`${item.latitude}-${item.longitude}-${item.name}`}
                  type="button"
                  onClick={() => {
                    onSelectLocation(item);
                    setIsOpen(false);
                    setQuery("");
                  }}
                  className="w-full px-4 py-2.5 text-left text-sm text-white hover:bg-white/10 flex items-center justify-between group transition-colors"
                >
                  <span className="flex items-center gap-2">
                    <MapPin className="w-3.5 h-3.5 text-[#60A5FA] opacity-70 group-hover:opacity-100" />
                    <span className="font-medium text-white">{item.name}</span>
                    <span className="text-xs text-white/70">{[item.admin1, item.country].filter(Boolean).join(", ")}</span>
                  </span>
                  <span className="text-[11px] font-mono text-white/50">
                    {item.latitude.toFixed(2)}°, {item.longitude.toFixed(2)}°
                  </span>
                </button>
              ))}
            </div>
          ) : query.trim().length >= 2 && !loading ? (
            <div className="p-4 text-center text-xs text-white/70">
              No matching locations found.
            </div>
          ) : (
            <div className="p-3 space-y-3">
              {/* Saved Locations from Supabase Workspace */}
              {savedLocations.length > 0 && (
                <div>
                  <div className="flex items-center justify-between px-2 py-1 text-[11px] font-mono uppercase tracking-wider text-[#FCD34D]">
                    <span className="flex items-center gap-1.5">
                      <Star className="w-3 h-3 fill-[#FCD34D] text-[#FCD34D]" />
                      Saved Sectors (Supabase Cloud)
                    </span>
                    <Cloud className="w-3 h-3 text-[#60A5FA]" />
                  </div>
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {savedLocations.map((loc) => (
                      <div
                        key={loc.id || `${loc.latitude}-${loc.longitude}`}
                        className="group inline-flex items-center gap-1 px-2.5 py-1 text-xs text-[#FCD34D] bg-amber-950/40 hover:bg-amber-950/60 border border-amber-400/40 rounded-sg transition-colors"
                      >
                        <button
                          type="button"
                          onClick={() => {
                            onSelectLocation({
                              id: Math.abs(Math.round(loc.latitude * 1000 + loc.longitude)),
                              name: loc.name,
                              latitude: loc.latitude,
                              longitude: loc.longitude,
                              formatted_label: loc.formatted_label,
                              country: loc.country_code || "",
                            });
                            setIsOpen(false);
                            setQuery("");
                          }}
                          className="flex items-center gap-1 text-left"
                        >
                          <Star className="w-2.5 h-2.5 fill-[#FCD34D] text-[#FCD34D]" />
                          <span className="font-medium text-white">{loc.name}</span>
                        </button>
                        <button
                          type="button"
                          onClick={(e) => handleDeleteSaved(e, loc.id)}
                          className="ml-1 opacity-50 hover:opacity-100 text-white/70 hover:text-red-400 transition-opacity"
                          title="Remove saved location"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Popular Reference Cities */}
              <div>
                <div className="px-2 py-1 text-[11px] font-mono uppercase tracking-wider text-white/60">
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
                      className="text-xs font-mono px-2.5 py-1 rounded-sg bg-white/10 hover:bg-white/20 text-white/80 hover:text-white border border-white/15 transition-colors"
                    >
                      {city.name}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
