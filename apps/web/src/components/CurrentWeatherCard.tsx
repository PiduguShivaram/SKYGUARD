"use client";

import React from "react";
import {
  Sun,
  CloudSun,
  Cloud,
  CloudRain,
  CloudLightning,
  CloudFog,
  Snowflake,
  Wind,
  Droplets,
  Thermometer,
  Clock,
  Compass,
  MapPin,
  Gauge,
  Eye,
  ArrowUpRight,
  Shield,
  Layers,
} from "lucide-react";
import { WeatherForecastResponse } from "@/types";

interface CurrentWeatherCardProps {
  weather: WeatherForecastResponse;
  locationLabel: string;
}

export const CurrentWeatherCard: React.FC<CurrentWeatherCardProps> = ({ weather, locationLabel }) => {
  const current = weather.current;
  const units = weather.units || {};

  const tempUnit = units.temperature || "°C";
  const humidityUnit = units.relative_humidity || "%";
  const apparentUnit = units.apparent_temperature || "°C";
  const precipUnit = units.precipitation || "mm";
  const windUnit = units.wind_speed || "km/h";

  const getWeatherIcon = (iconName: string, isDay: number) => {
    switch (iconName) {
      case "clear":
        return isDay ? (
          <Sun className="w-12 h-12 text-amber-400 drop-shadow-[0_0_12px_rgba(245,158,11,0.4)]" />
        ) : (
          <Sun className="w-12 h-12 text-amber-200/80 drop-shadow-[0_0_12px_rgba(253,230,138,0.25)]" />
        );
      case "mostly-clear":
      case "partly-cloudy":
        return <CloudSun className="w-12 h-12 text-amber-300 drop-shadow-[0_0_12px_rgba(252,211,77,0.3)]" />;
      case "overcast":
      case "cloudy":
        return <Cloud className="w-12 h-12 text-zinc-300" />;
      case "rain":
      case "drizzle":
      case "rain-showers":
      case "heavy-rain":
        return <CloudRain className="w-12 h-12 text-sky-400" />;
      case "thunderstorm":
      case "thunderstorm-hail":
        return <CloudLightning className="w-12 h-12 text-amber-500 drop-shadow-[0_0_15px_rgba(245,158,11,0.5)]" />;
      case "fog":
        return <CloudFog className="w-12 h-12 text-zinc-400" />;
      case "snow":
      case "heavy-snow":
        return <Snowflake className="w-12 h-12 text-sky-200" />;
      default:
        return <CloudSun className="w-12 h-12 text-amber-300" />;
    }
  };

  return (
    <div className="relative overflow-hidden rounded-2xl bg-[#11141b] border border-[#202532] p-6 sm:p-7 shadow-2xl">
      {/* Geodetic Crosshair Corner Ticks */}
      <div className="absolute top-2 left-2 text-[#2b3243] font-mono text-[9px] select-none pointer-events-none">+</div>
      <div className="absolute top-2 right-2 text-[#2b3243] font-mono text-[9px] select-none pointer-events-none">+</div>
      <div className="absolute bottom-2 left-2 text-[#2b3243] font-mono text-[9px] select-none pointer-events-none">+</div>
      <div className="absolute bottom-2 right-2 text-[#2b3243] font-mono text-[9px] select-none pointer-events-none">+</div>

      {/* Header: Location & Model Grid Cell Metadata */}
      <div className="relative z-10 flex flex-col md:flex-row md:items-start justify-between gap-4 pb-5 border-b border-[#1c212c]">
        <div className="space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-amber-300 bg-amber-500/10 px-2.5 py-0.5 rounded border border-amber-500/25">
              NWP Model-Estimated Current Conditions
            </span>
            <span className="text-[10px] font-mono font-medium px-2 py-0.5 rounded bg-[#171a22] text-zinc-400 border border-[#242b38]">
              Numerical Model Grid Cell
            </span>
            <span className="text-[10px] font-mono text-zinc-500">
              [DATUM: WGS-84]
            </span>
          </div>

          <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight pt-1 font-sans">
            {locationLabel || `${weather.latitude.toFixed(2)}°N, ${weather.longitude.toFixed(2)}°E`}
          </h2>

          <div className="text-xs text-zinc-400 font-mono space-y-1 pt-1 leading-relaxed">
            <p className="text-[11px] text-zinc-400">
              Derived from Open-Meteo NWP model simulation (grid cell {weather.latitude.toFixed(4)}°N, {weather.longitude.toFixed(4)}°E); not an in-situ physical station observation.
            </p>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-zinc-500">
              <span>
                Requested: {weather.requested_latitude.toFixed(4)}°N, {weather.requested_longitude.toFixed(4)}°E
                {weather.elevation !== undefined && weather.elevation !== null ? ` · Elev: ${weather.elevation}m` : ""}
              </span>
              <span>
                Timezone: {weather.timezone} {weather.timezone_abbreviation ? `(${weather.timezone_abbreviation})` : ""}
                {weather.utc_offset_seconds !== undefined ? ` [UTC ${weather.utc_offset_seconds >= 0 ? "+" : ""}${(weather.utc_offset_seconds / 3600).toFixed(1)}h]` : ""}
              </span>
            </div>
          </div>
        </div>

        {/* Valid observation time from provider */}
        <div className="flex items-center gap-2.5 text-xs text-zinc-300 bg-[#0c0e13] px-3.5 py-2.5 rounded-xl border border-[#1e2330] shrink-0 self-start shadow-inner">
          <div className="p-1.5 rounded bg-[#171b24] text-amber-400 border border-[#252b3a]">
            <Clock className="w-3.5 h-3.5" />
          </div>
          <div>
            <p className="text-[9px] text-zinc-500 uppercase font-mono font-bold tracking-wider">Provider Valid Time</p>
            <p className="font-mono font-semibold text-zinc-200 text-xs">{current.time}</p>
          </div>
        </div>
      </div>

      {/* Main Temperature and Weather Icon Cockpit */}
      <div className="relative z-10 py-5 flex flex-col lg:flex-row lg:items-center justify-between gap-6 border-b border-[#1c212c]">
        <div className="flex items-center gap-5">
          <div className="p-3.5 rounded-xl bg-[#0c0e13] border border-[#202533] shadow-inner">
            {getWeatherIcon(current.weather_icon, current.is_day)}
          </div>
          <div className="space-y-0.5">
            <div className="flex items-baseline gap-2">
              <span className="text-6xl sm:text-7xl font-black text-white tracking-tighter font-mono">
                {Math.round(current.temperature_2m)}
              </span>
              <span className="text-3xl sm:text-4xl font-bold text-amber-400 font-mono">
                {tempUnit}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-base font-bold text-zinc-200 capitalize">
                {current.weather_description || "Clear Sky"}
              </span>
              <span className="text-xs text-zinc-400 font-medium font-mono">
                · Feels like <span className="text-white font-semibold">{Math.round(current.apparent_temperature)}{apparentUnit}</span>
              </span>
            </div>
          </div>
        </div>

        {/* Day / Night & Wind Quick Pill */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="px-3 py-1.5 rounded-lg bg-[#0c0e13] border border-[#1e2330] text-xs font-mono flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${current.is_day ? "bg-amber-400 shadow-[0_0_8px_#f59e0b]" : "bg-indigo-400"}`} />
            <span className="text-zinc-300 font-medium">{current.is_day ? "Solar Daylight" : "Night Cycle"}</span>
          </div>
          <div className="px-3 py-1.5 rounded-lg bg-[#0c0e13] border border-[#1e2330] text-xs font-mono flex items-center gap-2">
            <Wind className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-zinc-300 font-medium">{current.wind_speed_10m} {windUnit} ({current.wind_direction_10m}°)</span>
          </div>
        </div>
      </div>

      {/* Quadrant Calibrated Gauge Grid */}
      <div className="relative z-10 grid grid-cols-2 sm:grid-cols-4 gap-3 pt-5">
        {/* Humidity */}
        <div className="p-3.5 rounded-xl bg-[#0c0e13] border border-[#1e2330] shadow-inner space-y-1">
          <div className="flex items-center justify-between text-zinc-500">
            <span className="text-[10px] font-mono uppercase tracking-wider">Rel. Humidity</span>
            <Droplets className="w-3.5 h-3.5 text-sky-400" />
          </div>
          <p className="text-xl font-bold text-white font-mono">
            {current.relative_humidity_2m}
            <span className="text-xs text-zinc-400 ml-0.5">{humidityUnit}</span>
          </p>
          <p className="text-[10px] text-zinc-500 font-mono">Atmospheric moisture</p>
        </div>

        {/* Thermal Index / Feels-like */}
        <div className="p-3.5 rounded-xl bg-[#0c0e13] border border-[#1e2330] shadow-inner space-y-1">
          <div className="flex items-center justify-between text-zinc-500">
            <span className="text-[10px] font-mono uppercase tracking-wider">Apparent Temp</span>
            <Thermometer className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <p className="text-xl font-bold text-white font-mono">
            {Math.round(current.apparent_temperature)}
            <span className="text-xs text-zinc-400 ml-0.5">{apparentUnit}</span>
          </p>
          <p className="text-[10px] text-zinc-500 font-mono">Biometeorological delta</p>
        </div>

        {/* Precipitation Rate */}
        <div className="p-3.5 rounded-xl bg-[#0c0e13] border border-[#1e2330] shadow-inner space-y-1">
          <div className="flex items-center justify-between text-zinc-500">
            <span className="text-[10px] font-mono uppercase tracking-wider">Precipitation</span>
            <CloudRain className="w-3.5 h-3.5 text-sky-400" />
          </div>
          <p className="text-xl font-bold text-white font-mono">
            {current.precipitation !== undefined ? current.precipitation.toFixed(1) : "0.0"}
            <span className="text-xs text-zinc-400 ml-0.5">{precipUnit}</span>
          </p>
          <p className="text-[10px] text-zinc-500 font-mono">Instantaneous gauge</p>
        </div>

        {/* WMO Weather Code */}
        <div className="p-3.5 rounded-xl bg-[#0c0e13] border border-[#1e2330] shadow-inner space-y-1">
          <div className="flex items-center justify-between text-zinc-500">
            <span className="text-[10px] font-mono uppercase tracking-wider">WMO Synoptic Code</span>
            <Gauge className="w-3.5 h-3.5 text-zinc-400" />
          </div>
          <p className="text-xl font-bold text-white font-mono">
            {current.weather_code}
            <span className="text-xs text-zinc-400 ml-0.5">SYNOP</span>
          </p>
          <p className="text-[10px] text-zinc-500 font-mono">Standardized observation</p>
        </div>
      </div>
    </div>
  );
};
