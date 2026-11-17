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
  Sunrise,
  Sunset,
} from "lucide-react";
import { DailyForecastPoint } from "@/types";

interface DailyForecastListProps {
  daily: DailyForecastPoint[];
}

export const DailyForecastList: React.FC<DailyForecastListProps> = ({ daily }) => {
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

  return (
    <div className="rounded-2xl bg-slate-800/80 border border-slate-700 p-6 shadow-xl">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-bold text-white flex items-center gap-2">
          <Calendar className="w-4 h-4 text-blue-400" />
          <span>7-Day Outlook (Open-Meteo Ensemble)</span>
        </h3>
        <span className="text-xs text-slate-400">Daily summaries</span>
      </div>

      <div className="divide-y divide-slate-700/60">
        {daily.map((day, idx) => (
          <div
            key={day.date}
            className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-750/50 rounded-xl px-2.5 transition-colors"
          >
            {/* Day & Condition */}
            <div className="flex items-center gap-3 min-w-[170px]">
              <div className="p-2 bg-slate-900/60 rounded-xl border border-slate-700/60">
                {getIcon(day.weather_icon)}
              </div>
              <div>
                <p className="text-sm font-semibold text-white">
                  {formatDayName(day.date, idx)}
                </p>
                <p className="text-xs text-slate-400 capitalize">
                  {day.weather_description}
                </p>
              </div>
            </div>

            {/* Precipitation & Wind metrics */}
            <div className="flex items-center gap-4 text-xs text-slate-300">
              {/* Rain Chance & Total */}
              <div className="flex items-center gap-1.5 min-w-[90px]">
                <Droplets className="w-3.5 h-3.5 text-blue-400" />
                <span>
                  {day.precipitation_sum > 0
                    ? `${day.precipitation_sum.toFixed(1)} mm`
                    : "0 mm"}
                </span>
                {day.precipitation_probability_max !== null && (
                  <span className="text-[11px] text-slate-400">
                    ({day.precipitation_probability_max}%)
                  </span>
                )}
              </div>

              {/* Peak Gusts */}
              <div className="flex items-center gap-1.5 min-w-[80px]">
                <Wind className="w-3.5 h-3.5 text-emerald-400" />
                <span>{Math.round(day.wind_gusts_10m_max)} km/h</span>
              </div>
            </div>

            {/* Temperature Range */}
            <div className="flex items-center gap-2.5 justify-end min-w-[120px]">
              <span className="text-xs font-medium text-slate-400">
                {Math.round(day.temperature_2m_min)}°
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
                {Math.round(day.temperature_2m_max)}°C
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
