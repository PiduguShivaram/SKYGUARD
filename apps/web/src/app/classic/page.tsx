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
import { Info } from "lucide-react";

const POPULAR_CITIES = [
  { name: "Tokyo", label: "Tokyo, Japan", lat: 35.6895, lon: 139.6917, country: "JP" },
  { name: "London", label: "London, United Kingdom", lat: 51.5074, lon: -0.1278, country: "GB" },
  { name: "New York", label: "New York, NY, United States", lat: 40.7128, lon: -74.006, country: "US" },
  { name: "New Delhi", label: "New Delhi, Delhi, India", lat: 28.6139, lon: 77.209, country: "IN" },
  { name: "Paris", label: "Paris, France", lat: 48.8566, lon: 2.3522, country: "FR" },
  { name: "Sydney", label: "Sydney, NSW, Australia", lat: -33.8688, lon: 151.2093, country: "AU" },
];

export default function ClassicDashboard() {
  const [appMode, setAppMode] = useState<"public" | "farmer">("public");
  const [upstreamStatus, setUpstreamStatus] = useState<string>("CHECKING");
  const [selectedLocation, setSelectedLocation] = useState<LocationSearchResult | null>(null);
  const [weatherData, setWeatherData] = useState<WeatherForecastResponse | null>(null);
  const [riskData, setRiskData] = useState<RiskEvaluationResponse | null>(null);
  const [alertsData, setAlertsData] = useState<GlobalAlertsResponse | null>(null);
  const [isFiltered, setIsFiltered] = useState<boolean>(true);

  const [isNotificationModalOpen, setIsNotificationModalOpen] = useState<boolean>(false);
  const [notificationsActive, setNotificationsActive] = useState<boolean>(false);
  const [selectedAlertForDetail, setSelectedAlertForDetail] = useState<GlobalAlertItem | null>(null);

  const [loadingWeather, setLoadingWeather] = useState<boolean>(false);
  const [loadingRisk, setLoadingRisk] = useState<boolean>(false);
  const [loadingAlerts, setLoadingAlerts] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const subId = localStorage.getItem("skyguard_push_sub_id");
      setNotificationsActive(!!subId);
    }
  }, [isNotificationModalOpen]);

  useEffect(() => {
    checkBackendHealth()
      .then((h) => setUpstreamStatus(h.status === "healthy" ? "CONNECTED" : "DEGRADED"))
      .catch(() => setUpstreamStatus("UNAVAILABLE"));

    setLoadingAlerts(true);
    getGlobalAlerts()
      .then((res) => setAlertsData(res))
      .catch(() => setAlertsData(null))
      .finally(() => setLoadingAlerts(false));
  }, []);

  const fetchLocationData = useCallback(
    async (lat: number, lon: number, label: string, countryCode?: string, filterAlerts: boolean = true) => {
      setError(null);
      setLoadingWeather(true);
      setLoadingRisk(true);
      setLoadingAlerts(true);

      try {
        const weather = await getForecast(lat, lon);
        setWeatherData(weather);

        try {
          const risk = await evaluateRisks(weather.daily);
          setRiskData(risk);
        } catch {
          setRiskData(null);
        }

        try {
          const alerts = await getGlobalAlerts(filterAlerts ? countryCode : undefined, filterAlerts ? lat : undefined, filterAlerts ? lon : undefined, 500);
          setAlertsData(alerts);
        } catch {
          setAlertsData(null);
        }
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Failed to retrieve live forecast.");
        setWeatherData(null);
        setRiskData(null);
      } finally {
        setLoadingWeather(false);
        setLoadingRisk(false);
        setLoadingAlerts(false);
      }
    },
    []
  );

  const handleSelectLocation = (loc: LocationSearchResult) => {
    setSelectedLocation(loc);
    fetchLocationData(loc.latitude, loc.longitude, loc.formatted_label, loc.country_code, isFiltered);
  };

  const handleSelectQuickCity = (city: (typeof POPULAR_CITIES)[0]) => {
    const loc: LocationSearchResult = {
      id: Math.abs(city.lat * 1000),
      name: city.name,
      latitude: city.lat,
      longitude: city.lon,
      country_code: city.country,
      formatted_label: city.label,
    };
    setSelectedLocation(loc);
    fetchLocationData(city.lat, city.lon, city.label, city.country, isFiltered);
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#0C0F14] text-text-primary font-sans selection:bg-brand-fill selection:text-white">
      <Header
        upstreamStatus={upstreamStatus}
        currentMode={appMode}
        onModeChange={(m) => setAppMode(m)}
        onOpenNotifications={() => setIsNotificationModalOpen(true)}
        notificationsActive={notificationsActive}
      />

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        <div className="space-y-3">
          <LocationSearchBar onLocationSelect={handleSelectLocation} selectedLocation={selectedLocation} />

          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs text-text-muted max-w-2xl mx-auto scrollbar-none justify-center">
            <span className="shrink-0 text-text-muted font-medium text-[11px] mr-1">Popular:</span>
            {POPULAR_CITIES.map((c) => (
              <button
                key={c.name}
                onClick={() => handleSelectQuickCity(c)}
                className={`shrink-0 px-2.5 py-1.5 rounded-sg border text-xs transition-colors min-h-[36px] ${
                  selectedLocation?.name === c.name
                    ? "bg-brand-fill/15 border-brand-fill/40 text-brand-text font-medium"
                    : "bg-surface-panel border-border-subtle text-text-primary hover:text-white hover:border-border-strong"
                }`}
              >
                <span>{c.name}</span>
                <span className="text-[10px] text-text-muted ml-1">({c.country})</span>
              </button>
            ))}
          </div>
        </div>

        {error && (
          <ErrorState
            title="Weather Provider Unavailable"
            message={error}
            onRetry={() => {
              if (selectedLocation) {
                fetchLocationData(selectedLocation.latitude, selectedLocation.longitude, selectedLocation.formatted_label, selectedLocation.country_code, isFiltered);
              }
            }}
          />
        )}

        {!selectedLocation && !loadingWeather && !error && (
          <div className="surface-panel rounded-sg p-4 text-center max-w-2xl mx-auto text-xs text-text-muted flex items-center justify-center gap-2">
            <Info className="w-4 h-4 text-brand-text shrink-0" />
            <span>Select a location to view local forecasts, or explore active worldwide disaster alerts below.</span>
          </div>
        )}

        {appMode === "public" && (
          <div className="space-y-6">
            {weatherData && (
              <>
                <CurrentWeatherCard
                  weather={weatherData}
                  locationLabel={selectedLocation?.formatted_label || "Selected Location"}
                />
                <HourlyChart
                  hourly={weatherData.hourly}
                  units={weatherData.units}
                />
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <DailyForecastList daily={weatherData.daily} units={weatherData.units} />
                  <DerivedRiskCard riskData={riskData} loading={loadingRisk} />
                </div>
              </>
            )}

            <GlobalAlertsPanel
              alertsData={alertsData}
              loading={loadingAlerts}
              onRefresh={() => {
                setLoadingAlerts(true);
                getGlobalAlerts(isFiltered ? selectedLocation?.country_code : undefined)
                  .then((res) => setAlertsData(res))
                  .finally(() => setLoadingAlerts(false));
              }}
              selectedCountry={selectedLocation?.country_code}
              selectedLabel={selectedLocation?.formatted_label}
              isFiltered={isFiltered}
              onToggleFilter={() => {
                const nextFiltered = !isFiltered;
                setIsFiltered(nextFiltered);
                if (selectedLocation) {
                  fetchLocationData(selectedLocation.latitude, selectedLocation.longitude, selectedLocation.formatted_label, selectedLocation.country_code, nextFiltered);
                }
              }}
              onSelectAlert={(alert) => setSelectedAlertForDetail(alert)}
              onOpenNotifications={() => setIsNotificationModalOpen(true)}
            />
          </div>
        )}

        {appMode === "farmer" && (
          <FarmerModePanel daily={weatherData?.daily || []} />
        )}
      </main>

      <ProvenanceFooter weather={weatherData} />

      <NotificationSettingsModal
        isOpen={isNotificationModalOpen}
        onClose={() => setIsNotificationModalOpen(false)}
        selectedLocationLabel={selectedLocation?.formatted_label}
      />

      <AlertDetailModal
        alertId={selectedAlertForDetail?.id || null}
        onClose={() => setSelectedAlertForDetail(null)}
        preloadedAlert={selectedAlertForDetail}
      />
    </div>
  );
}
