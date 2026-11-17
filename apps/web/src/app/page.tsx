"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Header } from "@/components/Header";
import { LocationSearchBar } from "@/components/LocationSearchBar";
import { CurrentWeatherCard } from "@/components/CurrentWeatherCard";
import { HourlyChart } from "@/components/HourlyChart";
import { DailyForecastList } from "@/components/DailyForecastList";
import { GlobalAlertsPanel } from "@/components/GlobalAlertsPanel";
import { ProvenanceFooter } from "@/components/ProvenanceFooter";
import { ErrorState } from "@/components/ErrorState";
import { checkBackendHealth, getForecast, getGlobalAlerts } from "@/lib/api";
import {
  GlobalAlertsResponse,
  LocationSearchResult,
  WeatherForecastResponse,
} from "@/types";
import { MapPin, CloudSun } from "lucide-react";

const POPULAR_CITIES = [
  { name: "Warangal", label: "Warangal, Telangana, India", lat: 17.9784, lon: 79.6005, country: "IN" },
  { name: "Tokyo", label: "Tokyo, Japan", lat: 35.6895, lon: 139.6917, country: "JP" },
  { name: "London", label: "London, United Kingdom", lat: 51.5074, lon: -0.1278, country: "GB" },
  { name: "New York", label: "New York, NY, United States", lat: 40.7128, lon: -74.0060, country: "US" },
  { name: "Sydney", label: "Sydney, NSW, Australia", lat: -33.8688, lon: 151.2093, country: "AU" },
  { name: "Berlin", label: "Berlin, Germany", lat: 52.5200, lon: 13.4050, country: "DE" },
];

