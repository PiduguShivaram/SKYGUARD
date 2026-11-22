"use client";

import React, { useEffect, useState, useMemo, useCallback } from "react";
import dynamic from "next/dynamic";
import {
  WeatherForecastResponse,
  LocationSearchResult,
  DailyForecastPoint,
  CuratedCityWeather,
  HourlyForecastPoint,
} from "@/types";
import { LivingWeatherIcon } from "./LivingWeatherIcons";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import {
  Droplets,
  Wind,
  Compass,
  MapPin,
  Clock,
  Sparkles,
  Radio,
  Gauge,
  Eye,
  Activity,
  Layers,
  Thermometer,
  ShieldCheck,
  ChevronRight,
  Map as MapIcon,
  Zap,
  CloudRain,
  Sun,
  Snowflake,
  Moon,
  Maximize2,
  Minimize2,
} from "lucide-react";
import { resolveWeatherScene } from "@/lib/atmosphere/weatherSceneResolver";

const WeatherRadarMap = dynamic(
  () => import("./WeatherRadarMap").then((mod) => mod.WeatherRadarMap),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-[260px] sm:h-[280px] rounded-sg bg-white/[0.08] border border-white/20 animate-pulse flex flex-col items-center justify-center gap-2 text-xs font-mono text-white/60">
        <MapIcon className="w-6 h-6 text-sky-400/80 animate-bounce" />
        <span>Loading Live Weather Radar...</span>
      </div>
    ),
  }
);

interface AtmosphericWeatherStageProps {
  weather: WeatherForecastResponse | null;
  location: LocationSearchResult | null;
  popularCities: LocationSearchResult[];
  curatedWeatherMap?: Record<string, CuratedCityWeather>;
  onSelectCity: (city: LocationSearchResult) => void;
  units?: Record<string, string>;
  selectedHourIndex?: number;
  onSelectHourIndex?: (idx: number) => void;
  theme?: "light" | "dark";
  onToggleTheme?: () => void;
}

function calculateDewPoint(tempC: number, rh: number): number {
  const a = 17.27;
  const b = 237.7;
  const alpha = ((a * tempC) / (b + tempC)) + Math.log(Math.max(rh, 1) / 100);
  return Math.round(((b * alpha) / (a - alpha)) * 10) / 10;
}

function getWindCompassDirection(deg: number | null): string {
  if (deg === null || deg === undefined) return "Calm";
  const directions = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];
  const index = Math.round((deg % 360) / 22.5) % 16;
  return directions[index];
}

