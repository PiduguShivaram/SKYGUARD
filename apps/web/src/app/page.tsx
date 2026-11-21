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
import { MapPin, Globe, Info } from "lucide-react";

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

    // Pre-fetch authentic global worldwide alerts
    setLoadingAlerts(true);
    getGlobalAlerts()
      .then((res) => setAlertsData(res))
      .catch((err) => console.error("Global alerts prefetch error:", err))
      .finally(() => setLoadingAlerts(false));
  }, []);

  // Fetch forecast, risks, and alerts for selected location
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

      // 3. Fetch Alerts (filtered by country/radius or global)
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
    <div className="min-h-screen flex flex-col bg-[#0e1117] text-zinc-100 font-sans selection:bg-blue-600 selection:text-white">
      {/* Restrained Application Header */}
      <Header
        upstreamStatus={upstreamStatus}
        currentMode={appMode}
        onModeChange={(m) => setAppMode(m)}
        onOpenNotifications={() => setIsNotificationModalOpen(true)}
        notificationsActive={notificationsActive}
      />

      {/* Main Content Viewport */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Search Bar & Location Selection */}
        <div className="space-y-3">
          <LocationSearchBar
            onLocationSelect={handleSelectLocation}
            selectedLocation={selectedLocation}
          />

          {/* Quick Location Shortcuts */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs text-zinc-400 max-w-2xl mx-auto scrollbar-none">
            <span className="shrink-0 text-zinc-500 font-medium text-[11px] mr-1">
              Popular:
            </span>
            {POPULAR_CITIES.map((c) => (
              <button
                key={c.name}
                onClick={() => handleSelectQuickCity(c)}
                className={`shrink-0 px-2.5 py-1 rounded-md border text-xs transition-colors ${
                  selectedLocation?.name === c.name
                    ? "bg-blue-600/15 border-blue-500/40 text-blue-300 font-medium"
                    : "bg-[#161b22] border-[#262c36] text-zinc-300 hover:text-white hover:border-[#3b4352]"
                }`}
              >
                <span>{c.name}</span>
                <span className="text-[10px] text-zinc-500 ml-1">({c.country})</span>
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

        {/* Initial Useful State: Guidance Bar (No oversized empty-state card) */}
        {!selectedLocation && !loadingWeather && !error && (
          <div className="surface-panel p-4 text-center max-w-2xl mx-auto text-xs text-zinc-400 flex items-center justify-center gap-2">
            <Info className="w-4 h-4 text-blue-400 shrink-0" />
            <span>Select a location to view local forecasts, or explore active worldwide disaster alerts below.</span>
          </div>
        )}

        {/* Loading Skeletons */}
        {loadingWeather && (
          <div className="space-y-4 animate-pulse">
            <div className="h-48 surface-panel"></div>
            <div className="h-48 surface-panel"></div>
          </div>
        )}

        {/* Live Weather Forecast Display */}
        {weatherData && !loadingWeather && (
          <>
            {/* PUBLIC MODE VIEW */}
            {appMode === "public" && (
              <div className="space-y-6">
                {/* 1. Current Conditions Hero */}
                <CurrentWeatherCard
                  weather={weatherData}
                  locationLabel={selectedLocation?.formatted_label || "Selected Location"}
                />

                {/* 2. Immediate Outlook: 24-Hour Hourly Forecast Ribbon */}
                <HourlyChart hourly={weatherData.hourly} units={weatherData.units} />

                {/* 3. Balanced Two-Column Operations Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Seven-Day Daily Summary */}
                  <DailyForecastList daily={weatherData.daily} units={weatherData.units} />

                  {/* Derived Scientific Weather Risk Indicators */}
                  <DerivedRiskCard riskData={riskData} loading={loadingRisk} />
                </div>
              </div>
            )}

            {/* FARMER MODE VIEW */}
            {appMode === "farmer" && (
              <div className="space-y-6">
                {/* Gated Farmer Mode Agrometeorology Panel */}
                <FarmerModePanel daily={weatherData.daily} />

                {/* Current Weather Card */}
                <CurrentWeatherCard
                  weather={weatherData}
                  locationLabel={selectedLocation?.formatted_label || "Selected Location"}
                />

                {/* Seven-Day Daily Summary */}
                <DailyForecastList daily={weatherData.daily} units={weatherData.units} />
              </div>
            )}
          </>
        )}

        {/* Worldwide Weather & Disaster Alerts Section */}
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

      {/* Web Push Notification Modal */}
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
