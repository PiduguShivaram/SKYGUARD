"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Header } from "@/components/Header";
import { LocationSearchBar } from "@/components/LocationSearchBar";
import { CurrentWeatherCard } from "@/components/CurrentWeatherCard";
import { HourlyChart } from "@/components/HourlyChart";
import { DailyForecastList } from "@/components/DailyForecastList";
import { ProvenanceFooter } from "@/components/ProvenanceFooter";
import { ErrorState } from "@/components/ErrorState";
import { checkBackendHealth, getForecast } from "@/lib/api";
import { LocationSearchResult, WeatherForecastResponse } from "@/types";
import { MapPin, Search, CloudSun, RefreshCw } from "lucide-react";

const SUGGESTED_CITIES = [
  { name: "Warangal", label: "Warangal, Telangana, India", lat: 17.9784, lon: 79.6005 },
  { name: "Hyderabad", label: "Hyderabad, Telangana, India", lat: 17.3850, lon: 78.4867 },
  { name: "New Delhi", label: "New Delhi, Delhi, India", lat: 28.6139, lon: 77.2090 },
  { name: "Bengaluru", label: "Bengaluru, Karnataka, India", lat: 12.9716, lon: 77.5946 },
  { name: "Mumbai", label: "Mumbai, Maharashtra, India", lat: 19.0760, lon: 72.8777 },
];

export default function PublicWeatherPage() {
  const [upstreamStatus, setUpstreamStatus] = useState<string>("CHECKING");
  const [selectedLocation, setSelectedLocation] = useState<LocationSearchResult | null>(null);
  const [weatherData, setWeatherData] = useState<WeatherForecastResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Check backend server health on mount
  useEffect(() => {
    checkBackendHealth()
      .then((data) => {
        setUpstreamStatus(data.status === "HEALTHY" ? "HEALTHY" : "DEGRADED");
      })
      .catch(() => {
        setUpstreamStatus("UNREACHABLE");
      });
  }, []);

  // Fetch forecast for chosen coordinates
  const fetchWeather = useCallback(async (lat: number, lon: number, label: string) => {
    setLoading(true);
    setError(null);
    try {
      const forecast = await getForecast(lat, lon);
      setWeatherData(forecast);
    } catch (err: any) {
      console.error("Weather forecast retrieval error:", err);
      setError(err.message || "Failed to retrieve forecast from Open-Meteo.");
      setWeatherData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleSelectLocation = (loc: LocationSearchResult) => {
    setSelectedLocation(loc);
    fetchWeather(loc.latitude, loc.longitude, loc.formatted_label);
  };

  const handleSelectQuickCity = (city: typeof SUGGESTED_CITIES[0]) => {
    const loc: LocationSearchResult = {
      id: Math.floor(Math.random() * 100000),
      name: city.name,
      latitude: city.lat,
      longitude: city.lon,
      formatted_label: city.label,
    };
    setSelectedLocation(loc);
    fetchWeather(city.lat, city.lon, city.label);
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100 font-sans">
      {/* Header */}
      <Header upstreamStatus={upstreamStatus} />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Search Bar & Location Selection */}
        <div className="space-y-3">
          <LocationSearchBar
            onLocationSelect={handleSelectLocation}
            selectedLocation={selectedLocation}
          />

          {/* Location Quick Chips */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs text-slate-400">
            <span className="shrink-0 flex items-center gap-1 font-medium text-slate-500">
              <MapPin className="w-3.5 h-3.5" /> Popular Indian Cities:
            </span>
            {SUGGESTED_CITIES.map((c) => (
              <button
                key={c.name}
                onClick={() => handleSelectQuickCity(c)}
                className={`shrink-0 px-2.5 py-1 rounded-lg border transition-all ${
                  selectedLocation?.name === c.name
                    ? "bg-blue-600/30 border-blue-500 text-blue-200 font-semibold shadow-sm"
                    : "bg-slate-900 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700"
                }`}
              >
                {c.name}
              </button>
            ))}
          </div>
        </div>

        {/* Error State with Retry */}
        {error && (
          <ErrorState
            title="Open-Meteo Provider Unreachable"
            message={error}
            onRetry={() => {
              if (selectedLocation) {
                fetchWeather(selectedLocation.latitude, selectedLocation.longitude, selectedLocation.formatted_label);
              }
            }}
          />
        )}

        {/* Initial Prompt State (No location selected yet) */}
        {!selectedLocation && !loading && !error && (
          <div className="p-12 text-center rounded-2xl bg-slate-900/60 border border-slate-800 max-w-xl mx-auto shadow-2xl space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center mx-auto">
              <CloudSun className="w-7 h-7" />
            </div>
            <h2 className="text-xl font-bold text-white tracking-tight">
              Ready for Real-time Weather Intelligence
            </h2>
            <p className="text-xs text-slate-400 leading-relaxed max-w-md mx-auto">
              Please search for a city or town above or select a popular city to query genuine Open-Meteo numerical weather prediction forecasts.
            </p>
          </div>
        )}

        {/* Loading Skeletons */}
        {loading && (
          <div className="space-y-6 animate-pulse">
            <div className="h-56 bg-slate-900/80 rounded-2xl border border-slate-800"></div>
            <div className="h-64 bg-slate-900/80 rounded-2xl border border-slate-800"></div>
            <div className="h-80 bg-slate-900/80 rounded-2xl border border-slate-800"></div>
          </div>
        )}

        {/* Live Weather Forecast Display */}
        {weatherData && !loading && (
          <div className="space-y-6">
            {/* Current Conditions Hero Card */}
            <CurrentWeatherCard
              weather={weatherData}
              locationLabel={selectedLocation?.formatted_label || "Selected Coordinates"}
            />

            {/* 24-Hour Hourly Trend Curve */}
            <HourlyChart hourly={weatherData.hourly} units={weatherData.units} />

            {/* Seven-Day Daily Summary */}
            <DailyForecastList daily={weatherData.daily} units={weatherData.units} />
          </div>
        )}
      </main>

      {/* Provenance & Transparency Footer */}
      <ProvenanceFooter weather={weatherData} />
    </div>
  );
}
