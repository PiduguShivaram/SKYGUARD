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
} from "lucide-react";
import { WeatherForecastResponse } from "@/types";

interface CurrentWeatherCardProps {
  weather: WeatherForecastResponse;
  locationLabel: string;
}

export const CurrentWeatherCard: React.FC<CurrentWeatherCardProps> = ({ weather, locationLabel }) => {
  const current = weather.current;
  const units = weather.units || {};
  const todayDaily = weather.daily && weather.daily.length > 0 ? weather.daily[0] : null;

  const tempUnit = units.temperature || "°C";
  const humidityUnit = units.relative_humidity || "%";
  const apparentUnit = units.apparent_temperature || "°C";
  const precipUnit = units.precipitation || "mm";
  const windUnit = units.wind_speed || "km/h";

  const getWeatherIcon = (iconName: string, isDay: number) => {
    switch (iconName) {
      case "clear":
        return isDay ? (
          <Sun className="w-10 h-10 text-[#FCD34D]" />
        ) : (
          <Sun className="w-10 h-10 text-[#8B95A8]" />
        );
      case "mostly-clear":
      case "partly-cloudy":
        return <CloudSun className="w-10 h-10 text-[#FCD34D]" />;
      case "overcast":
      case "cloudy":
        return <Cloud className="w-10 h-10 text-[#8B95A8]" />;
      case "rain":
      case "drizzle":
      case "rain-showers":
      case "heavy-rain":
        return <CloudRain className="w-10 h-10 text-[#60A5FA]" />;
      case "thunderstorm":
      case "thunderstorm-hail":
        return <CloudLightning className="w-10 h-10 text-[#FCD34D]" />;
      case "fog":
        return <CloudFog className="w-10 h-10 text-[#8B95A8]" />;
      case "snow":
      case "heavy-snow":
        return <Snowflake className="w-10 h-10 text-[#E8EDF4]" />;
      default:
        return <CloudSun className="w-10 h-10 text-[#8B95A8]" />;
    }
  };

  return (
    <div className="surface-panel p-6 sm:p-7 shadow-card">
      {/* Location Headline & Model Disclosure */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 pb-5 border-b border-[#2A3141]">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-medium text-[#8B95A8] uppercase tracking-wider font-mono">
              NWP Model-Estimated Current Conditions
            </span>
          </div>

          <h2 className="text-2xl sm:text-3xl font-bold text-[#E8EDF4] tracking-tight font-sans">
            {locationLabel || `${weather.latitude.toFixed(2)}°N, ${weather.longitude.toFixed(2)}°E`}
          </h2>

          <p className="text-xs text-[#8B95A8] leading-relaxed max-w-2xl">
            Derived from Open-Meteo Numerical Weather Prediction (NWP) model physics forecast (grid cell {weather.latitude.toFixed(4)}°N, {weather.longitude.toFixed(4)}°E); not an in-situ physical station observation.
          </p>

          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-[#7C879B] font-mono pt-0.5">
            <span>
              Requested: {weather.requested_latitude.toFixed(4)}°N, {weather.requested_longitude.toFixed(4)}°E
              {weather.elevation !== undefined && weather.elevation !== null ? ` · Elevation: ${weather.elevation}m` : ""}
            </span>
            <span>·</span>
            <span>
              Timezone: {weather.timezone} {weather.timezone_abbreviation ? `(${weather.timezone_abbreviation})` : ""}
            </span>
          </div>
        </div>

        {/* Observation Timestamp */}
        <div className="flex items-center gap-2 text-xs text-[#8B95A8] bg-[#0C0F14] px-3 py-2 rounded-sg border border-[#2A3141] shrink-0 self-start">
          <Clock className="w-3.5 h-3.5 text-[#8B95A8]" />
          <div>
            <span className="text-[10px] uppercase text-[#7C879B] block leading-tight font-mono">Valid Time</span>
            <span className="font-mono text-[#E8EDF4] text-xs">{current.time}</span>
          </div>
        </div>
      </div>

      {/* Main Temperature and Conditions Focal Point */}
      <div className="py-6 flex flex-col sm:flex-row sm:items-center justify-between gap-6 border-b border-[#2A3141]">
        <div className="flex items-center gap-5">
          <div className="p-3 rounded-sg bg-[#0C0F14] border border-[#2A3141] shrink-0">
            {getWeatherIcon(current.weather_icon, current.is_day)}
          </div>

          <div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-5xl sm:text-6xl font-extrabold text-[#E8EDF4] tracking-tight tabular-nums font-sans">
                {Math.round(current.temperature_2m)}
              </span>
              <span className="text-2xl sm:text-3xl font-medium text-[#8B95A8] font-sans">
                {tempUnit}
              </span>
            </div>

            <div className="flex items-center gap-2 text-sm text-[#8B95A8] mt-1">
              <span className="font-medium text-[#E8EDF4] capitalize">{current.weather_description || "Clear Sky"}</span>
              <span className="text-[#7C879B]">·</span>
              <span>
                Feels like <strong className="text-[#E8EDF4] font-medium">{Math.round(current.apparent_temperature)}{apparentUnit}</strong>
              </span>
              {todayDaily && (
                <>
                  <span className="text-[#7C879B]">·</span>
                  <span className="text-[#8B95A8] flex items-center gap-1 font-mono text-xs">
                    <span>H: {Math.round(todayDaily.temperature_2m_max)}°</span>
                    <span>L: {Math.round(todayDaily.temperature_2m_min)}°</span>
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Day Cycle & Wind Capsule */}
        <div className="flex items-center gap-2.5">
          <div className="px-3 py-1.5 rounded-sg bg-[#0C0F14] border border-[#2A3141] text-xs text-[#8B95A8] flex items-center gap-2 font-mono">
            <span className={`w-2 h-2 rounded-full ${current.is_day ? "bg-[#FCD34D]" : "bg-[#60A5FA]"}`} />
            <span>{current.is_day ? "Daylight" : "Night"}</span>
          </div>
          <div className="px-3 py-1.5 rounded-sg bg-[#0C0F14] border border-[#2A3141] text-xs text-[#8B95A8] flex items-center gap-1.5 font-mono">
            <Wind className="w-3.5 h-3.5 text-[#8B95A8]" />
            <span>{current.wind_speed_10m} {windUnit}</span>
          </div>
        </div>
      </div>

      {/* Atmospheric Metrics Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-5">
        <div className="p-3 rounded-sg bg-[#0C0F14] border border-[#2A3141]">
          <span className="text-[11px] font-medium text-[#8B95A8] flex items-center justify-between">
            Humidity
            <Droplets className="w-3.5 h-3.5 text-[#60A5FA]" />
          </span>
          <p className="text-lg font-semibold text-[#E8EDF4] mt-1 font-mono">
            {current.relative_humidity_2m}{humidityUnit}
          </p>
          <span className="text-[10px] text-[#7C879B] block mt-0.5 font-mono">Moisture level</span>
        </div>

        <div className="p-3 rounded-sg bg-[#0C0F14] border border-[#2A3141]">
          <span className="text-[11px] font-medium text-[#8B95A8] flex items-center justify-between">
            Apparent Temp
            <Thermometer className="w-3.5 h-3.5 text-[#FB923C]" />
          </span>
          <p className="text-lg font-semibold text-[#E8EDF4] mt-1 font-mono">
            {Math.round(current.apparent_temperature)}{apparentUnit}
          </p>
          <span className="text-[10px] text-[#7C879B] block mt-0.5 font-mono">Biometeorological</span>
        </div>

        <div className="p-3 rounded-sg bg-[#0C0F14] border border-[#2A3141]">
          <span className="text-[11px] font-medium text-[#8B95A8] flex items-center justify-between">
            Precipitation
            <CloudRain className="w-3.5 h-3.5 text-[#60A5FA]" />
          </span>
          <p className="text-lg font-semibold text-[#E8EDF4] mt-1 font-mono">
            {current.precipitation !== undefined ? current.precipitation.toFixed(1) : "0.0"} {precipUnit}
          </p>
          <span className="text-[10px] text-[#7C879B] block mt-0.5 font-mono">Current rate</span>
        </div>

        <div className="p-3 rounded-sg bg-[#0C0F14] border border-[#2A3141]">
          <span className="text-[11px] font-medium text-[#8B95A8] flex items-center justify-between">
            Wind Direction
            <Compass className="w-3.5 h-3.5 text-[#8B95A8]" />
          </span>
          <p className="text-lg font-semibold text-[#E8EDF4] mt-1 font-mono">
            {current.wind_direction_10m !== undefined ? `${current.wind_direction_10m}°` : "n/a"}
          </p>
          <span className="text-[10px] text-[#7C879B] block mt-0.5 font-mono">Compass bearing</span>
        </div>
      </div>
    </div>
  );
};
