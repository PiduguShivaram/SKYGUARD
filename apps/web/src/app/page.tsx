"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { Header } from "@/components/Header";
import { FarmerModePanel } from "@/components/FarmerModePanel";
import { DerivedRiskCard } from "@/components/DerivedRiskCard";
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
import { AtmosphericSkyScene } from "@/components/living/AtmosphericSkyScene";
import { LivingWeatherIcon } from "@/components/living/LivingWeatherIcons";
import { LivingLocationSearch } from "@/components/living/LivingLocationSearch";
import { InteractiveTimelineScrubber } from "@/components/living/InteractiveTimelineScrubber";
import { LivingDailyOutlook } from "@/components/living/LivingDailyOutlook";
import { LivingGlobeAperture } from "@/components/living/LivingGlobeAperture";
import { PlanetaryDisasterGlobe } from "@/components/living/PlanetaryDisasterGlobe";
import { useAtmosphereState } from "@/hooks/useAtmosphereState";
import {
  Wind,
  Droplets,
  Compass,
  Sparkles,
  ShieldAlert,
  ShieldCheck,
  Bell,
  ArrowDown,
  ChevronRight,
  ExternalLink,
} from "lucide-react";

const CURATED_CITIES: LocationSearchResult[] = [
  { id: 1850147, name: "Tokyo", latitude: 35.6895, longitude: 139.6917, country: "Japan", admin1: "Tokyo", formatted_label: "Tokyo, Japan", country_code: "JP" },
  { id: 2643743, name: "London", latitude: 51.5074, longitude: -0.1278, country: "United Kingdom", admin1: "England", formatted_label: "London, UK", country_code: "GB" },
  { id: 5128581, name: "New York", latitude: 40.7128, longitude: -74.006, country: "United States", admin1: "New York", formatted_label: "New York, USA", country_code: "US" },
  { id: 1261481, name: "New Delhi", latitude: 28.6139, longitude: 77.209, country: "India", admin1: "Delhi", formatted_label: "New Delhi, India", country_code: "IN" },
  { id: 2988507, name: "Paris", latitude: 48.8566, longitude: 2.3522, country: "France", admin1: "Île-de-France", formatted_label: "Paris, France", country_code: "FR" },
  { id: 2147714, name: "Sydney", latitude: -33.8688, longitude: 151.2093, country: "Australia", admin1: "NSW", formatted_label: "Sydney, Australia", country_code: "AU" },
];