export const AtmosphericWeatherStage: React.FC<AtmosphericWeatherStageProps> = ({
  weather,
  location,
  popularCities,
  curatedWeatherMap,
  onSelectCity,
  units,
  selectedHourIndex = 0,
  onSelectHourIndex,
  theme = "light",
  onToggleTheme,
}) => {
  const prefersReduced = useReducedMotion();
  const [liveClock, setLiveClock] = useState<string>("");
  const [liveDate, setLiveDate] = useState<string>("");

  // Resolve normalized meteorological state and visual directives
  const { state, visuals } = useMemo(() => {
    return resolveWeatherScene(weather, selectedHourIndex, location);
  }, [weather, selectedHourIndex, location]);

  const locationLabel = location?.name || state.locationName || "Selected Location";
  const countryLabel = location?.country || "";
  const tz = state.timezone || "UTC";
  const lat = state.latitude;
  const lon = state.longitude;

  // Real-time ticking clock formatted in location's authentic timezone
  useEffect(() => {
    const updateTime = () => {
      if (selectedHourIndex > 0 && weather?.hourly && weather.hourly[selectedHourIndex]) {
        const pt = weather.hourly[selectedHourIndex];
        try {
          const d = new Date(pt.time);
          const tStr = new Intl.DateTimeFormat("en-US", {
            timeZone: tz,
            hour: "2-digit",
            minute: "2-digit",
            hour12: true,
          }).format(d);
          const dStr = new Intl.DateTimeFormat("en-US", {
            timeZone: tz,
            day: "numeric",
            month: "short",
            year: "numeric",
          }).format(d);
          setLiveClock(tStr);
          setLiveDate(dStr);
        } catch {
          setLiveClock(pt.time.slice(11, 16));
          setLiveDate(pt.time.slice(0, 10));
        }
        return;
      }

      try {
        const now = new Date();
        const tStr = new Intl.DateTimeFormat("en-US", {
          timeZone: tz,
          hour: "2-digit",
          minute: "2-digit",
          hour12: true,
        }).format(now);
        const dStr = new Intl.DateTimeFormat("en-US", {
          timeZone: tz,
          day: "numeric",
          month: "short",
          year: "numeric",
        }).format(now);
        setLiveClock(tStr);
        setLiveDate(dStr);
      } catch {
        const now = new Date();
        setLiveClock(now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: true }));
        setLiveDate(now.toLocaleDateString([], { day: "numeric", month: "short", year: "numeric" }));
      }
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, [tz, selectedHourIndex, weather?.hourly]);

  // Compute 7-day sine-wave geometry from actual daily forecasts
  const dailyPoints: DailyForecastPoint[] = weather?.daily || [];

  const waveSvg = useMemo(() => {
    if (!dailyPoints || dailyPoints.length < 2) return null;

    const data = dailyPoints.slice(0, 7);
    const count = data.length;
    const maxTemps = data.map((d) => d.temperature_2m_max);
    const minTemps = data.map((d) => d.temperature_2m_min);
    const overallMax = Math.max(...maxTemps);
    const overallMin = Math.min(...minTemps);
    const range = Math.max(overallMax - overallMin, 1);

    const svgWidth = 1400;
    const svgHeight = 65;
    const paddingX = 32;
    const chartW = svgWidth - paddingX * 2;

    const waveNodes: { x: number; y: number; label: string; temp: number; isHigh: boolean }[] = [];

    data.forEach((day, idx) => {
      const stepX = chartW / (count * 2 - 1);

      const xHigh = paddingX + idx * 2 * stepX;
      const normalizedHigh = (day.temperature_2m_max - overallMin) / range;
      const yHigh = 14 + (1 - normalizedHigh) * 16;

      const xLow = paddingX + (idx * 2 + 1) * stepX;
      const normalizedLow = (day.temperature_2m_min - overallMin) / range;
      const yLow = 30 + (1 - normalizedLow) * 20;

      waveNodes.push({
        x: xHigh,
        y: yHigh,
        label: `HIGH ${Math.round(day.temperature_2m_max)}°`,
        temp: day.temperature_2m_max,
        isHigh: true,
      });

      waveNodes.push({
        x: xLow,
        y: yLow,
        label: `LOW ${Math.round(day.temperature_2m_min)}°`,
        temp: day.temperature_2m_min,
        isHigh: false,
      });
    });

    let pathD = `M ${waveNodes[0].x} ${waveNodes[0].y}`;
    for (let i = 1; i < waveNodes.length; i++) {
      const prev = waveNodes[i - 1];
      const curr = waveNodes[i];
      const cx = (prev.x + curr.x) / 2;
      pathD += ` C ${cx} ${prev.y}, ${cx} ${curr.y}, ${curr.x} ${curr.y}`;
    }

    return { pathD, waveNodes, svgWidth, svgHeight };
  }, [dailyPoints]);

  const displayTemp = state.temperatureC !== null ? Math.round(state.temperatureC) : "--";
  const humidity = state.humidityPercent !== null ? Math.round(state.humidityPercent) : 60;
  const windSpeed = state.windSpeedKmh !== null ? Math.round(state.windSpeedKmh) : 0;
  const windDir = state.windDirectionDegrees;
  const compass = getWindCompassDirection(windDir);
  const uvIndexVal = state.uvIndex !== null ? Math.round(state.uvIndex) : state.isDay ? 4 : 0;
  const cloudCover = state.cloudCoverPercent !== null ? Math.round(state.cloudCoverPercent) : 0;
  const precipProb = state.precipitationProbability !== null ? Math.round(state.precipitationProbability) : 0;
  const feelsLike = weather?.current?.apparent_temperature !== undefined
    ? Math.round(weather.current.apparent_temperature)
    : displayTemp;
  const dewPoint = state.temperatureC !== null
    ? calculateDewPoint(state.temperatureC, humidity)
    : 12.0;

  // High/Low of current day
  const todayHigh = dailyPoints[0] ? Math.round(dailyPoints[0].temperature_2m_max) : null;
  const todayLow = dailyPoints[0] ? Math.round(dailyPoints[0].temperature_2m_min) : null;

  // Determine whether current or previewed hour is daytime
  const isEffectiveDay = useMemo(() => {
    if (selectedHourIndex > 0 && weather?.hourly?.[selectedHourIndex]) {
      const pt = weather.hourly[selectedHourIndex];
      if (typeof pt.is_day === "number") return pt.is_day === 1;
      try {
        const d = new Date(pt.time);
        const hr = d.getHours();
        return hr >= 6 && hr <= 18;
      } catch {
        return true;
      }
    }
    return state.isDay;
  }, [selectedHourIndex, weather?.hourly, state.isDay]);

  // Professional concise condition headline
  const professionalHeadline = useMemo(() => {
    const cond = state.condition;
    const isDay = isEffectiveDay;
    if (cond === "thunderstorm") return isDay ? "Convective Thunderstorm" : "Nocturnal Convective Storm";
    if (cond === "rain") return isDay ? "Active Precipitation Front" : "Nocturnal Rain System";
    if (cond === "snow") return "Snowfall & Cold Wave";
    if (cond === "fog") return isDay ? "Dense Radiation Fog" : "Nocturnal Ground Fog";
    if (cond === "overcast") return isDay ? "Overcast Stratocumulus" : "Dense Nocturnal Cloud Deck";
    if (cond === "partly-cloudy") return isDay ? "Partly Cloudy Sky" : "Scattered Nocturnal Clouds";
    if (isDay) return "Radiant Clear Sky";
    return "Clear Night Sky";
  }, [state.condition, isEffectiveDay]);

  const [viewMode, setViewMode] = useState<"overview" | "radar">("overview");
  const [isMapExpanded, setIsMapExpanded] = useState<boolean>(false);
  const [activeConditionPill, setActiveConditionPill] = useState<string>("live");

  // Interactive handler for condition filter buttons (grounded in authentic hourly data)
  const handleConditionClick = useCallback((cond: "live" | "storm" | "rain" | "sun" | "snow" | "night") => {
    setActiveConditionPill(cond);
    if (!onSelectHourIndex || !weather?.hourly || weather.hourly.length === 0) return;

    if (cond === "live") {
      onSelectHourIndex(0);
      return;
    }

    // Scan next 24 hours for the most representative match
    const hourly = weather.hourly.slice(0, 24);
    let targetIdx = 0;

    if (cond === "sun") {
      const match = hourly.findIndex((h, idx) => idx > 0 && h.is_day === 1 && (h.cloud_cover ?? 0) < 50);
      targetIdx = match !== -1 ? match : hourly.findIndex((h, idx) => idx > 0 && h.is_day === 1);
      if (targetIdx === -1) targetIdx = 12; // Default to noon daytime hour
    } else if (cond === "night") {
      const match = hourly.findIndex((h, idx) => idx > 0 && h.is_day === 0);
      targetIdx = match !== -1 ? match : 0;
    } else if (cond === "rain") {
      const match = hourly.findIndex((h) => (h.precipitation_probability ?? 0) > 10 || (h.weather_code ?? 0) >= 50);
      targetIdx = match !== -1 ? match : 6;
    } else if (cond === "storm") {
      const match = hourly.findIndex((h) => [95, 96, 99].includes(h.weather_code ?? 0));
      targetIdx = match !== -1 ? match : 8;
    } else if (cond === "snow") {
      const match = hourly.findIndex((h) => [71, 73, 75, 77, 85, 86].includes(h.weather_code ?? 0));
      targetIdx = match !== -1 ? match : 4;
    }

    if (targetIdx !== -1) {
      onSelectHourIndex(targetIdx);
    }
  }, [onSelectHourIndex, weather?.hourly]);

  return (
    <div className="relative w-full flex flex-col justify-between select-none text-white transition-all duration-700 pt-1 pb-2">
      {/* 1. Top Ribbon: Clean, View Switcher, and Richly Decorated Condition Filter Buttons */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-3 sm:px-6 py-2.5 border-b border-white/15 text-xs font-mono w-full bg-black/20 backdrop-blur-md rounded-t-sg">
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          {/* View Segmented Pill Switcher */}
          <div className="flex items-center bg-white/15 p-1 rounded-sg border border-white/20 text-[11px] shadow-sm">
            <button
              type="button"
              onClick={() => setViewMode("overview")}
              className={`px-3 py-1 rounded-sg transition-all duration-200 font-medium ${
                viewMode === "overview"
                  ? "bg-white text-[#1E3A5F] font-bold shadow-md"
                  : "text-white/80 hover:text-white hover:bg-white/10"
              }`}
            >
              Overview
            </button>
            <button
              type="button"
              onClick={() => setViewMode("radar")}
              className={`px-3 py-1 rounded-sg transition-all duration-200 flex items-center gap-1.5 font-medium ${
                viewMode === "radar"
                  ? "bg-[#2563EB] text-white font-bold shadow-md shadow-blue-500/30"
                  : "text-white/80 hover:text-white hover:bg-white/10"
              }`}
            >
              <MapIcon className="w-3.5 h-3.5" />
              <span>Radar Map</span>
            </button>
          </div>

          {/* Decorated Condition Filter Pills (Live, Storm, Rain, Sun, Snow, Night) */}
          <div className="hidden sm:flex items-center gap-1.5 bg-black/25 p-1 rounded-sg border border-white/15 text-[11px]">
            {/* Live Pill */}
            <button
              type="button"
              onClick={() => handleConditionClick("live")}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-sg border transition-all duration-200 shadow-sm hover:scale-105 active:scale-95 ${
                activeConditionPill === "live" && selectedHourIndex === 0
                  ? "bg-white text-[#1E3A5F] font-bold border-white shadow-[0_2px_10px_rgba(255,255,255,0.4)]"
                  : "bg-white/10 hover:bg-white/20 text-white/90 border-white/15"
              }`}
              title="Return to real-time live observation"
            >
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse ring-2 ring-emerald-400/40" />
              <span>Live</span>
            </button>

            {/* Storm Pill */}
            <button
              type="button"
              onClick={() => handleConditionClick("storm")}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-sg border transition-all duration-200 shadow-sm hover:scale-105 active:scale-95 ${
                activeConditionPill === "storm"
                  ? "bg-amber-400 text-stone-950 font-bold border-amber-300 shadow-[0_2px_10px_rgba(251,191,36,0.5)]"
                  : "bg-white/10 hover:bg-white/20 text-amber-200 border-white/15 hover:border-amber-400/50"
              }`}
              title="Filter / preview storm conditions"
            >
              <Zap className="w-3.5 h-3.5 text-amber-400 fill-amber-400/40" />
              <span>Storm</span>
            </button>

            {/* Rain Pill */}
            <button
              type="button"
              onClick={() => handleConditionClick("rain")}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-sg border transition-all duration-200 shadow-sm hover:scale-105 active:scale-95 ${
                activeConditionPill === "rain"
                  ? "bg-sky-400 text-slate-950 font-bold border-sky-300 shadow-[0_2px_10px_rgba(56,189,248,0.5)]"
                  : "bg-white/10 hover:bg-white/20 text-sky-200 border-white/15 hover:border-sky-400/50"
              }`}
              title="Filter / preview precipitation"
            >
              <CloudRain className="w-3.5 h-3.5 text-sky-300" />
              <span>Rain</span>
            </button>

            {/* Sun Pill */}
            <button
              type="button"
              onClick={() => handleConditionClick("sun")}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-sg border transition-all duration-200 shadow-sm hover:scale-105 active:scale-95 ${
                activeConditionPill === "sun"
                  ? "bg-yellow-400 text-amber-950 font-bold border-yellow-300 shadow-[0_2px_10px_rgba(250,204,21,0.5)]"
                  : "bg-white/10 hover:bg-white/20 text-yellow-200 border-white/15 hover:border-yellow-400/50"
              }`}
              title="Filter / preview daytime clear sky"
            >
              <Sun className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400/40" />
              <span>Sun</span>
            </button>

            {/* Snow Pill */}
            <button
              type="button"
              onClick={() => handleConditionClick("snow")}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-sg border transition-all duration-200 shadow-sm hover:scale-105 active:scale-95 ${
                activeConditionPill === "snow"
                  ? "bg-cyan-300 text-slate-950 font-bold border-cyan-200 shadow-[0_2px_10px_rgba(103,232,249,0.5)]"
                  : "bg-white/10 hover:bg-white/20 text-cyan-200 border-white/15 hover:border-cyan-300/50"
              }`}
              title="Filter / preview winter cold conditions"
            >
              <Snowflake className="w-3.5 h-3.5 text-cyan-300" />
              <span>Snow</span>
            </button>

            {/* Night Pill */}
            <button
              type="button"
              onClick={() => handleConditionClick("night")}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-sg border transition-all duration-200 shadow-sm hover:scale-105 active:scale-95 ${
                activeConditionPill === "night"
                  ? "bg-indigo-300 text-indigo-950 font-bold border-indigo-200 shadow-[0_2px_10px_rgba(165,180,252,0.5)]"
                  : "bg-white/10 hover:bg-white/20 text-indigo-200 border-white/15 hover:border-indigo-300/50"
              }`}
              title="Filter / preview nocturnal conditions"
            >
              <Moon className="w-3.5 h-3.5 text-indigo-300 fill-indigo-300/30" />
              <span>Night</span>
            </button>
          </div>

          {selectedHourIndex > 0 && (
            <span className="px-2 py-0.5 rounded-sg bg-blue-500/40 text-sky-200 border border-blue-400/50 text-[10px] font-semibold animate-pulse">
              Preview +{selectedHourIndex}h
            </span>
          )}
        </div>

        {/* Right Info: Clock, Sector, and Live Indicator */}
        <div className="flex items-center gap-3 sm:gap-5 text-white/90">
          <div className="flex items-center gap-2 font-mono text-xs">
            <span className="tabular-nums font-semibold text-white drop-shadow-sm">{liveClock}</span>
            <span className="text-white/40">•</span>
            <span>{liveDate}</span>
          </div>

          <div className="flex items-center gap-1.5 pl-3 border-l border-white/20">
            <MapPin className="w-3 h-3 text-sky-300" />
            <span className="text-[11px] font-semibold text-white drop-shadow-sm">
              {locationLabel}{countryLabel ? `, ${countryLabel}` : ""}
            </span>
          </div>
        </div>
      </div>

      {/* 2. Main Stage: Either Full Radar Map or 3-Column Atmospheric Command Center */}
      {viewMode === "radar" ? (
        /* Full-Width Weather Radar Map View */
        <div className="px-3 sm:px-6 py-5 w-full z-20">
          <div className="mb-3 flex items-center justify-between text-xs font-mono">
            <div className="flex items-center gap-2 text-white">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
              <span className="font-semibold text-sm">Interactive Live Doppler Weather Radar</span>
            </div>
            <span className="text-white/70">RainViewer Composite · OpenStreetMap</span>
          </div>
          <WeatherRadarMap
            lat={lat}
            lon={lon}
            cityName={locationLabel}
            temperature={displayTemp}
            isExpanded={true}
            theme={theme}
            className="w-full h-[480px] shadow-2xl border-2 border-white/30"
          />
        </div>
      ) : (
        /* Standard 3-Column Weather Stage with Center Embedded Live Radar Map */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 px-3 sm:px-6 py-5 items-stretch flex-1 w-full z-20">
          {/* Left Column (Cols 1 to 4): Headline, Subtitle, 3 Quick City Chips & 2 Metric Cards */}
          <div className="lg:col-span-4 flex flex-col justify-between space-y-4">
            <div>
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-light tracking-tight text-white leading-tight drop-shadow-md">
                {professionalHeadline}
              </h1>
              <p className="mt-1.5 text-xs sm:text-sm text-white/90 font-sans leading-relaxed drop-shadow-sm">
                {state.condition === "clear" && isEffectiveDay
                  ? `Optimal solar radiation across ${locationLabel}. Stable atmosphere with ${displayTemp}°C.`
                  : state.condition === "clear"
                  ? `Clear nocturnal sky across ${locationLabel}. Calm surface airflow with ${displayTemp}°C.`
                  : `${state.weatherDescription || "Stable conditions"} across ${locationLabel}. ${displayTemp}°C.`}
              </p>
            </div>

            {/* 3 Quick City Chips with Decorated Glowing Bottom Accent Bars */}
            <div>
              <div className="text-[10px] font-mono uppercase tracking-wider text-white/70 mb-1.5 flex items-center justify-between">
                <span>Fast Sector Select</span>
                <span className="text-white/50 text-[9px]">Tap to switch</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {popularCities.slice(0, 3).map((city, idx) => {
                  const isSelected = location?.name === city.name;
                  const live = curatedWeatherMap?.[city.name];
                  const displayCityTemp = live ? `${live.temperature}°` : "--";
                  
                  // Decorated gradients for city underlines
                  const accentStyles = [
                    { bar: "bg-gradient-to-r from-cyan-400 to-sky-300 shadow-[0_2px_8px_rgba(34,211,238,0.7)]" },
                    { bar: "bg-gradient-to-r from-amber-400 to-orange-400 shadow-[0_2px_8px_rgba(251,191,36,0.7)]" },
                    { bar: "bg-gradient-to-r from-blue-400 to-indigo-400 shadow-[0_2px_8px_rgba(96,165,250,0.7)]" },
                  ];
                  const currentAccent = accentStyles[idx % accentStyles.length];

                  return (
                    <button
                      key={city.id}
                      type="button"
                      onClick={() => onSelectCity(city)}
                      className={`text-left p-2.5 rounded-sg transition-all duration-200 border cursor-pointer hover:-translate-y-1 hover:shadow-lg active:scale-95 ${
                        isSelected
                          ? "bg-white/30 border-white shadow-md backdrop-blur-md ring-2 ring-white/50"
                          : "bg-white/15 hover:bg-white/25 border-white/25 backdrop-blur-sm"
                      }`}
                    >
                      <div className="text-lg font-light text-white tracking-tight tabular-nums drop-shadow-sm">
                        {displayCityTemp}
                      </div>
                      <div className="text-[11px] text-white truncate font-medium mt-0.5">
                        {city.name}
                      </div>
                      <div
                        className={`w-full h-1 mt-1.5 rounded-sg ${currentAccent.bar}`}
                      />
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 2 Clean Environmental Cards (Humidity & Wind) */}
            <div className="grid grid-cols-2 gap-2">
              <div className="p-3 rounded-sg bg-white/20 hover:bg-white/25 border border-white/30 backdrop-blur-md shadow-sm transition-all flex items-center justify-between">
                <div>
                  <div className="text-2xl font-light text-white tabular-nums tracking-tight drop-shadow-sm">
                    {humidity}%
                  </div>
                  <div className="text-[11px] text-white/80 mt-0.5 font-medium">Humidity</div>
                </div>
                <div className="w-8 h-8 rounded-sg bg-sky-400/20 border border-sky-400/40 flex items-center justify-center">
                  <Droplets className="w-5 h-5 text-sky-300 stroke-[1.8]" />
                </div>
              </div>

              <div className="p-3 rounded-sg bg-white/20 hover:bg-white/25 border border-white/30 backdrop-blur-md shadow-sm transition-all flex items-center justify-between">
                <div>
                  <div className="text-2xl font-light text-white tabular-nums tracking-tight drop-shadow-sm">
                    {windSpeed} <span className="text-xs font-normal text-white/80">km/h</span>
                  </div>
                  <div className="text-[11px] text-white/80 mt-0.5 font-medium">Wind {compass}</div>
                </div>
                <div className="w-8 h-8 rounded-sg bg-emerald-400/20 border border-emerald-400/40 flex items-center justify-center">
                  <Wind className="w-5 h-5 text-emerald-300 stroke-[1.8]" />
                </div>
              </div>
            </div>
          </div>

          {/* Center Column (Cols 5 to 8): Live Doppler Weather Radar Map */}
          <div className="lg:col-span-4 flex flex-col justify-between">
            <div className="h-full min-h-[260px] flex flex-col justify-center">
              <WeatherRadarMap
                lat={lat}
                lon={lon}
                cityName={locationLabel}
                temperature={displayTemp}
                isExpanded={isMapExpanded}
                onToggleExpand={() => setIsMapExpanded(!isMapExpanded)}
                theme={theme}
                className="w-full h-full min-h-[260px] max-h-[310px] shadow-lg border-2 border-white/30"
              />
            </div>
          </div>

          {/* Right Column (Cols 9 to 12): Big Temperature, Telemetry & 4 Regional Sectors */}
          <div className="lg:col-span-4 flex flex-col justify-between space-y-4 lg:pl-2">
            <div>
              <div className="flex items-start gap-1">
                <span className="text-7xl sm:text-8xl font-extralight tracking-tighter text-white leading-none tabular-nums drop-shadow-lg">
                  {displayTemp}
                </span>
                <span className="text-3xl sm:text-4xl font-light text-white/80 mt-1">°</span>
              </div>

              <div className="mt-2 space-y-1 text-xs font-mono uppercase tracking-wider text-white">
                <div className="flex items-center gap-2.5 text-[11px] bg-black/20 px-2.5 py-1 rounded-sg border border-white/15 w-fit">
                  <span className="font-semibold">WIND: {windSpeed} KM/H {compass}</span>
                  <span className="text-white/40">•</span>
                  <span>UV INDEX: {uvIndexVal} / 10</span>
                </div>
                {todayHigh !== null && todayLow !== null && (
                  <div className="text-white/90 text-[11px] px-0.5 font-medium">
                    HIGH <span className="font-bold text-white">{todayHigh}°</span> <span className="text-white/40">/</span> LOW <span className="font-bold text-white">{todayLow}°</span>
                  </div>
                )}
                <div className="font-bold text-white tracking-widest text-xs pt-0.5 drop-shadow-sm">
                  {locationLabel.toUpperCase()}
                </div>
              </div>
            </div>

            {/* Regional Sectors (4 Decorated Rows Matching Reference) */}
            <div className="space-y-1.5 w-full">
              <div className="text-[10px] font-mono uppercase tracking-wider text-white/70 pb-0.5 flex items-center justify-between">
                <span>Global Comparison Sectors</span>
                <span className="text-white/50 text-[9px]">Live synoptic feeds</span>
              </div>

              <div className="space-y-1.5">
                {popularCities.slice(0, 4).map((city) => {
                  const isSelected = location?.name === city.name;
                  const live = curatedWeatherMap?.[city.name];
                  const displayCityTemp = live ? `${live.temperature}°` : "--";
                  const displayCode = live ? live.weatherCode : 0;
                  const displayIsDay = live ? live.isDay : false;

                  return (
                    <button
                      key={city.id}
                      type="button"
                      onClick={() => onSelectCity(city)}
                      className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-sg transition-all duration-200 text-xs font-mono border cursor-pointer ${
                        isSelected
                          ? "bg-white text-[#1E3A5F] font-bold shadow-lg border-white border-l-4 border-l-[#2563EB] scale-[1.02]"
                          : "bg-white/15 hover:bg-white/25 text-white border-white/20 backdrop-blur-sm hover:translate-x-1.5 hover:border-white/40"
                      }`}
                    >
                      <span className="font-medium text-xs tracking-wide">{city.name}</span>
                      <div className="flex items-center gap-2.5">
                        <span className="text-xs font-bold tabular-nums">{displayCityTemp}</span>
                        <LivingWeatherIcon
                          code={displayCode}
                          isDay={displayIsDay}
                          className="w-4 h-4"
                        />
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. Bottom Subtle Wave Curve (Clean Minimal Sine Wave Line) */}
      {waveSvg && (
        <div className="px-4 pb-10 pt-2 z-20 relative w-full opacity-70">
          <div className="w-full overflow-hidden">
            <svg
              viewBox={`0 0 ${waveSvg.svgWidth} ${waveSvg.svgHeight}`}
              className="w-full h-8 overflow-visible select-none"
              preserveAspectRatio="none"
            >
              <path
                d={waveSvg.pathD}
                fill="none"
                stroke="rgba(255, 255, 255, 0.55)"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
            </svg>
          </div>
        </div>
      )}
    </div>
  );
};
