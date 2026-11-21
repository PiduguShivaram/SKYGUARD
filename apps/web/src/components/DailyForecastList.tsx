"use client";

import React from "react";
import {
  Calendar,
  CloudSun,
  CloudRain,
  Sun,
  Cloud,
  CloudLightning,
  Wind,
  Droplets,
  Snowflake,
} from "lucide-react";
import { DailyForecastPoint } from "@/types";

interface DailyForecastListProps {
  daily: DailyForecastPoint[];
  units: Record<string, string>;
}

export const DailyForecastList: React.FC<DailyForecastListProps> = ({ daily, units }) => {
  const tempUnit = units.temperature || "°C";
  const precipUnit = units.precipitation || "mm";
  const gustUnit = units.wind_gusts || "km/h";

  const getIcon = (iconName: string) => {
    switch (iconName) {
      case "clear":
        return <Sun className="w-5 h-5 text-amber-400" />;
      case "mostly-clear":
      case "partly-cloudy":
        return <CloudSun className="w-5 h-5 text-sky-400" />;
      case "overcast":
      case "cloudy":
        return <Cloud className="w-5 h-5 text-slate-300" />;
      case "rain":
      case "drizzle":
      case "heavy-rain":
        return <CloudRain className="w-5 h-5 text-blue-400" />;
      case "thunderstorm":
        return <CloudLightning className="w-5 h-5 text-amber-400" />;
      case "snow":
        return <Snowflake className="w-5 h-5 text-sky-200" />;
      default:
        return <CloudSun className="w-5 h-5 text-sky-400" />;
    }
  };

  const formatDayName = (dateStr: string, idx: number) => {
    if (idx === 0) return "Today";
    if (idx === 1) return "Tomorrow";
    const d = new Date(dateStr);
    return d.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" });
  };

  if (!daily || daily.length === 0) {
    return (
      <div className="p-6 bg-[#0c1322]/80 rounded-2xl border border-white/[0.08] text-center text-slate-400 text-xs">
        Seven-day forecast data is currently unavailable from the provider.
      </div>
    );
  }

  // Calculate global min and max across all 7 days for relative range bars
  const minTemps = daily.map((d) => d.temperature_2m_min);
  const maxTemps = daily.map((d) => d.temperature_2m_max);
  const weekMin = Math.min(...minTemps);
  const weekMax = Math.max(...maxTemps);
  const weekSpan = Math.max(1, weekMax - weekMin);

  return (
    <div className="rounded-3xl bg-gradient-to-br from-[#0c1322] via-[#0a101d] to-[#070b14] border border-white/[0.08] p-6 sm:p-7 shadow-2xl backdrop-blur-xl">
      <div className="flex items-center justify-between pb-4 mb-3 border-b border-white/[0.08]">
        <div>
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Calendar className="w-4 h-4 text-sky-400" />
            <span>Seven-Day Forecast Summary</span>
          </h3>
          <p className="text-xs text-slate-400">
            Numerical Model Projections from Open-Meteo
          </p>
        </div>
        <span className="text-xs font-mono font-medium text-slate-400 bg-white/[0.04] px-2.5 py-1 rounded-full border border-white/[0.08]">
          {daily.length} Days
        </span>
      </div>

      <div className="divide-y divide-white/[0.06]">
        {daily.map((day, idx) => {
          // Calculate relative percentage offsets for visual temperature range bar
          const leftPercent = Math.max(0, ((day.temperature_2m_min - weekMin) / weekSpan) * 100);
          const rightPercent = Math.min(100, ((day.temperature_2m_max - weekMin) / weekSpan) * 100);
          const barWidth = Math.max(8, rightPercent - leftPercent);

          return (
            <div
              key={day.date}
              className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-white/[0.02] rounded-2xl px-3 transition-colors duration-150"
            >
              {/* Day Date & Weather Condition */}
              <div className="flex items-center gap-3.5 min-w-[190px]">
                <div className="p-2.5 bg-[#060a14] rounded-xl border border-white/[0.08] shadow-inner shrink-0">
                  {getIcon(day.weather_icon)}
                </div>
                <div>
                  <p className="text-sm font-bold text-white flex items-center gap-1.5">
                    {formatDayName(day.date, idx)}
                    {idx === 0 && (
                      <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-sky-500/20 text-sky-300">
                        NOW
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-slate-400 capitalize font-medium">
                    {day.weather_description || "N/A"}
                  </p>
                </div>
              </div>

              {/* Precipitation & Wind metrics */}
              <div className="flex items-center gap-4 text-xs text-slate-300">
                {/* Rain Chance & Total */}
                <div className="flex items-center gap-1.5 min-w-[100px]">
                  <Droplets className="w-3.5 h-3.5 text-sky-400" />
                  <span className="font-mono">
                    {day.precipitation_sum !== null && day.precipitation_sum !== undefined
                      ? `${day.precipitation_sum.toFixed(1)} ${precipUnit}`
                      : `0.0 ${precipUnit}`}
                  </span>
                  {day.precipitation_probability_max !== null && day.precipitation_probability_max !== undefined && (
                    <span className="text-[11px] text-slate-400 font-mono">
                      ({day.precipitation_probability_max}%)
                    </span>
                  )}
                </div>

                {/* Peak Wind Gusts */}
                <div className="flex items-center gap-1.5 min-w-[85px] hidden sm:flex">
                  <Wind className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="font-mono text-slate-300">
                    {day.wind_gusts_10m_max !== null && day.wind_gusts_10m_max !== undefined
                      ? `${Math.round(day.wind_gusts_10m_max)} ${gustUnit}`
                      : "N/A"}
                  </span>
                </div>
              </div>

              {/* Temperature Range Bar & Values */}
              <div className="flex items-center gap-3 min-w-[180px] justify-end">
                <span className="text-xs font-mono font-medium text-slate-400 w-9 text-right">
                  {Math.round(day.temperature_2m_min)}°
                </span>
                
                {/* Visual Thermometer Bar */}
                <div className="relative w-24 sm:w-28 h-2 rounded-full bg-white/[0.06] overflow-hidden">
                  <div
                    className="absolute top-0 bottom-0 rounded-full bg-gradient-to-r from-sky-400 via-amber-400 to-rose-400 shadow-sm"
                    style={{
                      left: `${leftPercent}%`,
                      width: `${barWidth}%`,
                    }}
                  />
                </div>

                <span className="text-xs font-mono font-bold text-white w-9 text-left">
                  {Math.round(day.temperature_2m_max)}°
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
