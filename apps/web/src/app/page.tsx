"use client";

import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import Link from "next/link";
import { Header } from "@/components/Header";
import { FarmerModePanel } from "@/components/FarmerModePanel";
import { DerivedRiskCard } from "@/components/DerivedRiskCard";
import { NotificationSettingsModal } from "@/components/NotificationSettingsModal";
import { AlertDetailModal } from "@/components/AlertDetailModal";
import { ProvenanceFooter } from "@/components/ProvenanceFooter";
import { ErrorState } from "@/components/ErrorState";
import {
  checkBackendHealth,
  evaluateRisks,
  getForecast,
  getGlobalAlerts,
  getMultiModelForecast,
  getRadarNowcast,
  getStationObservation,
  getCuratedCitiesWeather,
} from "@/lib/api";
import {
  GlobalAlertItem,
  GlobalAlertsResponse,
  LocationSearchResult,
  MultiModelResponse,
  NearbyObservationResponse,
  RadarNowcastResponse,
  RiskEvaluationResponse,
  WeatherForecastResponse,
  CuratedCityWeather,
} from "@/types";
import { LivingWeatherIcon } from "@/components/living/LivingWeatherIcons";
import { LivingLocationSearch } from "@/components/living/LivingLocationSearch";
import { InteractiveTimelineScrubber } from "@/components/living/InteractiveTimelineScrubber";
import { LivingDailyOutlook } from "@/components/living/LivingDailyOutlook";
import { MultiModelComparison } from "@/components/living/MultiModelComparison";
import { AtmosphericWeatherStage } from "@/components/living/AtmosphericWeatherStage";
import { resolveWeatherScene } from "@/lib/atmosphere/weatherSceneResolver";
import { DynamicAtmosphere } from "@/components/atmosphere/DynamicAtmosphere";
import { useAtmosphereState } from "@/hooks/useAtmosphereState";
import {
  Wind,
  Droplets,
  Compass,
  Activity,
  ShieldAlert,
  ShieldCheck,
  Bell,
  ArrowRight,
  Globe,
  MapPin,
  CloudRain,
  ExternalLink,
  Star,
  RefreshCw,
} from "lucide-react";
import {
  getSavedLocations,
  saveLocationToCloud,
  removeSavedLocationFromCloud,
  subscribeToRealtimeAlerts,
  SavedLocation,
  RealtimeConnectionStatus,
} from "@/lib/supabase";

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
  const [theme, setTheme] = useState<"light" | "dark">("light");

  // Race condition management: active request sequence & abort controller
  const abortControllerRef = useRef<AbortController | null>(null);
  const activeRequestIdRef = useRef<number>(0);

  // Modals & Push Notifications
  const [isNotificationModalOpen, setIsNotificationModalOpen] = useState<boolean>(false);
  const [notificationsActive, setNotificationsActive] = useState<boolean>(false);
  const [selectedAlertForDetail, setSelectedAlertForDetail] = useState<GlobalAlertItem | null>(null);

  const [loadingWeather, setLoadingWeather] = useState<boolean>(false);
  const [loadingRisk, setLoadingRisk] = useState<boolean>(false);
  const [loadingMultiModel, setLoadingMultiModel] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Multi-model, station observation & radar nowcast state
  const [multiModelData, setMultiModelData] = useState<MultiModelResponse | null>(null);
  const [observationData, setObservationData] = useState<NearbyObservationResponse | null>(null);
  const [nowcastData, setNowcastData] = useState<RadarNowcastResponse | null>(null);

  // Supabase Cloud Workspace Saved Locations
  const [savedLocations, setSavedLocations] = useState<SavedLocation[]>([]);
  const [savedLocationsTrigger, setSavedLocationsTrigger] = useState<number>(0);
  const [savingLocation, setSavingLocation] = useState<boolean>(false);
  const [curatedWeatherMap, setCuratedWeatherMap] = useState<Record<string, CuratedCityWeather>>({});

  // Real-time Telemetry & Auto-Refresh State
  const [lastUpdatedTime, setLastUpdatedTime] = useState<Date>(new Date());
  const [isAutoRefreshing, setIsAutoRefreshing] = useState<boolean>(true);
  const [realtimeStatus, setRealtimeStatus] = useState<RealtimeConnectionStatus>("CONNECTING");

  useEffect(() => {
    getSavedLocations().then((locs) => setSavedLocations(locs || []));
  }, [savedLocationsTrigger]);

  const isCurrentSaved = useMemo(() => {
    if (!selectedLocation) return false;
    return savedLocations.some(
      (l) =>
        Math.abs(l.latitude - selectedLocation.latitude) < 0.01 &&
        Math.abs(l.longitude - selectedLocation.longitude) < 0.01
    );
  }, [selectedLocation, savedLocations]);

  const handleToggleSaveCurrentLocation = async () => {
    if (!selectedLocation || savingLocation) return;
    setSavingLocation(true);
    try {
      const existing = savedLocations.find(
        (l) =>
          Math.abs(l.latitude - selectedLocation.latitude) < 0.01 &&
          Math.abs(l.longitude - selectedLocation.longitude) < 0.01
      );
      if (existing && existing.id) {
        await removeSavedLocationFromCloud(existing.id);
      } else {
        await saveLocationToCloud({
          name: selectedLocation.name,
          formatted_label: selectedLocation.formatted_label || `${selectedLocation.name}, ${selectedLocation.country}`,
          latitude: selectedLocation.latitude,
          longitude: selectedLocation.longitude,
          country_code: selectedLocation.country_code || "",
        });
      }
      setSavedLocationsTrigger((prev) => prev + 1);
    } finally {
      setSavingLocation(false);
    }
  };

  // Check push subscription state
  useEffect(() => {
    if (typeof window !== "undefined") {
      const subId = localStorage.getItem("skyguard_push_sub_id");
      setNotificationsActive(!!subId);
    }
  }, [isNotificationModalOpen]);

  // Initial backend health check, initial global alerts, and authentic curated cities weather
  useEffect(() => {
    checkBackendHealth()
      .then((h) => setUpstreamStatus(h.status === "healthy" ? "CONNECTED" : "DEGRADED"))
      .catch(() => setUpstreamStatus("UNAVAILABLE"));

    getGlobalAlerts()
      .then((res) => setAlertsData(res))
      .catch(() => setAlertsData(null));

    getCuratedCitiesWeather(CURATED_CITIES)
      .then((data) => setCuratedWeatherMap(data))
      .catch(() => {});
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

  // Fetch domain data when a location is selected with strict race-condition mitigation
  const fetchLocationData = useCallback(
    async (lat: number, lon: number, label: string, countryCode?: string) => {
      // 1. Abort any previous pending request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      const controller = new AbortController();
      abortControllerRef.current = controller;
      const requestId = ++activeRequestIdRef.current;

      setError(null);
      setLoadingWeather(true);
      setLoadingRisk(true);
      setLoadingMultiModel(true);
      setSelectedHourIndex(0);

      // Clear previous location domain data immediately to eliminate cross-location stale state
      setMultiModelData(null);
      setObservationData(null);
      setNowcastData(null);
      setAlertsData(null);
      setRiskData(null);

      try {
        // Fetch weather forecast with abort signal
        const weather = await getForecast(lat, lon, controller.signal);

        // Guard against stale response if another location was selected
        if (activeRequestIdRef.current !== requestId) return;

        setWeatherData(weather);
        setLoadingWeather(false);
        setLastUpdatedTime(new Date());

        // Concurrently query localized global alerts for this coordinate
        getGlobalAlerts(countryCode, lat, lon, 500, controller.signal)
          .then((alerts) => {
            if (activeRequestIdRef.current === requestId) {
              setAlertsData(alerts);
            }
          })
          .catch(() => {
            if (activeRequestIdRef.current === requestId) {
              setAlertsData(null);
            }
          });

        // Concurrently query multi-model forecast consensus
        getMultiModelForecast(lat, lon, 5, controller.signal)
          .then((mm) => {
            if (activeRequestIdRef.current === requestId) {
              setMultiModelData(mm);
            }
          })
          .catch(() => {
            if (activeRequestIdRef.current === requestId) {
              setMultiModelData(null);
            }
          })
          .finally(() => {
            if (activeRequestIdRef.current === requestId) {
              setLoadingMultiModel(false);
            }
          });

        // Concurrently query real station observation and radar nowcast
        const curTemp = weather.current?.temperature_2m;
        const curPrecip = weather.current?.precipitation || 0.0;
        getStationObservation(lat, lon, curTemp, controller.signal)
          .then((obs) => {
            if (activeRequestIdRef.current === requestId) {
              setObservationData(obs);
            }
          })
          .catch(() => {
            if (activeRequestIdRef.current === requestId) {
              setObservationData(null);
            }
          });

        getRadarNowcast(lat, lon, curPrecip, controller.signal)
          .then((rn) => {
            if (activeRequestIdRef.current === requestId) {
              setNowcastData(rn);
            }
          })
          .catch(() => {
            if (activeRequestIdRef.current === requestId) {
              setNowcastData(null);
            }
          });

        // Evaluate predictive physical hazards
        try {
          const risk = await evaluateRisks(weather.daily, controller.signal);
          if (activeRequestIdRef.current === requestId) {
            setRiskData(risk);
          }
        } catch {
          if (activeRequestIdRef.current === requestId) {
            setRiskData(null);
          }
        }
      } catch (err: unknown) {
        if (err instanceof DOMException && err.name === "AbortError") {
          // Request was intentionally superseded by a newer location click
          return;
        }
        if (activeRequestIdRef.current === requestId) {
          setError(err instanceof Error ? err.message : "Failed to retrieve live forecast.");
          setWeatherData(null);
          setRiskData(null);
          setMultiModelData(null);
          setObservationData(null);
          setNowcastData(null);
        }
      } finally {
        if (activeRequestIdRef.current === requestId) {
          setLoadingWeather(false);
          setLoadingRisk(false);
          setLoadingMultiModel(false);
        }
      }
    },
    []
  );

  // Decoupled Background Ingestion Cadence:
  // - Emergency alert polling: 60 seconds (ensures fresh alerts even if WebSocket drops)
  // - Full NWP numerical forecast re-fetch: 300 seconds (5 mins) to respect Open-Meteo API quotas
  useEffect(() => {
    if (!selectedLocation || !isAutoRefreshing) return;

    // 1. Fast Emergency Alerts Polling (60s)
    const alertInterval = setInterval(() => {
      getGlobalAlerts(
        selectedLocation.country_code,
        selectedLocation.latitude,
        selectedLocation.longitude,
        500
      )
        .then((alerts) => {
          setAlertsData(alerts);
          setLastUpdatedTime(new Date());
        })
        .catch(() => {});
    }, 60000);

    // 2. Numerical Forecast Model Refresh (5 mins)
    const weatherInterval = setInterval(() => {
      fetchLocationData(
        selectedLocation.latitude,
        selectedLocation.longitude,
        selectedLocation.formatted_label,
        selectedLocation.country_code
      );
    }, 300000);

    return () => {
      clearInterval(alertInterval);
      clearInterval(weatherInterval);
    };
  }, [selectedLocation, isAutoRefreshing, fetchLocationData]);

  // Real-time Supabase WebSocket listener with authentic connection state tracking
  useEffect(() => {
    const unsubscribe = subscribeToRealtimeAlerts(
      () => {
        if (selectedLocation) {
          getGlobalAlerts(selectedLocation.country_code, selectedLocation.latitude, selectedLocation.longitude, 500)
            .then((alerts) => setAlertsData(alerts))
            .catch(() => {});
        } else {
          getGlobalAlerts()
            .then((alerts) => setAlertsData(alerts))
            .catch(() => {});
        }
        setLastUpdatedTime(new Date());
      },
      (status) => {
        setRealtimeStatus(status);
      }
    );
    return () => unsubscribe();
  }, [selectedLocation]);

  const handleSelectLocation = useCallback((loc: LocationSearchResult) => {
    setSelectedLocation(loc);
    fetchLocationData(loc.latitude, loc.longitude, loc.formatted_label, loc.country_code);
  }, [fetchLocationData]);

  const handleSelectCity = useCallback((city: LocationSearchResult) => {
    handleSelectLocation(city);
  }, [handleSelectLocation]);

  // Auto-load default location on initial mount (New Delhi matching user inspection)
  useEffect(() => {
    handleSelectCity(CURATED_CITIES[3]);
  }, [handleSelectCity]);

  const currentWeather = weatherData?.current ?? null;

  // Scrubber previewed hour
  const activeHourPoint = weatherData?.hourly?.[selectedHourIndex] ?? null;
  const displayTemperature = activeHourPoint
    ? Math.round(activeHourPoint.temperature_2m)
    : currentWeather
    ? Math.round(currentWeather.temperature_2m)
    : "--";
  const displayWeatherCode = activeHourPoint ? activeHourPoint.weather_code : currentWeather?.weather_code ?? 0;
  
  // Authentic diurnal science: check is_day from Open-Meteo
  const isDay = activeHourPoint && typeof activeHourPoint.is_day === "number"
    ? activeHourPoint.is_day === 1
    : currentWeather
    ? currentWeather.is_day === 1
    : false;

  // Master Atmospheric Scene & Physical Visual Directives
  const { state: atmosphericState, visuals: atmosphericVisuals } = useMemo(() => {
    return resolveWeatherScene(weatherData, selectedHourIndex, selectedLocation);
  }, [weatherData, selectedHourIndex, selectedLocation]);

  // Editorial atmospheric journal copy
  const journalSentence = currentWeather
    ? `${currentWeather.weather_description} across ${selectedLocation?.name || "your location"}. ` +
      `Relative humidity is ${currentWeather.relative_humidity_2m}% with ` +
      `${currentWeather.wind_speed_10m} km/h wind blowing from ${currentWeather.wind_direction_10m ?? 0}°.`
    : "Select a location to explore authentic real-time atmospheric conditions and predictive weather risks.";

  // Local severe alerts for selected sector: strictly display authoritative geographically verified warnings
  const localAlerts: GlobalAlertItem[] = useMemo(() => {
    if (alertsData?.local_verified_warnings && alertsData.local_verified_warnings.length > 0) {
      return alertsData.local_verified_warnings;
    }
    return [];
  }, [alertsData]);

  const scrollToChapter = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <div
      className="relative min-h-screen flex flex-col text-[#E8EDF4] font-sans selection:bg-[#2563EB] selection:text-white overflow-x-hidden pb-20 transition-colors duration-1000"
      style={{
        background:
          theme === "light"
            ? "linear-gradient(180deg, #1D5DA0 0%, #2F78C8 30%, #4A96E8 65%, #76B4F8 100%)"
            : `linear-gradient(180deg, ${atmosphericVisuals.skyGradient.from} 0%, ${atmosphericVisuals.skyGradient.via} 50%, ${atmosphericVisuals.skyGradient.to} 100%)`,
      }}
    >
      {/* 1. Full-Bleed Fixed Atmospheric Backdrop (Canvas Raindrops, Condensation Droplets, Lightning) */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <DynamicAtmosphere visuals={atmosphericVisuals} theme={theme} isBackground />
      </div>

      {/* 2. Top Header Navigation */}
      <header className="relative z-30">
        <Header
          upstreamStatus={upstreamStatus}
          currentMode={appMode}
          onModeChange={(m) => setAppMode(m)}
          onOpenNotifications={() => setIsNotificationModalOpen(true)}
          notificationsActive={notificationsActive}
          activeNav="weather"
          theme={theme}
          onToggleTheme={() => setTheme((t) => (t === "light" ? "dark" : "light"))}
        />
      </header>

      {/* 3. Fixed Bottom Chapter Navigation Bar with Decorated Pills */}
      {appMode === "public" && selectedLocation && (
        <nav
          aria-label="Chapter Navigation"
          className="fixed bottom-0 left-0 right-0 z-40 bg-black/40 backdrop-blur-md border-t border-white/15 shadow-panel pb-safe"
        >
          <div className="max-w-6xl mx-auto px-4 h-12 flex items-center justify-center gap-2 sm:gap-3 text-xs font-mono">
            <button
              type="button"
              onClick={() => scrollToChapter("chapter-1")}
              className={`px-3 py-1.5 rounded-sg transition-all duration-200 flex items-center gap-2 min-h-[36px] shadow-sm hover:scale-105 active:scale-95 ${
                activeChapter === "chapter-1"
                  ? "bg-white text-[#1E3A5F] font-bold border border-white shadow-[0_2px_12px_rgba(255,255,255,0.4)]"
                  : "text-white/80 hover:text-white bg-white/10 hover:bg-white/20 border border-white/15"
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${activeChapter === "chapter-1" ? "bg-[#2563EB]" : "bg-[#60A5FA]"}`} />
              <span>01 Your Sky</span>
            </button>
            <button
              type="button"
              onClick={() => scrollToChapter("chapter-2")}
              className={`px-3 py-1.5 rounded-sg transition-all duration-200 flex items-center gap-2 min-h-[36px] shadow-sm hover:scale-105 active:scale-95 ${
                activeChapter === "chapter-2"
                  ? "bg-white text-[#1E3A5F] font-bold border border-white shadow-[0_2px_12px_rgba(255,255,255,0.4)]"
                  : "text-white/80 hover:text-white bg-white/10 hover:bg-white/20 border border-white/15"
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${activeChapter === "chapter-2" ? "bg-[#2563EB]" : "bg-[#60A5FA]"}`} />
              <span>02 Forecast</span>
            </button>
            <button
              type="button"
              onClick={() => scrollToChapter("chapter-3")}
              className={`px-3 py-1.5 rounded-sg transition-all duration-200 flex items-center gap-2 min-h-[36px] shadow-sm hover:scale-105 active:scale-95 ${
                activeChapter === "chapter-3"
                  ? "bg-white text-[#1E3A5F] font-bold border border-white shadow-[0_2px_12px_rgba(255,255,255,0.4)]"
                  : "text-white/80 hover:text-white bg-white/10 hover:bg-white/20 border border-white/15"
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${activeChapter === "chapter-3" ? "bg-[#2563EB]" : "bg-[#60A5FA]"}`} />
              <span>03 Risks</span>
            </button>
            <button
              type="button"
              onClick={() => scrollToChapter("chapter-4")}
              className={`px-3 py-1.5 rounded-sg transition-all duration-200 flex items-center gap-2 min-h-[36px] shadow-sm hover:scale-105 active:scale-95 ${
                activeChapter === "chapter-4"
                  ? "bg-white text-[#1E3A5F] font-bold border border-white shadow-[0_2px_12px_rgba(255,255,255,0.4)]"
                  : "text-white/80 hover:text-white bg-white/10 hover:bg-white/20 border border-white/15"
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${activeChapter === "chapter-4" ? "bg-[#2563EB]" : "bg-[#60A5FA]"}`} />
              <span>04 Prepared</span>
            </button>
          </div>
        </nav>
      )}

      {/* 4. Main Experience */}
      <main className="relative z-10 flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 py-1 sm:py-2 space-y-6 sm:space-y-8">
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

        {/* PUBLIC MODE */}
        {appMode === "public" && (
          <>
            {/* =========================================================================
                CHAPTER 1: YOUR SKY
                ========================================================================= */}
            <section id="chapter-1" className="scroll-mt-16 flex flex-col items-center w-full">
              {/* Sleek Compact Location Search */}
              <div className="w-full max-w-md mx-auto mb-1">
                <LivingLocationSearch
                  onSelectLocation={handleSelectLocation}
                  selectedLocationName={selectedLocation?.name}
                  savedLocationsUpdatedTrigger={savedLocationsTrigger}
                />

                {/* Supabase Saved Locations Quick Select */}
                {savedLocations.length > 0 && (
                  <div className="flex flex-wrap items-center justify-center gap-1.5 mt-1.5">
                    <span className="text-[11px] font-mono text-[#FCD34D] flex items-center gap-1 mr-1">
                      <Star className="w-3 h-3 fill-[#FCD34D] text-[#FCD34D]" />
                      Saved:
                    </span>
                    {savedLocations.map((loc) => (
                      <button
                        key={loc.id || `${loc.latitude}-${loc.longitude}`}
                        type="button"
                        onClick={() =>
                          handleSelectCity({
                            id: Math.abs(Math.round(loc.latitude * 1000 + loc.longitude)),
                            name: loc.name,
                            latitude: loc.latitude,
                            longitude: loc.longitude,
                            country: loc.country_code || "",
                            formatted_label: loc.formatted_label,
                          })
                        }
                        className={`text-xs font-mono px-2 py-0.5 rounded-sg transition-colors border ${
                          selectedLocation &&
                          Math.abs(selectedLocation.latitude - loc.latitude) < 0.01 &&
                          Math.abs(selectedLocation.longitude - loc.longitude) < 0.01
                            ? "bg-amber-400/25 text-[#FCD34D] border-amber-400/50"
                            : "bg-white/10 hover:bg-white/20 text-white/80 hover:text-white border-white/15"
                        }`}
                      >
                        {loc.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* AUTHENTIC LIVE ATMOSPHERIC HERO (Matching Reference Design) */}
              <div className="w-full flex flex-col items-center">
                <div className="w-full mb-3">
                  <AtmosphericWeatherStage
                    weather={weatherData}
                    location={selectedLocation || CURATED_CITIES[3]}
                    popularCities={CURATED_CITIES}
                    curatedWeatherMap={curatedWeatherMap}
                    onSelectCity={handleSelectCity}
                    units={weatherData?.units}
                    selectedHourIndex={selectedHourIndex}
                    onSelectHourIndex={(idx) => setSelectedHourIndex(idx)}
                    theme={theme}
                    onToggleTheme={() => setTheme((t) => (t === "light" ? "dark" : "light"))}
                  />
                </div>

                {/* Sector Emergency Alert Ribbon */}
                {selectedLocation && weatherData && (
                  <div className="w-full max-w-2xl mt-4 mb-10">
                    {localAlerts.length > 0 ? (
                      <div className="p-4 rounded-sg bg-amber-950/40 backdrop-blur-md border-l-4 border-l-[#D97706] border-y border-r border-amber-500/30 flex flex-col sm:flex-row items-center justify-between gap-3 text-left">
                        <div className="flex items-center gap-3">
                          <ShieldAlert className="w-5 h-5 text-[#FCD34D] flex-shrink-0" />
                          <div>
                            <span className="text-[11px] font-mono uppercase tracking-wider text-[#FCD34D] font-semibold block">
                              Official Severe Warning in Sector
                            </span>
                            <span className="text-xs text-white font-medium">
                              {localAlerts[0].headline || localAlerts[0].event || "Meteorological Advisory"}
                            </span>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setSelectedAlertForDetail(localAlerts[0])}
                          className="px-3.5 py-1.5 rounded-sg bg-black/40 hover:bg-black/60 border border-amber-400/40 text-xs font-mono text-[#FCD34D] transition-colors whitespace-nowrap min-h-[36px]"
                        >
                          Inspect Bulletin
                        </button>
                      </div>
                    ) : (
                      <div className="p-3 rounded-sg bg-emerald-950/30 backdrop-blur-md border-l-4 border-l-[#059669] border-y border-r border-emerald-500/30 flex items-center justify-center gap-2 text-xs font-mono text-[#34D399]">
                        <ShieldCheck className="w-4 h-4 text-[#34D399]" />
                        <span>No active official severe warnings reported for this sector</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </section>

            {/* =========================================================================
                CHAPTER 2: A DAY IN MOTION (24h Scrubber & 7-Day Outlook)
                ========================================================================= */}
            {selectedLocation && weatherData && (
              <section id="chapter-2" className="scroll-mt-20 pt-8 border-t border-white/10 space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-sg bg-white/10 border border-white/15 text-[11px] font-mono text-[#60A5FA] uppercase tracking-widest mb-2">
                      Chapter 02 : Diurnal Progression
                    </div>
                    <h2 className="text-xl sm:text-2xl font-semibold text-white tracking-tight">
                      A Day in Motion
                    </h2>
                  </div>
                  <span className="text-xs font-mono text-white/60 hidden sm:inline">
                    Drag or click scrubber to preview hourly transition
                  </span>
                </div>

                {/* 24-Hour Interactive Timeline Scrubber */}
                {weatherData.hourly && weatherData.hourly.length > 0 && (
                  <InteractiveTimelineScrubber
                    hourly={weatherData.hourly}
                    selectedIndex={selectedHourIndex}
                    onSelectIndex={(idx) => setSelectedHourIndex(idx)}
                    timezone={weatherData.timezone}
                  />
                )}

                {/* 7-Day Planetary Outlook */}
                {weatherData.daily && weatherData.daily.length > 0 && (
                  <div className="mt-8">
                    <LivingDailyOutlook daily={weatherData.daily} />
                  </div>
                )}

                {/* Multi-Model Consensus, Observation Grounding & Doppler Nowcast */}
                <div className="mt-8">
                  <MultiModelComparison
                    multiModelData={multiModelData}
                    observationData={observationData}
                    nowcastData={nowcastData}
                    loading={loadingMultiModel}
                  />
                </div>
              </section>
            )}

            {/* =========================================================================
                CHAPTER 3: WEATHER RISK OUTLOOK
                ========================================================================= */}
            {selectedLocation && (
              <section id="chapter-3" className="scroll-mt-20 pt-8 border-t border-white/10 space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-sg bg-white/10 border border-white/15 text-[11px] font-mono text-[#60A5FA] uppercase tracking-widest mb-2">
                      Chapter 03 : Predictive Risk Assessment
                    </div>
                    <h2 className="text-xl sm:text-2xl font-semibold text-white tracking-tight">
                      Weather Risk Outlook
                    </h2>
                    <p className="text-xs text-white/70 mt-1">
                      Deterministic physics indicators and actionable preventive safety measures.
                    </p>
                  </div>
                </div>

                {/* Derived Risk Card */}
                <DerivedRiskCard riskData={riskData} loading={loadingRisk} />
              </section>
            )}

            {/* =========================================================================
                CHAPTER 4: STAY PREPARED (Push Notifications & Global Radar Link)
                ========================================================================= */}
            <section id="chapter-4" className="scroll-mt-20 pt-8 border-t border-white/10 space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-sg bg-white/10 border border-white/15 text-[11px] font-mono text-[#60A5FA] uppercase tracking-widest mb-2">
                    Chapter 04 : Preparedness &amp; Exploration
                  </div>
                  <h2 className="text-xl sm:text-2xl font-semibold text-white tracking-tight">
                    Stay Prepared
                  </h2>
                  <p className="text-xs text-white/70 mt-1">
                    Emergency life-safety dispatch and worldwide disaster monitoring.
                  </p>
                </div>
              </div>

              {/* Emergency Push Notification Banner */}
              <div className="p-6 sm:p-8 rounded-sg bg-white/[0.06] backdrop-blur-md border border-white/15 shadow-panel flex flex-col sm:flex-row items-center justify-between gap-6">
                <div className="space-y-2 text-center sm:text-left">
                  <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-sg bg-[#2563EB]/20 border border-[#2563EB]/40 text-xs font-mono text-[#60A5FA]">
                    <Bell className="w-3.5 h-3.5" />
                    <span>Direct Emergency Push Service</span>
                  </div>
                  <h3 className="text-xl font-semibold text-white">
                    Receive Life-Safety Weather Warnings
                  </h3>
                  <p className="text-xs sm:text-sm text-white/70 max-w-xl">
                    Subscribe for verified severe weather alerts delivered directly to your device via standard RFC 8292 Web Push. Zero tracking, zero advertisements.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsNotificationModalOpen(true)}
                  className="px-5 py-2.5 rounded-sg bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-semibold text-xs font-mono uppercase tracking-wider transition-colors min-h-[44px] whitespace-nowrap shadow-md"
                >
                  {notificationsActive ? "Manage Push Alerts" : "Enable Emergency Alerts"}
                </button>
              </div>

              {/* Dedicated Link to Global Disaster Radar */}
              <div className="p-6 rounded-sg bg-white/[0.06] backdrop-blur-md border border-white/15 shadow-panel flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  <div className="p-3 rounded-sg bg-[#2563EB]/20 text-[#60A5FA] flex-shrink-0">
                    <Globe className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-white">
                      Explore Worldwide Multi-Hazard Disaster Radar
                    </h3>
                    <p className="text-xs sm:text-sm text-white/70 mt-1">
                      Inspect active global events from WMO SWIC and UN GDACS on our 3D interactive planetary globe.
                    </p>
                  </div>
                </div>

                <Link
                  href="/disasters"
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-sg bg-white/10 hover:bg-white/20 border border-white/20 text-xs font-mono text-[#60A5FA] hover:text-white transition-colors whitespace-nowrap min-h-[44px]"
                >
                  <span>Launch Global Radar</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>

              {/* Quick Link to Classic Table View */}
              <div className="p-4 rounded-sg bg-white/[0.04] backdrop-blur-sm border border-white/10 flex items-center justify-between text-xs font-mono text-white/70">
                <span>Prefer dense data tables or classic dashboard?</span>
                <Link
                  href="/classic"
                  className="text-[#60A5FA] hover:underline flex items-center gap-1"
                >
                  <span>Switch to Classic Dashboard</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </Link>
              </div>
            </section>
          </>
        )}

        {/* FARMER MODE WORKBENCH */}
        {appMode === "farmer" && (
          <section>
            <FarmerModePanel daily={weatherData?.daily || []} />
          </section>
        )}
      </main>

      {/* 5. Authentic Meteorological Provenance Footer */}
      <footer className="relative z-20 mt-16 border-t border-[#2A3141]">
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