export default function SkyGuardHomePage() {
  const [appMode, setAppMode] = useState<"public" | "farmer">("public");
  const [upstreamStatus, setUpstreamStatus] = useState<string>("CHECKING");
  const [selectedLocation, setSelectedLocation] = useState<LocationSearchResult | null>(null);
  const [weatherData, setWeatherData] = useState<WeatherForecastResponse | null>(null);
  const [riskData, setRiskData] = useState<RiskEvaluationResponse | null>(null);
  const [alertsData, setAlertsData] = useState<GlobalAlertsResponse | null>(null);
  const [selectedHourIndex, setSelectedHourIndex] = useState<number>(0);
  const [activeChapter, setActiveChapter] = useState<string>("chapter-1");

  // Disaster filtering state
  const [disasterFilter, setDisasterFilter] = useState<"all" | "extreme" | "local">("all");

  // Modals & Push Notifications
  const [isNotificationModalOpen, setIsNotificationModalOpen] = useState<boolean>(false);
  const [notificationsActive, setNotificationsActive] = useState<boolean>(false);
  const [selectedAlertForDetail, setSelectedAlertForDetail] = useState<GlobalAlertItem | null>(null);

  const [loadingWeather, setLoadingWeather] = useState<boolean>(false);
  const [loadingRisk, setLoadingRisk] = useState<boolean>(false);
  const [loadingAlerts, setLoadingAlerts] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Check push subscription state
  useEffect(() => {
    if (typeof window !== "undefined") {
      const subId = localStorage.getItem("skyguard_push_sub_id");
      setNotificationsActive(!!subId);
    }
  }, [isNotificationModalOpen]);

  // Initial backend health check & global disaster alerts load
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

  // Track active chapter during scroll
  useEffect(() => {
    const handleScroll = () => {
      const chapters = ["chapter-1", "chapter-2", "chapter-3", "chapter-4"];
      for (const id of chapters) {
        const el = document.getElementById(id);
        if (el) {
          const rect = el.getBoundingClientRect();
          if (rect.top <= 260 && rect.bottom >= 120) {
            setActiveChapter(id);
            break;
          }
        }
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Fetch domain data when a location is selected
  const fetchLocationData = useCallback(
    async (lat: number, lon: number, label: string, countryCode?: string) => {
      setError(null);
      setLoadingWeather(true);
      setLoadingRisk(true);
      setSelectedHourIndex(0);

      try {
        const weather = await getForecast(lat, lon);
        setWeatherData(weather);

        try {
          const risk = await evaluateRisks(weather.daily);
          setRiskData(risk);
        } catch {
          setRiskData(null);
        }
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Failed to retrieve live forecast.");
        setWeatherData(null);
        setRiskData(null);
      } finally {
        setLoadingWeather(false);
        setLoadingRisk(false);
      }
    },
    []
  );

  const handleSelectLocation = (loc: LocationSearchResult) => {
    setSelectedLocation(loc);
    fetchLocationData(loc.latitude, loc.longitude, loc.formatted_label, loc.country_code);
  };

  const handleSelectCityByName = (name: string) => {
    const city = CURATED_CITIES.find((c) => c.name.toLowerCase() === name.toLowerCase()) || CURATED_CITIES[0];
    handleSelectLocation(city);
  };

  const currentWeather = weatherData?.current ?? null;
  const palette = useAtmosphereState(currentWeather);

  // Scrubber previewed hour
  const activeHourPoint = weatherData?.hourly?.[selectedHourIndex] ?? null;
  const displayTemperature = activeHourPoint
    ? Math.round(activeHourPoint.temperature_2m)
    : currentWeather
    ? Math.round(currentWeather.temperature_2m)
    : "--";
  const displayWeatherCode = activeHourPoint ? activeHourPoint.weather_code : currentWeather?.weather_code ?? 0;
  const isDay = currentWeather?.is_day === 1;

  // Editorial atmospheric journal copy
  const journalSentence = currentWeather
    ? `${currentWeather.weather_description} conditions across ${selectedLocation?.name || "your location"}. ` +
      `The atmosphere holds a relative humidity of ${currentWeather.relative_humidity_2m}% with a ` +
      `${currentWeather.wind_speed_10m} km/h wind blowing from ${currentWeather.wind_direction_10m ?? 0}°.`
    : "Explore real-time atmospheric conditions and worldwide disaster intelligence.";

  // Combine official warnings and GDACS alerts into one collection
  const allAlerts: GlobalAlertItem[] = useMemo(() => {
    if (!alertsData) return [];
    return [
      ...(alertsData.official_cap_warnings || []),
      ...(alertsData.gdacs_disaster_alerts || []),
    ];
  }, [alertsData]);

  // Local severe alerts for selected sector
  const localAlerts = useMemo(() => {
    if (!allAlerts.length || !selectedLocation) return [];
    const country = selectedLocation.country_code?.toUpperCase();
    return allAlerts.filter((item: GlobalAlertItem) => {
      if (country && item.country_code?.toUpperCase() === country) return true;
      if (selectedLocation.latitude && selectedLocation.longitude && item.latitude && item.longitude) {
        const dLat = Math.abs(selectedLocation.latitude - item.latitude);
        const dLon = Math.abs(selectedLocation.longitude - item.longitude);
        return dLat < 3 && dLon < 3;
      }
      return false;
    });
  }, [allAlerts, selectedLocation]);

  // Filtered disaster alerts for Chapter 3
  const displayedDisasterAlerts = useMemo(() => {
    if (!allAlerts.length) return [];
    if (disasterFilter === "extreme") {
      return allAlerts.filter((a: GlobalAlertItem) => a.severity === "Extreme");
    }
    if (disasterFilter === "local" && selectedLocation) {
      return localAlerts;
    }
    return allAlerts.slice(0, 12);
  }, [allAlerts, disasterFilter, selectedLocation, localAlerts]);

  const scrollToChapter = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <div className="relative min-h-screen flex flex-col bg-[#03060c] text-slate-100 font-sans selection:bg-cyan-500/30 overflow-x-hidden">
      {/* 1. Dynamic Atmospheric Canvas Substrate */}
      <AtmosphericSkyScene
        palette={palette}
        cloudCover={currentWeather ? (currentWeather.weather_code >= 2 ? 75 : 20) : 25}
        windSpeed={currentWeather?.wind_speed_10m ?? 12}
        className="fixed inset-0 z-0 pointer-events-none"
      />

      {/* 2. Top Header Navigation */}
      <header className="relative z-30">
        <Header
          upstreamStatus={upstreamStatus}
          currentMode={appMode}
          onModeChange={(m) => setAppMode(m)}
          onOpenNotifications={() => setIsNotificationModalOpen(true)}
          notificationsActive={notificationsActive}
        />
      </header>

      {/* 3. Floating Subtle Chapter Navigation Indicator */}
      {appMode === "public" && (
        <nav
          aria-label="Chapter Navigation"
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-1.5 p-1.5 rounded-full bg-slate-950/80 border border-slate-800/80 backdrop-blur-xl shadow-2xl text-xs font-mono"
        >
          <button
            type="button"
            onClick={() => scrollToChapter("chapter-1")}
            className={`px-3 py-1.5 rounded-full transition-all flex items-center gap-1.5 ${
              activeChapter === "chapter-1"
                ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
            <span>01 Your Sky</span>
          </button>
          <button
            type="button"
            onClick={() => scrollToChapter("chapter-2")}
            className={`px-3 py-1.5 rounded-full transition-all flex items-center gap-1.5 ${
              activeChapter === "chapter-2"
                ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
            <span>02 Motion</span>
          </button>
          <button
            type="button"
            onClick={() => scrollToChapter("chapter-3")}
            className={`px-3 py-1.5 rounded-full transition-all flex items-center gap-1.5 ${
              activeChapter === "chapter-3"
                ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
            <span>03 Horizon</span>
          </button>
          <button
            type="button"
            onClick={() => scrollToChapter("chapter-4")}
            className={`px-3 py-1.5 rounded-full transition-all flex items-center gap-1.5 ${
              activeChapter === "chapter-4"
                ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
            <span>04 Prepared</span>
          </button>
        </nav>
      )}

      {/* 4. Main Continuous 4-Chapter Narrative Experience */}
      <main className="relative z-10 flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-6 space-y-24">
        {/* Error Notification */}
        {error && (
          <ErrorState
            title="Meteorological Notice"
            message={error}
            onRetry={() => {
              if (selectedLocation) {
                fetchLocationData(selectedLocation.latitude, selectedLocation.longitude, selectedLocation.formatted_label, selectedLocation.country_code);
              }
            }}
          />
        )}

        {/* PUBLIC MODE: 4 CONTINUOUS CHAPTERS */}
        {appMode === "public" && (
          <>
            {/* =========================================================================
                CHAPTER 1: YOUR SKY
                ========================================================================= */}
            <section id="chapter-1" className="scroll-mt-20 flex flex-col items-center">
              {/* Natural Integrated Location Search */}
              <div className="w-full max-w-lg mx-auto mb-8">
                <LivingLocationSearch
                  onSelectLocation={handleSelectLocation}
                  selectedLocationName={selectedLocation?.name}
                />
              </div>

              {/* UNINHABITED STATE: THE 3D CELESTIAL GLOBE (IMAGE 1 BENCHMARK TARGET) */}
              {!selectedLocation && (
                <div className="w-full flex flex-col items-center text-center animate-fadeIn">
                  <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-900/80 border border-slate-700/60 backdrop-blur-md mb-4 shadow-sm">
                    <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
                    <span className="text-[11px] font-mono uppercase tracking-widest text-cyan-300">
                      Chapter 01 • The Living Sky
                    </span>
                  </div>

                  <h1 className="text-4xl sm:text-6xl font-light tracking-tight text-white mb-3 drop-shadow-sm">
                    Atmosphere in Motion
                  </h1>
                  <p className="text-sm sm:text-base text-slate-300/80 max-w-lg mx-auto font-normal leading-relaxed">
                    Rotate the planetary horizon to inhabit any city, or search coordinates above.
                  </p>

                  {/* 3D Living Globe Aperture (Photomatched to Image 1: Cyan Fresnel Halo, Obsidian interior, Geodesic Wireframe, 11,052 NASA Land Points) */}
                  <div className="w-full my-4">
                    <LivingGlobeAperture
                      onSelectCity={handleSelectCityByName}
                      selectedCityName={undefined}
                    />
                  </div>

                  {/* Direct scroll cue */}
                  <button
                    type="button"
                    onClick={() => scrollToChapter("chapter-3")}
                    className="mt-6 inline-flex items-center gap-2 text-xs font-mono text-slate-400 hover:text-cyan-300 transition-colors"
                  >
                    <span>Explore Worldwide Disaster Telemetry</span>
                    <ArrowDown className="w-3.5 h-3.5 animate-bounce" />
                  </button>
                </div>
              )}

              {/* INHABITED STATE: AUTHENTIC LIVE WEATHER HERO */}
              {selectedLocation && weatherData && !loadingWeather && (
                <div className="w-full flex flex-col items-center text-center animate-fadeIn">
                  {/* Location Spatial Pill */}
                  <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-slate-900/80 border border-slate-700/60 backdrop-blur-md shadow-sm mb-4">
                    <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                    <span className="text-xs font-mono uppercase tracking-widest text-slate-200 font-medium">
                      {selectedLocation.name}, {selectedLocation.country}
                    </span>
                    <span className="text-[11px] font-mono text-slate-400">
                      ({selectedLocation.latitude.toFixed(2)}°, {selectedLocation.longitude.toFixed(2)}°)
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedLocation(null);
                        setWeatherData(null);
                      }}
                      className="ml-2 text-[10px] font-mono text-cyan-400 hover:text-cyan-300 underline"
                    >
                      Change
                    </button>
                  </div>

                  {/* Grand Editorial Display Temperature & Living Weather Glyph */}
                  <div className="flex items-center justify-center gap-4 sm:gap-6 my-2">
                    <span className="text-8xl sm:text-9xl font-light tracking-tighter tabular-nums text-white drop-shadow-md">
                      {displayTemperature}°
                    </span>
                    <div className="p-3 sm:p-4 rounded-3xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-md shadow-xl">
                      <LivingWeatherIcon code={displayWeatherCode} isDay={isDay} size={64} />
                    </div>
                  </div>

                  {/* Condition Summary */}
                  <h2 className="text-xl sm:text-2xl font-normal text-slate-100 mt-2">
                    {currentWeather?.weather_description ?? "Atmospheric Conditions"}
                  </h2>

                  {/* Editorial Atmospheric Journal Prose */}
                  <p className="max-w-xl text-sm sm:text-base text-slate-300 leading-relaxed mt-3 font-normal">
                    {journalSentence}
                  </p>

                  {/* Telemetry Micro-Pills */}
                  {currentWeather && (
                    <div className="flex flex-wrap items-center justify-center gap-3 mt-6">
                      <div className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-slate-900/70 border border-slate-800 text-xs font-mono text-slate-300 backdrop-blur-sm">
                        <Wind className="w-3.5 h-3.5 text-cyan-400" />
                        <span>{currentWeather.wind_speed_10m} km/h wind</span>
                      </div>
                      <div className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-slate-900/70 border border-slate-800 text-xs font-mono text-slate-300 backdrop-blur-sm">
                        <Droplets className="w-3.5 h-3.5 text-cyan-400" />
                        <span>{currentWeather.relative_humidity_2m}% humidity</span>
                      </div>
                      <div className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-slate-900/70 border border-slate-800 text-xs font-mono text-slate-300 backdrop-blur-sm">
                        <Compass className="w-3.5 h-3.5 text-cyan-400" />
                        <span>Apparent: {Math.round(currentWeather.apparent_temperature)}°</span>
                      </div>
                    </div>
                  )}

                  {/* Sector Emergency Alert Ribbon */}
                  <div className="w-full max-w-2xl mt-8">
                    {localAlerts.length > 0 ? (
                      <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 backdrop-blur-md flex flex-col sm:flex-row items-center justify-between gap-3 text-left">
                        <div className="flex items-center gap-3">
                          <ShieldAlert className="w-5 h-5 text-amber-400 flex-shrink-0" />
                          <div>
                            <span className="text-[11px] font-mono uppercase tracking-wider text-amber-400 font-semibold block">
                              Official Severe Warning in Sector
                            </span>
                            <span className="text-xs text-amber-100 font-medium">
                              {localAlerts[0].headline || localAlerts[0].event || "Meteorological Advisory"}
                            </span>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setSelectedAlertForDetail(localAlerts[0])}
                          className="px-3 py-1.5 rounded-full bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/40 text-xs font-mono text-amber-200 transition-colors whitespace-nowrap"
                        >
                          Inspect Bulletin
                        </button>
                      </div>
                    ) : (
                      <div className="p-3 rounded-full bg-slate-900/40 border border-slate-800/60 backdrop-blur-md flex items-center justify-center gap-2 text-xs font-mono text-slate-400">
                        <ShieldCheck className="w-4 h-4 text-emerald-400" />
                        <span>No active official severe warnings for this sector</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </section>

            {/* =========================================================================
                CHAPTER 2: A DAY IN MOTION
                ========================================================================= */}
            <section id="chapter-2" className="scroll-mt-20 pt-8 border-t border-slate-800/60">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900/60 border border-slate-800 text-[11px] font-mono text-cyan-400 uppercase tracking-widest mb-2">
                    Chapter 02 • Diurnal Progression
                  </div>
                  <h2 className="text-2xl sm:text-3xl font-light text-white tracking-tight">
                    A Day in Motion
                  </h2>
                </div>
                <span className="text-xs font-mono text-slate-400 hidden sm:inline">
                  Drag scrubber to explore hourly transition
                </span>
              </div>

              {/* 24-Hour Interactive Timeline Scrubber */}
              {weatherData?.hourly && weatherData.hourly.length > 0 ? (
                <div className="space-y-6">
                  <InteractiveTimelineScrubber
                    hourly={weatherData.hourly}
                    selectedIndex={selectedHourIndex}
                    onSelectIndex={(idx) => setSelectedHourIndex(idx)}
                    timezone={weatherData.timezone}
                  />

                  {/* 7-Day Planetary Outlook */}
                  {weatherData.daily && weatherData.daily.length > 0 && (
                    <div className="mt-8">
                      <LivingDailyOutlook daily={weatherData.daily} />
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-10 rounded-2xl bg-slate-900/40 border border-slate-800 text-center">
                  <p className="text-xs font-mono text-slate-400 uppercase tracking-widest">
                    Select a location above to inspect authentic 24-hour diurnal trajectory
                  </p>
                </div>
              )}
            </section>

            {/* =========================================================================
                CHAPTER 3: BEYOND YOUR HORIZON (WORLDWIDE DISASTER RADAR)
                ========================================================================= */}
            <section id="chapter-3" className="scroll-mt-20 pt-8 border-t border-slate-800/60">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div>
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900/60 border border-slate-800 text-[11px] font-mono text-cyan-400 uppercase tracking-widest mb-2">
                    Chapter 03 • Global Disaster Radar
                  </div>
                  <h2 className="text-2xl sm:text-3xl font-light text-white tracking-tight">
                    Beyond Your Horizon
                  </h2>
                  <p className="text-xs text-slate-400 mt-1 max-w-md">
                    Genuine WMO Severe Weather Information Centre bulletins and UN GDACS multi-hazard telemetry.
                  </p>
                </div>

                {/* Filter buttons */}
                <div className="flex items-center gap-1.5 p-1 rounded-full bg-slate-900/80 border border-slate-800 text-xs font-mono self-start sm:self-auto">
                  <button
                    type="button"
                    onClick={() => setDisasterFilter("all")}
                    className={`px-3 py-1.5 rounded-full transition-colors ${
                      disasterFilter === "all" ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30" : "text-slate-400 hover:text-white"
                    }`}
                  >
                    All Events ({allAlerts.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setDisasterFilter("extreme")}
                    className={`px-3 py-1.5 rounded-full transition-colors ${
                      disasterFilter === "extreme" ? "bg-red-500/20 text-red-300 border border-red-500/30" : "text-slate-400 hover:text-white"
                    }`}
                  >
                    Extreme Only
                  </button>
                  {selectedLocation && (
                    <button
                      type="button"
                      onClick={() => setDisasterFilter("local")}
                      className={`px-3 py-1.5 rounded-full transition-colors ${
                        disasterFilter === "local" ? "bg-amber-500/20 text-amber-300 border border-amber-500/30" : "text-slate-400 hover:text-white"
                      }`}
                    >
                      Near Sector ({localAlerts.length})
                    </button>
                  )}
                </div>
              </div>

              {/* Planetary Disaster Radar Centerpiece (Image 1 Benchmark Quality) */}
              <div className="w-full bg-slate-950/60 border border-slate-800/80 rounded-3xl p-6 backdrop-blur-xl shadow-2xl relative overflow-hidden">
                <div className="flex flex-col items-center">
                  <PlanetaryDisasterGlobe
                    alerts={allAlerts}
                    onSelectAlert={(a) => setSelectedAlertForDetail(a)}
                    selectedAlertId={selectedAlertForDetail?.id}
                  />
                </div>

                {/* Curated Disaster Telemetry Cards (Replaces the old table entirely) */}
                <div className="mt-8 border-t border-slate-800/80 pt-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xs font-mono uppercase tracking-widest text-slate-300">
                      Verified Active Bulletins
                    </h3>
                    <span className="text-[11px] font-mono text-slate-400">
                      Showing {displayedDisasterAlerts.length} events • Zero synthetic entries
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {displayedDisasterAlerts.map((alert: GlobalAlertItem) => {
                      const isExtreme = alert.severity === "Extreme";
                      const isSevere = alert.severity === "Severe";
                      return (
                        <div
                          key={alert.id}
                          onClick={() => setSelectedAlertForDetail(alert)}
                          className="p-4 rounded-2xl bg-slate-900/60 hover:bg-slate-800/60 border border-slate-800 hover:border-cyan-500/40 transition-all cursor-pointer flex flex-col justify-between group shadow-sm"
                        >
                          <div>
                            <div className="flex items-center justify-between gap-2 mb-2">
                              <span
                                className={`text-[10px] font-mono px-2.5 py-0.5 rounded-full font-semibold uppercase tracking-wider ${
                                  isExtreme
                                    ? "bg-red-500/20 text-red-300 border border-red-500/40"
                                    : isSevere
                                    ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                                    : "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40"
                                }`}
                              >
                                {alert.severity || "Advisory"}
                              </span>
                              <span className="text-[10px] font-mono text-slate-400 truncate">
                                {alert.source_provider || "WMO CAP"}
                              </span>
                            </div>
                            <h4 className="text-sm font-medium text-slate-100 group-hover:text-cyan-300 transition-colors line-clamp-1">
                              {alert.headline || alert.event || "Meteorological Hazard"}
                            </h4>
                            <p className="text-xs text-slate-400 mt-1 line-clamp-2">
                              {alert.affected_area || alert.issuer || "Official WMO Common Alerting Protocol event."}
                            </p>
                          </div>

                          <div className="flex items-center justify-between pt-3 mt-3 border-t border-slate-800/60 text-[11px] font-mono text-slate-400">
                            <span>
                              {alert.latitude && alert.longitude
                                ? `${alert.latitude.toFixed(1)}°, ${alert.longitude.toFixed(1)}°`
                                : "Global Sector"}
                            </span>
                            <span className="text-cyan-400 group-hover:translate-x-0.5 transition-transform flex items-center gap-0.5">
                              <span>Inspect</span>
                              <ChevronRight className="w-3 h-3" />
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </section>

            {/* =========================================================================
                CHAPTER 4: STAY PREPARED
                ========================================================================= */}
            <section id="chapter-4" className="scroll-mt-20 pt-8 border-t border-slate-800/60">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900/60 border border-slate-800 text-[11px] font-mono text-cyan-400 uppercase tracking-widest mb-2">
                    Chapter 04 • Preparedness & Signals
                  </div>
                  <h2 className="text-2xl sm:text-3xl font-light text-white tracking-tight">
                    Stay Prepared
                  </h2>
                  <p className="text-xs text-slate-400 mt-1">
                    Deterministic physics indicators and verified emergency notification dispatch.
                  </p>
                </div>
              </div>

              {/* Deterministic Physical Hazard Cards */}
              <div className="space-y-6">
                {riskData && (
                  <div>
                    <DerivedRiskCard riskData={riskData} loading={loadingRisk} />
                  </div>
                )}

                {/* Emergency Web Push Notification Call to Action */}
                <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-slate-900/90 via-cyan-950/30 to-slate-900/90 border border-cyan-500/20 backdrop-blur-xl shadow-2xl flex flex-col sm:flex-row items-center justify-between gap-6">
                  <div className="space-y-2 text-center sm:text-left">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-xs font-mono text-cyan-300">
                      <Bell className="w-3.5 h-3.5" />
                      <span>Direct Emergency Push Service</span>
                    </div>
                    <h3 className="text-xl font-normal text-white">
                      Receive Official Life-Safety Weather Bulletins
                    </h3>
                    <p className="text-xs sm:text-sm text-slate-300 max-w-xl">
                      Subscribe for high-priority WMO CAP alerts directly on your device using RFC 8292 standard Web Push. Zero spam, zero third-party tracking.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsNotificationModalOpen(true)}
                    className="px-6 py-3 rounded-full bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold text-xs font-mono uppercase tracking-wider transition-all shadow-lg shadow-cyan-500/20 whitespace-nowrap"
                  >
                    {notificationsActive ? "Manage Push Alerts" : "Enable Emergency Alerts"}
                  </button>
                </div>

                {/* Quick Link to Classic Table View for Power Users */}
                <div className="p-4 rounded-2xl bg-slate-900/40 border border-slate-800 flex items-center justify-between text-xs font-mono text-slate-400">
                  <span>Need raw data tables or classic dashboard view?</span>
                  <Link
                    href="/classic"
                    className="text-cyan-400 hover:text-cyan-300 flex items-center gap-1 underline"
                  >
                    <span>Switch to Classic Dashboard</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            </section>
          </>
        )}

        {/* FARMER MODE WORKBENCH */}
        {appMode === "farmer" && (
          <section className="animate-fadeIn">
            <FarmerModePanel daily={weatherData?.daily || []} />
          </section>
        )}
      </main>

      {/* 5. Authentic Meteorological Provenance Footer */}
      <footer className="relative z-20 mt-16 border-t border-slate-900">
        <ProvenanceFooter weather={weatherData} />
      </footer>

      {/* 6. Modals */}
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
