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
        return <Sun className="w-4 h-4 text-amber-400" />;
      case "mostly-clear":
      case "partly-cloudy":
        return <CloudSun className="w-4 h-4 text-amber-300" />;
      case "overcast":
      case "cloudy":
        return <Cloud className="w-4 h-4 text-zinc-300" />;
      case "rain":
      case "drizzle":
      case "heavy-rain":
        return <CloudRain className="w-4 h-4 text-blue-400" />;
      case "thunderstorm":
        return <CloudLightning className="w-4 h-4 text-amber-400" />;
      case "snow":
        return <Snowflake className="w-4 h-4 text-sky-200" />;
      default:
        return <CloudSun className="w-4 h-4 text-zinc-300" />;
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
      <div className="p-6 surface-panel text-center text-zinc-400 text-xs">
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
    <div className="surface-panel p-6 sm:p-7 shadow-sm">
      <div className="flex items-center justify-between pb-4 mb-2 border-b border-[#262c36]">
        <div>
          <h3 className="text-sm font-semibold text-white flex items-center gap-2">
            <Calendar className="w-4 h-4 text-blue-400" />
            <span>Seven-Day Forecast Summary</span>
          </h3>
          <p className="text-xs text-zinc-400">
            Numerical Model Projections from Open-Meteo
          </p>
        </div>
        <span className="text-xs font-medium text-zinc-400 bg-[#11141a] px-2 py-0.5 rounded border border-[#212630]">
          {daily.length} Days
        </span>
      </div>

      <div className="divide-y divide-[#212630]">
        {daily.map((day, idx) => {
          const leftPercent = Math.max(0, ((day.temperature_2m_min - weekMin) / weekSpan) * 100);
          const rightPercent = Math.min(100, ((day.temperature_2m_max - weekMin) / weekSpan) * 100);
          const barWidth = Math.max(8, rightPercent - leftPercent);

          return (
            <div
              key={day.date}
              className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 hover:bg-[#1f242c]/50 rounded-lg px-2 transition-colors"
            >
              {/* Day Date & Condition */}
              <div className="flex items-center gap-3 min-w-[180px]">
                <div className="p-1.5 bg-[#11141a] rounded border border-[#212630] shrink-0">
                  {getIcon(day.weather_icon)}
                </div>
                <div>
                  <p className="text-xs font-semibold text-white flex items-center gap-1.5">
                    {formatDayName(day.date, idx)}
                    {idx === 0 && (
                      <span className="text-[10px] font-medium px-1.5 py-0.2 rounded bg-blue-500/20 text-blue-300">
                        NOW
                      </span>
                    )}
                  </p>
                  <p className="text-[11px] text-zinc-400 capitalize">
                    {day.weather_description || "N/A"}
                  </p>
                </div>
              </div>

              {/* Rain & Wind */}
              <div className="flex items-center gap-4 text-xs text-zinc-300 font-mono">
                <div className="flex items-center gap-1 min-w-[95px]">
                  <Droplets className="w-3.5 h-3.5 text-blue-400" />
                  <span>
                    {day.precipitation_sum !== null && day.precipitation_sum !== undefined
                      ? `${day.precipitation_sum.toFixed(1)} ${precipUnit}`
                      : `0.0 ${precipUnit}`}
                  </span>
                  {day.precipitation_probability_max !== null && day.precipitation_probability_max !== undefined && (
                    <span className="text-[10px] text-zinc-500">
                      ({day.precipitation_probability_max}%)
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-1 min-w-[80px] hidden sm:flex">
                  <Wind className="w-3.5 h-3.5 text-zinc-400" />
                  <span className="text-zinc-400 text-[11px]">
                    {day.wind_gusts_10m_max !== null && day.wind_gusts_10m_max !== undefined
                      ? `${Math.round(day.wind_gusts_10m_max)} ${gustUnit}`
                      : "—"}
                  </span>
                </div>
              </div>

              {/* Temperature Slider & Bounds */}
              <div className="flex items-center gap-2.5 min-w-[160px] justify-end font-mono">
                <span className="text-xs text-zinc-400 w-7 text-right">
                  {Math.round(day.temperature_2m_min)}°
                </span>

                <div className="w-20 h-1.5 bg-[#11141a] rounded-full overflow-hidden relative border border-[#212630]">
                  <div
                    className="absolute top-0 bottom-0 rounded-full bg-blue-500"
                    style={{
                      left: `${leftPercent}%`,
                      width: `${barWidth}%`,
                    }}
                  />
                </div>

                <span className="text-xs font-semibold text-white w-7 text-left">
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
