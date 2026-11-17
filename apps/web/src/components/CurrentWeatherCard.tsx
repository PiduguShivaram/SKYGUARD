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
  Compass,
  Clock,
  Eye,
} from "lucide-react";
import { CurrentWeather } from "@/types";

interface CurrentWeatherCardProps {
  current: CurrentWeather;
  locationLabel: string;
  latitude: number;
  longitude: number;
  elevation?: number;
  timezone: string;
}

export const CurrentWeatherCard: React.FC<CurrentWeatherCardProps> = ({
  current,
  locationLabel,
  latitude,
  longitude,
  elevation,
  timezone,
}) => {
  const getWeatherIcon = (iconName: string, isDay: number) => {
    switch (iconName) {
      case "clear":
        return isDay ? (
          <Sun className="w-16 h-16 text-amber-400 animate-spin-slow" />
        ) : (
          <Sun className="w-16 h-16 text-indigo-300" />
        );
      case "mostly-clear":
      case "partly-cloudy":
        return <CloudSun className="w-16 h-16 text-sky-400" />;
      case "overcast":
      case "cloudy":
        return <Cloud className="w-16 h-16 text-slate-400" />;
      case "rain":
      case "drizzle":
      case "rain-showers":
      case "heavy-rain":
        return <CloudRain className="w-16 h-16 text-blue-400" />;
      case "thunderstorm":
      case "thunderstorm-hail":
        return <CloudLightning className="w-16 h-16 text-amber-400" />;
      case "fog":
        return <CloudFog className="w-16 h-16 text-slate-400" />;
      case "snow":
      case "heavy-snow":
      case "snow-showers":
        return <Snowflake className="w-16 h-16 text-sky-200" />;
      default:
        return <CloudSun className="w-16 h-16 text-sky-400" />;
    }
  };

  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-800/90 via-slate-850 to-slate-900 border border-slate-700/80 p-6 sm:p-8 shadow-xl">
      {/* Background ambient glow */}
      <div className="absolute top-0 right-0 -mt-8 -mr-8 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Location & Time Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-6 border-b border-slate-700/60">
        <div>
          <span className="text-[11px] font-semibold uppercase tracking-wider text-blue-400">
            Current Conditions
          </span>
          <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
            {locationLabel || "Selected Coordinate"}
          </h2>
          <p className="text-xs text-slate-400">
            {latitude.toFixed(3)}°N, {longitude.toFixed(3)}°E
            {elevation !== undefined && elevation !== null ? ` · Elevation ${elevation}m` : ""}
            {` · Timezone ${timezone}`}
          </p>
        </div>

        <div className="flex items-center gap-1.5 text-xs text-slate-400 bg-slate-800/80 px-3 py-1.5 rounded-xl border border-slate-700 w-fit">
          <Clock className="w-3.5 h-3.5 text-blue-400" />
          <span>Observed: {new Date(current.time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
        </div>
      </div>

      {/* Temperature & Primary Condition */}
      <div className="py-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="flex items-center gap-5">
          <div className="p-3 bg-slate-800/80 rounded-2xl border border-slate-700 shadow-inner">
            {getWeatherIcon(current.weather_icon, current.is_day)}
          </div>
          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-5xl sm:text-6xl font-black text-white tracking-tight">
                {Math.round(current.temperature_2m)}°
              </span>
              <span className="text-2xl text-slate-400 font-semibold">C</span>
            </div>
            <p className="text-lg font-medium text-slate-200 capitalize">
              {current.weather_description}
            </p>
            <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
              <Thermometer className="w-3.5 h-3.5 text-amber-400" />
              <span>Feels like {Math.round(current.apparent_temperature)}°C</span>
            </p>
          </div>
        </div>

        {/* Secondary Weather KPIs */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 w-full md:w-auto">
          {/* Humidity */}
          <div className="p-3.5 bg-slate-800/60 rounded-xl border border-slate-700/60 flex items-center gap-3">
            <div className="p-2 bg-blue-500/10 text-blue-400 rounded-lg">
              <Droplets className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[11px] text-slate-400">Humidity</p>
              <p className="text-sm font-bold text-white">{current.relative_humidity_2m}%</p>
            </div>
          </div>

          {/* Wind */}
          <div className="p-3.5 bg-slate-800/60 rounded-xl border border-slate-700/60 flex items-center gap-3">
            <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-lg">
              <Wind className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[11px] text-slate-400">Wind</p>
              <p className="text-sm font-bold text-white">{Math.round(current.wind_speed_10m)} km/h</p>
            </div>
          </div>

          {/* Precipitation */}
          <div className="p-3.5 bg-slate-800/60 rounded-xl border border-slate-700/60 flex items-center gap-3 col-span-2 sm:col-span-1">
            <div className="p-2 bg-sky-500/10 text-sky-400 rounded-lg">
              <CloudRain className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[11px] text-slate-400">Precipitation</p>
              <p className="text-sm font-bold text-white">{current.precipitation.toFixed(1)} mm</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
