"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Header } from "@/components/Header";
import { LocationSearchBar } from "@/components/LocationSearchBar";
import { CurrentWeatherCard } from "@/components/CurrentWeatherCard";
import { HourlyChart } from "@/components/HourlyChart";
import { DailyForecastList } from "@/components/DailyForecastList";
import { DerivedRiskCard } from "@/components/DerivedRiskCard";
import { FarmerModePanel } from "@/components/FarmerModePanel";
import { GlobalAlertsPanel } from "@/components/GlobalAlertsPanel";
import { NotificationSettingsModal } from "@/components/NotificationSettingsModal";
import { AlertDetailModal } from "@/components/AlertDetailModal";
import { ProvenanceFooter } from "@/components/ProvenanceFooter";
import { ErrorState } from "@/components/ErrorState";
import { checkBackendHealth, evaluateRisks, getForecast, getGlobalAlerts } from "@/lib/api";
import {
  GlobalAlertItem,
  GlobalAlertsResponse,
  LocationSearchResult,
  RiskEvaluationResponse,
  WeatherForecastResponse,
} from "@/types";
import { MapPin, CloudSun, Sprout, User, Compass, Globe, Sparkles } from "lucide-react";

const POPULAR_CITIES = [
  { name: "Warangal", label: "Warangal, Telangana, India", lat: 17.9784, lon: 79.6005, country: "IN" },
  { name: "Tokyo", label: "Tokyo, Japan", lat: 35.6895, lon: 139.6917, country: "JP" },
  { name: "London", label: "London, United Kingdom", lat: 51.5074, lon: -0.1278, country: "GB" },
  { name: "New York", label: "New York, NY, United States", lat: 40.7128, lon: -74.0060, country: "US" },
  { name: "Sydney", label: "Sydney, NSW, Australia", lat: -33.8688, lon: 151.2093, country: "AU" },
  { name: "Berlin", label: "Berlin, Germany", lat: 52.5200, lon: 13.4050, country: "DE" },
];

