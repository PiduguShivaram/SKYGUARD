"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Header } from "@/components/Header";
import { LocationSearchBar } from "@/components/LocationSearchBar";
import { CurrentWeatherCard } from "@/components/CurrentWeatherCard";
import { HourlyChart } from "@/components/HourlyChart";
import { DailyForecastList } from "@/components/DailyForecastList";
import { OfficialAlertsCard } from "@/components/OfficialAlertsCard";
import { DerivedRiskCard } from "@/components/DerivedRiskCard";
import { FarmerModePanel } from "@/components/FarmerModePanel";
import { ProvenanceFooter } from "@/components/ProvenanceFooter";
import { ErrorState } from "@/components/ErrorState";
import {
  checkBackendHealth,
  evaluateRisks,
  getForecast,
  getOfficialAlerts,
} from "@/lib/api";
import {
  LocationSearchResult,
  OfficialAlertResponse,
  RiskEvaluationResponse,
  WeatherForecastResponse,
} from "@/types";
import { MapPin, Sparkles, Navigation } from "lucide-react";

const SUGGESTED_LOCATIONS = [
  { name: "Warangal", admin1: "Telangana", country: "India", lat: 17.9784, lon: 79.6005 },
  { name: "Hyderabad", admin1: "Telangana", country: "India", lat: 17.3850, lon: 78.4867 },
  { name: "New Delhi", admin1: "Delhi", country: "India", lat: 28.6139, lon: 77.2090 },
  { name: "Mumbai", admin1: "Maharashtra", country: "India", lat: 19.0760, lon: 72.8777 },
  { name: "Bengaluru", admin1: "Karnataka", country: "India", lat: 12.9716, lon: 77.5946 },
];

