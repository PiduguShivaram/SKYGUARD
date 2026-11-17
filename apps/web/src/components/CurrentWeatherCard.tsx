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
          <Sun className="w-16 h-16 text-amber-400" />
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
        return <Snowflake className="w-16 h-16 text-sky-200" />;
      default:
        return <CloudSun className="w-16 h-16 text-sky-400" />;
    }
  };

  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-850 via-slate-900 to-slate-950 border border-slate-700/80 p-6 sm:p-8 shadow-xl">
      {/* Background ambient lighting */}
      <div className="absolute top-0 right-0 -mt-10 -mr-10 w-72 h-72 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header: Location & Exact Coordinates */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-6 border-b border-slate-800">
        <div>
          <span className="text-[11px] font-semibold uppercase tracking-wider text-blue-400">
            Current Weather Observation (NWP Model)
          </span>
          <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
            {locationLabel || `${weather.latitude}°N, ${weather.longitude}°E`}
          </h2>
          <div className="text-xs text-slate-400 font-mono mt-1 space-y-0.5">
            <p>
              Requested: {weather.requested_latitude.toFixed(4)}°N, {weather.requested_longitude.toFixed(4)}°E
              {" · "}Grid Cell: {weather.latitude.toFixed(4)}°N, {weather.longitude.toFixed(4)}°E
              {weather.elevation !== undefined && weather.elevation !== null ? ` · Elev: ${weather.elevation}m` : ""}
            </p>
            <p>
              Timezone: {weather.timezone} {weather.timezone_abbreviation ? `(${weather.timezone_abbreviation})` : ""}
              {weather.utc_offset_seconds !== undefined ? ` [UTC ${weather.utc_offset_seconds >= 0 ? "+" : ""}${(weather.utc_offset_seconds / 3600).toFixed(1)}h]` : ""}
            </p>
          </div>
        </div>

        {/* Valid observation time from provider */}
        <div className="flex items-center gap-2 text-xs text-slate-300 bg-slate-800/90 px-3 py-2 rounded-xl border border-slate-700 shrink-0">
          <Clock className="w-4 h-4 text-blue-400" />
          <div>
            <p className="text-[10px] text-slate-400 uppercase font-semibold">Provider Valid Time</p>
            <p className="font-mono font-medium">{current.time}</p>
          </div>
        </div>
      </div>

      {/* Main Temperature and Icon Display */}
      <div className="py-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="flex items-center gap-5">
          <div className="p-3.5 bg-slate-800/80 rounded-2xl border border-slate-700 shadow-inner">
            {getWeatherIcon(current.weather_icon, current.is_day)}
          </div>
          <div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-5xl sm:text-6xl font-black text-white tracking-tight">
                {current.temperature_2m !== null && current.temperature_2m !== undefined
                  ? current.temperature_2m.toFixed(1)
                  : "N/A"}
              </span>
              <span className="text-2xl text-slate-400 font-bold">{tempUnit}</span>
            </div>
            <p className="text-lg font-medium text-slate-200 capitalize">
              {current.weather_description || "Unknown"}
            </p>
            <p className="text-xs text-slate-400 flex items-center gap-1 mt-1">
              <Thermometer className="w-3.5 h-3.5 text-amber-400" />
              <span>
                Apparent temperature:{" "}
                <strong className="text-slate-300">
                  {current.apparent_temperature !== null && current.apparent_temperature !== undefined
                    ? `${current.apparent_temperature.toFixed(1)} ${apparentUnit}`
                    : "N/A"}
                </strong>
              </span>
            </p>
          </div>
        </div>

        {/* Grid of Weather Metrics with Original Units */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 w-full md:w-auto">
          {/* Relative Humidity */}
          <div className="p-3.5 bg-slate-800/60 rounded-xl border border-slate-700/60 flex items-center gap-3">
            <div className="p-2 bg-blue-500/10 text-blue-400 rounded-lg">
              <Droplets className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[11px] text-slate-400">Relative Humidity</p>
              <p className="text-sm font-bold text-white">
                {current.relative_humidity_2m !== null && current.relative_humidity_2m !== undefined
                  ? `${current.relative_humidity_2m} ${humidityUnit}`
                  : "N/A"}
              </p>
            </div>
          </div>

          {/* Wind Speed & Direction */}
          <div className="p-3.5 bg-slate-800/60 rounded-xl border border-slate-700/60 flex items-center gap-3">
            <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-lg">
              <Wind className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[11px] text-slate-400">Wind Speed</p>
              <p className="text-sm font-bold text-white">
                {current.wind_speed_10m !== null && current.wind_speed_10m !== undefined
                  ? `${current.wind_speed_10m.toFixed(1)} ${windUnit}`
                  : "N/A"}
              </p>
            </div>
          </div>

          {/* Precipitation */}
          <div className="p-3.5 bg-slate-800/60 rounded-xl border border-slate-700/60 flex items-center gap-3 col-span-2 sm:col-span-1">
            <div className="p-2 bg-sky-500/10 text-sky-400 rounded-lg">
              <CloudRain className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[11px] text-slate-400">Current Precipitation</p>
              <p className="text-sm font-bold text-white">
                {current.precipitation !== null && current.precipitation !== undefined
                  ? `${current.precipitation.toFixed(1)} ${precipUnit}`
                  : "0.0 mm"}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