export default function GlobalWeatherAndAlertsPage() {
  const [upstreamStatus, setUpstreamStatus] = useState<string>("CHECKING");
  const [selectedLocation, setSelectedLocation] = useState<LocationSearchResult | null>(null);
  const [weatherData, setWeatherData] = useState<WeatherForecastResponse | null>(null);
  const [alertsData, setAlertsData] = useState<GlobalAlertsResponse | null>(null);
  const [isFiltered, setIsFiltered] = useState<boolean>(true);

  const [loadingWeather, setLoadingWeather] = useState<boolean>(false);
  const [loadingAlerts, setLoadingAlerts] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Initial Health Check and Global Alerts Pre-load
  useEffect(() => {
    checkBackendHealth()
      .then((data) => {
        setUpstreamStatus(data.status === "HEALTHY" ? "HEALTHY" : "DEGRADED");
      })
      .catch(() => {
        setUpstreamStatus("UNREACHABLE");
      });

    // Pre-fetch global worldwide alerts
    setLoadingAlerts(true);
    getGlobalAlerts()
      .then((res) => setAlertsData(res))
      .catch((err) => console.error("Global alerts prefetch error:", err))
      .finally(() => setLoadingAlerts(false));
  }, []);

  // Fetch forecast and filtered alerts when location is selected
  const fetchLocationData = useCallback(
    async (lat: number, lon: number, label: string, countryCode?: string, filterActive: boolean = true) => {
      setLoadingWeather(true);
      setError(null);

      // 1. Fetch Forecast from Open-Meteo
      try {
        const forecast = await getForecast(lat, lon);
        setWeatherData(forecast);
      } catch (err: any) {
        console.error("Weather forecast error:", err);
        setError(err.message || "Failed to load Open-Meteo forecast.");
        setWeatherData(null);
      } finally {
        setLoadingWeather(false);
      }

      // 2. Fetch Alerts (either filtered by country/radius or global)
      setLoadingAlerts(true);
      try {
        const cCode = filterActive ? countryCode : undefined;
        const queryLat = filterActive ? lat : undefined;
        const queryLon = filterActive ? lon : undefined;
        const radius = filterActive ? 1500 : undefined;
        const alerts = await getGlobalAlerts(cCode, queryLat, queryLon, radius);
        setAlertsData(alerts);
      } catch (err: any) {
        console.error("Alerts fetch error:", err);
      } finally {
        setLoadingAlerts(false);
      }
    },
    []
  );

  const handleSelectLocation = (loc: LocationSearchResult) => {
    setSelectedLocation(loc);
    fetchLocationData(loc.latitude, loc.longitude, loc.formatted_label, loc.country_code, isFiltered);
  };

  const handleSelectQuickCity = (city: typeof POPULAR_CITIES[0]) => {
    const loc: LocationSearchResult = {
      id: Math.floor(Math.random() * 100000),
      name: city.name,
      latitude: city.lat,
      longitude: city.lon,
      country_code: city.country,
      formatted_label: city.label,
    };
    setSelectedLocation(loc);
    fetchLocationData(city.lat, city.lon, city.label, city.country, isFiltered);
  };

  const handleToggleFilter = () => {
    const nextFiltered = !isFiltered;
    setIsFiltered(nextFiltered);
    if (selectedLocation) {
      fetchLocationData(
        selectedLocation.latitude,
        selectedLocation.longitude,
        selectedLocation.formatted_label,
        selectedLocation.country_code,
        nextFiltered
      );
    } else {
      setLoadingAlerts(true);
      getGlobalAlerts()
        .then((res) => setAlertsData(res))
        .finally(() => setLoadingAlerts(false));
    }
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

          {/* Global Popular Cities Chips */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs text-slate-400">
            <span className="shrink-0 flex items-center gap-1 font-medium text-slate-500">
              <MapPin className="w-3.5 h-3.5" /> Popular Global Cities:
            </span>
            {POPULAR_CITIES.map((c) => (
              <button
                key={c.name}
                onClick={() => handleSelectQuickCity(c)}
                className={`shrink-0 px-2.5 py-1 rounded-lg border transition-all ${
                  selectedLocation?.name === c.name
                    ? "bg-blue-600/30 border-blue-500 text-blue-200 font-semibold shadow-sm"
                    : "bg-slate-900 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700"
                }`}
              >
                {c.name} ({c.country})
              </button>
            ))}
          </div>
        </div>

        {/* Error State */}
        {error && (
          <ErrorState
            title="Weather Provider Unavailable"
            message={error}
            onRetry={() => {
              if (selectedLocation) {
                fetchLocationData(
                  selectedLocation.latitude,
                  selectedLocation.longitude,
                  selectedLocation.formatted_label,
                  selectedLocation.country_code,
                  isFiltered
                );
              }
            }}
          />
        )}

        {/* Initial Prompt State (No location selected yet) */}
        {!selectedLocation && !loadingWeather && !error && (
          <div className="p-10 text-center rounded-2xl bg-slate-900/60 border border-slate-800 max-w-xl mx-auto shadow-2xl space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center mx-auto">
              <CloudSun className="w-7 h-7" />
            </div>
            <h2 className="text-xl font-bold text-white tracking-tight">
              Ready for Global Weather &amp; Disaster Intelligence
            </h2>
            <p className="text-xs text-slate-400 leading-relaxed max-w-md mx-auto">
              Search any city worldwide or choose a popular city above to query genuine Open-Meteo forecasts alongside live WMO CAP and GDACS international disaster alerts.
            </p>
          </div>
        )}

        {/* Loading Skeletons */}
        {loadingWeather && (
          <div className="space-y-6 animate-pulse">
            <div className="h-56 bg-slate-900/80 rounded-2xl border border-slate-800"></div>
            <div className="h-64 bg-slate-900/80 rounded-2xl border border-slate-800"></div>
          </div>
        )}

        {/* Live Weather Forecast Display */}
        {weatherData && !loadingWeather && (
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

        {/* Worldwide Weather & Disaster Alerts Panel */}
        <GlobalAlertsPanel
          alertsData={alertsData}
          loading={loadingAlerts}
          onRefresh={() => {
            if (selectedLocation) {
              fetchLocationData(
                selectedLocation.latitude,
                selectedLocation.longitude,
                selectedLocation.formatted_label,
                selectedLocation.country_code,
                isFiltered
              );
            } else {
              setLoadingAlerts(true);
              getGlobalAlerts()
                .then((res) => setAlertsData(res))
                .finally(() => setLoadingAlerts(false));
            }
          }}
          selectedCountry={selectedLocation?.country_code}
          selectedLabel={selectedLocation?.formatted_label}
          isFiltered={isFiltered}
          onToggleFilter={handleToggleFilter}
        />
      </main>

      {/* Provenance & Transparency Footer */}
      <ProvenanceFooter weather={weatherData} />
    </div>
  );
}