export default function SkyGuardDashboard() {
  const [appMode, setAppMode] = useState<"public" | "farmer">("public");
  const [upstreamStatus, setUpstreamStatus] = useState<string>("CHECKING");
  const [selectedLocation, setSelectedLocation] = useState<LocationSearchResult | null>(null);
  const [weatherData, setWeatherData] = useState<WeatherForecastResponse | null>(null);
  const [riskData, setRiskData] = useState<RiskEvaluationResponse | null>(null);
  const [alertsData, setAlertsData] = useState<GlobalAlertsResponse | null>(null);
  const [isFiltered, setIsFiltered] = useState<boolean>(true);

  // Modals & Push Notifications
  const [isNotificationModalOpen, setIsNotificationModalOpen] = useState<boolean>(false);
  const [notificationsActive, setNotificationsActive] = useState<boolean>(false);
  const [selectedAlertForDetail, setSelectedAlertForDetail] = useState<GlobalAlertItem | null>(null);

  const [loadingWeather, setLoadingWeather] = useState<boolean>(false);
  const [loadingRisk, setLoadingRisk] = useState<boolean>(false);
  const [loadingAlerts, setLoadingAlerts] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Check push subscription state from localStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      const subId = localStorage.getItem("skyguard_push_sub_id");
      setNotificationsActive(!!subId);
    }
  }, [isNotificationModalOpen]);

  // Initial Health Check and Global Alerts Pre-load
  useEffect(() => {
    checkBackendHealth()
      .then((data) => {
        setUpstreamStatus(data.status === "HEALTHY" ? "HEALTHY" : data.status === "DEGRADED" ? "DEGRADED" : "UNAVAILABLE");
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

  // Fetch forecast, risks, and filtered alerts when location is selected
  const fetchLocationData = useCallback(
    async (lat: number, lon: number, label: string, countryCode?: string, filterActive: boolean = true) => {
      setLoadingWeather(true);
      setError(null);

      // 1. Fetch Forecast from Open-Meteo
      try {
        const forecast = await getForecast(lat, lon);
        setWeatherData(forecast);

        // 2. Compute Derived Scientific Risk Indicators
        if (forecast.daily && forecast.daily.length > 0) {
          setLoadingRisk(true);
          evaluateRisks(forecast.daily)
            .then((r) => setRiskData(r))
            .catch((err) => console.error("Risk evaluation error:", err))
            .finally(() => setLoadingRisk(false));
        }
      } catch (err: any) {
        console.error("Weather forecast error:", err);
        setError(err.message || "Failed to load Open-Meteo forecast.");
        setWeatherData(null);
        setRiskData(null);
      } finally {
        setLoadingWeather(false);
      }

      // 3. Fetch Alerts (either filtered by country/radius or global)
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
    <div className="min-h-screen flex flex-col bg-[#06090e] text-slate-100 font-sans selection:bg-sky-500 selection:text-white">
      {/* Header with Mode Switcher & Push Bell */}
      <Header
        upstreamStatus={upstreamStatus}
        currentMode={appMode}
        onModeChange={(m) => setAppMode(m)}
        onOpenNotifications={() => setIsNotificationModalOpen(true)}
        notificationsActive={notificationsActive}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-7 space-y-7">
        {/* Search Bar & Location Selection */}
        <div className="space-y-3.5">
          <LocationSearchBar
            onLocationSelect={handleSelectLocation}
            selectedLocation={selectedLocation}
          />

          {/* Global Popular Cities Chips */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs text-slate-400 scrollbar-none">
            <span className="shrink-0 flex items-center gap-1.5 font-semibold text-slate-400 tracking-wider uppercase text-[11px]">
              <MapPin className="w-3.5 h-3.5 text-sky-400" /> Popular Global Cities:
            </span>
            {POPULAR_CITIES.map((c) => (
              <button
                key={c.name}
                onClick={() => handleSelectQuickCity(c)}
                className={`shrink-0 px-3 py-1.5 rounded-xl border text-xs font-medium transition-all duration-150 flex items-center gap-1.5 ${
                  selectedLocation?.name === c.name
                    ? "bg-sky-500/20 border-sky-400/50 text-sky-200 font-semibold shadow-[0_0_12px_rgba(14,165,233,0.3)]"
                    : "bg-[#0b1220] border-white/[0.08] text-slate-300 hover:text-white hover:border-slate-600 hover:bg-white/[0.04]"
                }`}
              >
                <span>{c.name}</span>
                <span className="text-[10px] font-mono opacity-60">({c.country})</span>
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
          <div className="relative overflow-hidden p-10 sm:p-12 text-center rounded-3xl bg-gradient-to-b from-[#0e1628] to-[#080d1a] border border-white/[0.1] max-w-xl mx-auto shadow-2xl space-y-4 backdrop-blur-xl">
            <div className="absolute top-0 right-1/2 translate-x-1/2 -mt-16 w-64 h-64 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />
            <div className="relative z-10 w-16 h-16 rounded-2xl bg-gradient-to-br from-sky-500/20 via-sky-600/10 to-transparent border border-sky-500/30 text-sky-400 flex items-center justify-center mx-auto shadow-[0_0_20px_-3px_rgba(14,165,233,0.3)]">
              <CloudSun className="w-8 h-8" />
            </div>
            <h2 className="relative z-10 text-xl sm:text-2xl font-extrabold text-white tracking-tight">
              Ready for Global Weather &amp; Disaster Intelligence
            </h2>
            <p className="relative z-10 text-xs sm:text-sm text-slate-400 leading-relaxed max-w-md mx-auto">
              Search any city worldwide or choose a popular city above to query genuine Open-Meteo forecasts alongside live WMO CAP and GDACS international disaster alerts.
            </p>
          </div>
        )}

        {/* Loading Skeletons */}
        {loadingWeather && (
          <div className="space-y-6 animate-pulse">
            <div className="h-64 bg-[#0c1322]/80 rounded-3xl border border-white/[0.08]"></div>
            <div className="h-64 bg-[#0c1322]/80 rounded-3xl border border-white/[0.08]"></div>
          </div>
        )}

        {/* Live Weather Forecast Display */}
        {weatherData && !loadingWeather && (
          <>
            {/* PUBLIC MODE VIEW */}
            {appMode === "public" && (
              <div className="space-y-7">
                {/* Current Conditions Hero Card */}
                <CurrentWeatherCard
                  weather={weatherData}
                  locationLabel={selectedLocation?.formatted_label || "Selected Coordinates"}
                />

                {/* 24-Hour Hourly Trend Curve */}
                <HourlyChart hourly={weatherData.hourly} units={weatherData.units} />

                {/* Seven-Day Daily Summary */}
                <DailyForecastList daily={weatherData.daily} units={weatherData.units} />

                {/* Phase 3: Derived Scientific Weather Risk Indicators */}
                <DerivedRiskCard riskData={riskData} loading={loadingRisk} />
              </div>
            )}

            {/* FARMER MODE VIEW */}
            {appMode === "farmer" && (
              <div className="space-y-7">
                {/* Phase 4: Gated Farmer Mode Agrometeorology Panel */}
                <FarmerModePanel daily={weatherData.daily} />

                {/* Current Weather Card */}
                <CurrentWeatherCard
                  weather={weatherData}
                  locationLabel={selectedLocation?.formatted_label || "Selected Coordinates"}
                />

                {/* Seven-Day Daily Summary */}
                <DailyForecastList daily={weatherData.daily} units={weatherData.units} />
              </div>
            )}
          </>
        )}

        {/* Phase 2: Worldwide Weather & Disaster Alerts Panel */}
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
          onSelectAlert={(alert) => setSelectedAlertForDetail(alert)}
          onOpenNotifications={() => setIsNotificationModalOpen(true)}
        />
      </main>

      {/* Provenance & Transparency Footer */}
      <ProvenanceFooter weather={weatherData} />

      {/* Global Push Notification Modal */}
      <NotificationSettingsModal
        isOpen={isNotificationModalOpen}
        onClose={() => setIsNotificationModalOpen(false)}
        selectedCountry={selectedLocation?.country_code}
        selectedLatitude={selectedLocation?.latitude}
        selectedLongitude={selectedLocation?.longitude}
        selectedLocationLabel={selectedLocation?.formatted_label}
      />

      {/* Alert Detail Modal */}
      <AlertDetailModal
        alertId={selectedAlertForDetail?.id || null}
        preloadedAlert={selectedAlertForDetail}
        onClose={() => setSelectedAlertForDetail(null)}
      />
    </div>
  );
}