export default function HomePage() {
  const [mode, setMode] = useState<"public" | "farmer">("public");
  const [upstreamStatus, setUpstreamStatus] = useState<string>("CHECKING");
  const [currentLabel, setCurrentLabel] = useState<string>("");
  const [selectedCoords, setSelectedCoords] = useState<{ lat: number; lon: number; district?: string; state?: string } | null>(null);

  const [weatherData, setWeatherData] = useState<WeatherForecastResponse | null>(null);
  const [alertsData, setAlertsData] = useState<OfficialAlertResponse | null>(null);
  const [riskData, setRiskData] = useState<RiskEvaluationResponse | null>(null);

  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Initial Health Check
  useEffect(() => {
    checkBackendHealth()
      .then((data) => {
        setUpstreamStatus(data.upstream_providers.open_meteo || "REACHABLE");
      })
      .catch(() => {
        setUpstreamStatus("UNREACHABLE");
      });
  }, []);

  // Fetch all live data when coordinates change
  const fetchLiveData = useCallback(async (lat: number, lon: number, label: string, district?: string, state?: string) => {
    setLoading(true);
    setError(null);
    setCurrentLabel(label);

    try {
      // 1. Fetch live Open-Meteo forecast
      const forecast = await getForecast(lat, lon);
      setWeatherData(forecast);

      // 2. Fetch official alerts status from IMD
      const alerts = await getOfficialAlerts(district, state, label);
      setAlertsData(alerts);

      // 3. Evaluate derived risk engine
      if (forecast.daily && forecast.daily.length > 0) {
        const risks = await evaluateRisks(forecast.daily);
        setRiskData(risks);
      }
    } catch (err: any) {
      console.error("Live weather data retrieval failed:", err);
      setError(err.message || "Failed to retrieve live atmospheric conditions.");
      setWeatherData(null);
      setAlertsData(null);
      setRiskData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleLocationSelect = (loc: LocationSearchResult) => {
    setSelectedCoords({ lat: loc.latitude, lon: loc.longitude, district: loc.admin2 || loc.name, state: loc.admin1 });
    fetchLiveData(loc.latitude, loc.longitude, loc.formatted_label, loc.admin2 || loc.name, loc.admin1);
  };

  const handleGeolocationSelect = (lat: number, lon: number, label: string) => {
    setSelectedCoords({ lat, lon });
    fetchLiveData(lat, lon, label);
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100">
      {/* Top Navigation */}
      <Header
        mode={mode}
        onModeChange={setMode}
        upstreamStatus={upstreamStatus}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Search & Location Bar */}
        <div className="space-y-3">
          <LocationSearchBar
            onLocationSelect={handleLocationSelect}
            onGeolocationSelect={handleGeolocationSelect}
            currentLabel={currentLabel}
          />

          {/* Quick-select location chips (Real Live Queries) */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs text-slate-400">
            <span className="shrink-0 flex items-center gap-1 font-medium text-slate-500">
              <MapPin className="w-3.5 h-3.5" /> Quick locations:
            </span>
            {SUGGESTED_LOCATIONS.map((loc) => (
              <button
                key={loc.name}
                onClick={() => {
                  setSelectedCoords({ lat: loc.lat, lon: loc.lon, district: loc.name, state: loc.admin1 });
                  fetchLiveData(loc.lat, loc.lon, `${loc.name}, ${loc.admin1}, ${loc.country}`, loc.name, loc.admin1);
                }}
                className={`shrink-0 px-2.5 py-1 rounded-lg border transition-all ${
                  currentLabel.startsWith(loc.name)
                    ? "bg-blue-600/30 border-blue-500 text-blue-200 font-semibold"
                    : "bg-slate-900 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700"
                }`}
              >
                {loc.name}
              </button>
            ))}
          </div>
        </div>

        {/* Error Notification */}
        {error && (
          <ErrorState
            message={error}
            onRetry={() => {
              if (selectedCoords) {
                fetchLiveData(selectedCoords.lat, selectedCoords.lon, currentLabel, selectedCoords.district, selectedCoords.state);
              }
            }}
          />
        )}

        {/* Initial Prompt State (No location selected yet) */}
        {!loading && !weatherData && !error && (
          <div className="p-12 text-center rounded-2xl bg-slate-900/60 border border-slate-800 max-w-xl mx-auto shadow-2xl space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center mx-auto">
              <Sparkles className="w-7 h-7" />
            </div>
            <h2 className="text-xl font-bold text-white tracking-tight">
              Ready for Real-time Weather Intelligence
            </h2>
            <p className="text-xs text-slate-400 leading-relaxed max-w-md mx-auto">
              Search any city or district above, opt-in with device geolocation, or choose a quick location to fetch authentic Numerical Weather Prediction forecasts and official alerts.
            </p>
          </div>
        )}

        {/* Loading Skeleton */}
        {loading && (
          <div className="space-y-6 animate-pulse">
            <div className="h-48 bg-slate-900/80 rounded-2xl border border-slate-800"></div>
            <div className="h-64 bg-slate-900/80 rounded-2xl border border-slate-800"></div>
          </div>
        )}

        {/* Live Weather & Risk Presentation */}
        {weatherData && !loading && (
          <div className="space-y-6">
            {/* Current Weather Hero Card */}
            <CurrentWeatherCard
              current={weatherData.current}
              locationLabel={currentLabel}
              latitude={weatherData.latitude}
              longitude={weatherData.longitude}
              elevation={weatherData.elevation}
              timezone={weatherData.timezone}
            />

            {/* Official Alerts Card (IMD / NDMA) */}
            <OfficialAlertsCard alertsData={alertsData} loading={loading} />

            {/* 24-Hour Authentic Hourly Forecast Trend */}
            <HourlyChart hourly={weatherData.hourly} />

            {/* Grid: 7-Day Outlook and Derived Risk */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* 7-Day Daily Outlook */}
              <DailyForecastList daily={weatherData.daily} />

              {/* Derived Risk Indicators */}
              <DerivedRiskCard riskData={riskData} loading={loading} />
            </div>

            {/* Farmer Mode Panel (Rendered only when Farmer Mode is active) */}
            {mode === "farmer" && (
              <FarmerModePanel daily={weatherData.daily} />
            )}
          </div>
        )}
      </main>

      {/* Transparent Provenance Footer */}
      <ProvenanceFooter
        provenance={weatherData?.provenance || null}
        timezone={weatherData?.timezone}
      />
    </div>
  );
}
