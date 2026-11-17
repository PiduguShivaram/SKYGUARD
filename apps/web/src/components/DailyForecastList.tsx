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
        return <Cloud className="w-5 h-5 text-slate-400" />;
      case "rain":
      case "drizzle":
      case "heavy-rain":
        return <CloudRain className="w-5 h-5 text-blue-400" />;
      case "thunderstorm":
        return <CloudLightning className="w-5 h-5 text-amber-400" />;
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
      <div className="p-6 bg-slate-800/80 rounded-2xl border border-slate-700 text-center text-slate-400 text-xs">
        Seven-day forecast data is currently unavailable from the provider.
      </div>
    );
  }

  return (
    <div className="rounded-2xl bg-slate-800/80 border border-slate-700 p-6 shadow-xl">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Calendar className="w-4 h-4 text-blue-400" />
            <span>Seven-Day Forecast Summary</span>
          </h3>
          <p className="text-xs text-slate-400">
            Numerical Model Projections from Open-Meteo
          </p>
        </div>
        <span className="text-xs text-slate-400 font-mono">{daily.length} Days</span>
      </div>

      <div className="divide-y divide-slate-700/60">
        {daily.map((day, idx) => (
          <div
            key={day.date}
            className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-750/50 rounded-xl px-2.5 transition-colors"
          >
            {/* Day Date & Weather Condition */}
            <div className="flex items-center gap-3 min-w-[170px]">
              <div className="p-2 bg-slate-900/60 rounded-xl border border-slate-700/60">
                {getIcon(day.weather_icon)}
              </div>
              <div>
                <p className="text-sm font-semibold text-white">
                  {formatDayName(day.date, idx)}
                </p>
                <p className="text-xs text-slate-400 capitalize">
                  {day.weather_description || "N/A"}
                </p>
              </div>
            </div>

            {/* Precipitation & Wind metrics with API Units */}
            <div className="flex items-center gap-4 text-xs text-slate-300">
              {/* Rain Chance & Total */}
              <div className="flex items-center gap-1.5 min-w-[95px]">
                <Droplets className="w-3.5 h-3.5 text-blue-400" />
                <span>
                  {day.precipitation_sum !== null && day.precipitation_sum !== undefined
                    ? `${day.precipitation_sum.toFixed(1)} ${precipUnit}`
                    : `0.0 ${precipUnit}`}
                </span>
                {day.precipitation_probability_max !== null && day.precipitation_probability_max !== undefined && (
                  <span className="text-[11px] text-slate-400">
                    ({day.precipitation_probability_max}%)
                  </span>
                )}
              </div>

              {/* Peak Wind Gusts */}
              <div className="flex items-center gap-1.5 min-w-[85px]">
                <Wind className="w-3.5 h-3.5 text-emerald-400" />
                <span>
                  {day.wind_gusts_10m_max !== null && day.wind_gusts_10m_max !== undefined
                    ? `${Math.round(day.wind_gusts_10m_max)} ${gustUnit}`
                    : "N/A"}
                </span>
              </div>
            </div>

            {/* Min / Max Temperature Range */}
            <div className="flex items-center gap-2.5 justify-end min-w-[130px]">
              <span className="text-xs font-medium text-slate-400">
                {day.temperature_2m_min !== null && day.temperature_2m_min !== undefined
                  ? `${Math.round(day.temperature_2m_min)}°`
                  : "N/A"}
              </span>
              <div className="w-20 h-2 bg-slate-900 rounded-full overflow-hidden relative">
                <div
                  className="h-full bg-gradient-to-r from-blue-500 via-amber-400 to-rose-500 rounded-full"
                  style={{
                    width: `${Math.min(100, Math.max(25, (day.temperature_2m_max - day.temperature_2m_min) * 6))}%`,
                  }}
                />
              </div>
              <span className="text-sm font-bold text-white">
                {day.temperature_2m_max !== null && day.temperature_2m_max !== undefined
                  ? `${Math.round(day.temperature_2m_max)} ${tempUnit}`
                  : "N/A"}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
