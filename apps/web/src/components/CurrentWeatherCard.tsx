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
          <Sun className="w-14 h-14 text-amber-400 drop-shadow-[0_0_12px_rgba(251,191,36,0.5)]" />
        ) : (
          <Sun className="w-14 h-14 text-indigo-300 drop-shadow-[0_0_12px_rgba(165,180,252,0.4)]" />
        );
      case "mostly-clear":
      case "partly-cloudy":
        return <CloudSun className="w-14 h-14 text-sky-400 drop-shadow-[0_0_12px_rgba(56,189,248,0.4)]" />;
      case "overcast":
      case "cloudy":
        return <Cloud className="w-14 h-14 text-slate-300 drop-shadow-[0_0_10px_rgba(203,213,225,0.2)]" />;
      case "rain":
      case "drizzle":
      case "rain-showers":
      case "heavy-rain":
        return <CloudRain className="w-14 h-14 text-blue-400 drop-shadow-[0_0_12px_rgba(96,165,250,0.5)]" />;
      case "thunderstorm":
      case "thunderstorm-hail":
        return <CloudLightning className="w-14 h-14 text-amber-400 drop-shadow-[0_0_15px_rgba(251,191,36,0.6)]" />;
      case "fog":
        return <CloudFog className="w-14 h-14 text-slate-400" />;
      case "snow":
      case "heavy-snow":
        return <Snowflake className="w-14 h-14 text-sky-200 drop-shadow-[0_0_12px_rgba(186,230,253,0.5)]" />;
      default:
        return <CloudSun className="w-14 h-14 text-sky-400" />;
    }
  };

  return (
    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#0c1322] via-[#0a101d] to-[#070b14] border border-white/[0.08] p-6 sm:p-8 shadow-2xl backdrop-blur-xl">
      {/* Background ambient lighting */}
      <div className="absolute top-0 right-0 -mt-12 -mr-12 w-96 h-96 bg-gradient-to-br from-sky-500/10 via-indigo-500/5 to-transparent rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 -mb-12 -ml-12 w-80 h-80 bg-gradient-to-tr from-emerald-500/5 via-sky-500/5 to-transparent rounded-full blur-3xl pointer-events-none" />

      {/* Header: Location & Model Grid Cell Metadata */}
      <div className="relative z-10 flex flex-col md:flex-row md:items-start justify-between gap-4 pb-6 border-b border-white/[0.08]">
        <div className="space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-sky-400 bg-sky-500/10 px-2.5 py-0.5 rounded-full border border-sky-400/20">
              NWP Model-Estimated Current Conditions
            </span>
            <span className="text-[10px] font-mono font-medium px-2 py-0.5 rounded-full bg-white/[0.04] text-slate-300 border border-white/[0.08]">
              Numerical Model Grid Cell
            </span>
          </div>

          <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight pt-1">
            {locationLabel || `${weather.latitude.toFixed(2)}°N, ${weather.longitude.toFixed(2)}°E`}
          </h2>

          <div className="text-xs text-slate-400 font-mono space-y-1 pt-1 leading-relaxed">
            <p className="text-[11px] text-slate-400/90">
              Derived from Open-Meteo NWP model simulation (grid cell {weather.latitude.toFixed(4)}°N, {weather.longitude.toFixed(4)}°E); not an in-situ physical station observation.
            </p>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-slate-400">
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
        <div className="flex items-center gap-2.5 text-xs text-slate-200 bg-[#060a14]/90 px-3.5 py-2.5 rounded-2xl border border-white/[0.08] shrink-0 self-start shadow-inner">
          <div className="p-1.5 rounded-lg bg-sky-500/10 text-sky-400 border border-sky-500/20">
            <Clock className="w-4 h-4" />
          </div>
          <div>
            <p className="text-[10px] text-slate-400 uppercase font-semibold tracking-wider">Provider Valid Time</p>
            <p className="font-mono font-semibold text-white text-xs">{current.time}</p>
          </div>
        </div>
      </div>

      {/* Main Temperature and Weather Icon Showcase */}
      <div className="relative z-10 py-6 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="flex items-center gap-6">
          <div className="p-4 rounded-3xl bg-[#070d1a] border border-white/[0.08] shadow-[0_0_30px_-5px_rgba(0,0,0,0.5)]">
            {getWeatherIcon(current.weather_icon, current.is_day)}
          </div>
          <div className="space-y-1">
            <div className="flex items-baseline gap-2">
              <span className="text-6xl sm:text-7xl font-black text-white tracking-tight font-mono">
                {Math.round(current.temperature_2m)}
              </span>
              <span className="text-3xl sm:text-4xl font-bold text-sky-400 font-mono">
                {tempUnit}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-base sm:text-lg font-bold text-slate-200 capitalize">
                {current.weather_description || "Clear Sky"}
              </span>
              <span className="text-xs text-slate-400 font-medium">
                · Feels like <span className="text-white font-mono font-semibold">{Math.round(current.apparent_temperature)}{apparentUnit}</span>
              </span>
            </div>
          </div>
        </div>

        {/* Day / Night & Wind Quick Pill */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="px-3.5 py-2 rounded-xl bg-white/[0.03] border border-white/[0.06] text-xs flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${current.is_day ? "bg-amber-400 shadow-[0_0_8px_#f59e0b]" : "bg-indigo-400"}`} />
            <span className="font-medium text-slate-300">{current.is_day ? "Solar Daylight" : "Night Cycle"}</span>
          </div>
          <div className="px-3.5 py-2 rounded-xl bg-white/[0.03] border border-white/[0.06] text-xs flex items-center gap-2">
            <Wind className="w-3.5 h-3.5 text-sky-400" />
            <span className="font-mono text-slate-300 font-medium">{current.wind_speed_10m} {windUnit} ({current.wind_direction_10m}°)</span>
          </div>
        </div>
      </div>

      {/* 4-Column Atmospheric Bento Grid */}
      <div className="relative z-10 grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 pt-2">
        {/* Metric 1: Apparent Temp */}
        <div className="p-4 rounded-2xl bg-[#070d1a]/80 border border-white/[0.06] hover:border-sky-500/30 transition-all duration-200">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[11px] font-semibold tracking-wider uppercase">Thermal Index</span>
            <Thermometer className="w-4 h-4 text-rose-400" />
          </div>
          <p className="text-2xl font-bold font-mono text-white">
            {current.apparent_temperature.toFixed(1)}
            <span className="text-xs font-normal text-slate-400 ml-1">{apparentUnit}</span>
          </p>
          <p className="text-[10px] text-slate-400 mt-1">Apparent skin feel</p>
        </div>

        {/* Metric 2: Relative Humidity */}
        <div className="p-4 rounded-2xl bg-[#070d1a]/80 border border-white/[0.06] hover:border-sky-500/30 transition-all duration-200">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[11px] font-semibold tracking-wider uppercase">Humidity</span>
            <Droplets className="w-4 h-4 text-sky-400" />
          </div>
          <p className="text-2xl font-bold font-mono text-white">
            {current.relative_humidity_2m}
            <span className="text-xs font-normal text-slate-400 ml-1">{humidityUnit}</span>
          </p>
          <p className="text-[10px] text-slate-400 mt-1">Relative moisture</p>
        </div>

        {/* Metric 3: Wind Vector */}
        <div className="p-4 rounded-2xl bg-[#070d1a]/80 border border-white/[0.06] hover:border-sky-500/30 transition-all duration-200">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[11px] font-semibold tracking-wider uppercase">Wind Speed</span>
            <Wind className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-2xl font-bold font-mono text-white">
            {current.wind_speed_10m.toFixed(1)}
            <span className="text-xs font-normal text-slate-400 ml-1">{windUnit}</span>
          </p>
          <p className="text-[10px] text-slate-400 mt-1 font-mono">Bearing: {current.wind_direction_10m}°</p>
        </div>

        {/* Metric 4: Precipitation */}
        <div className="p-4 rounded-2xl bg-[#070d1a]/80 border border-white/[0.06] hover:border-sky-500/30 transition-all duration-200">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[11px] font-semibold tracking-wider uppercase">Precipitation</span>
            <CloudRain className="w-4 h-4 text-blue-400" />
          </div>
          <p className="text-2xl font-bold font-mono text-white">
            {current.precipitation.toFixed(1)}
            <span className="text-xs font-normal text-slate-400 ml-1">{precipUnit}</span>
          </p>
          <p className="text-[10px] text-slate-400 mt-1">Current rain volume</p>
        </div>
      </div>
    </div>
  );
};
