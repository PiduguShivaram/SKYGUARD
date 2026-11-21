"use client";

import React from "react";
import { DailyForecastPoint } from "@/types";
import { LivingWeatherIcon } from "./LivingWeatherIcons";

interface LivingDailyOutlookProps {
  daily: DailyForecastPoint[];
}

export function LivingDailyOutlook({ daily }: LivingDailyOutlookProps) {
  if (!daily || daily.length === 0) return null;

  // Find min and max across all days for normalized slider bars
  const minTemp = Math.min(...daily.map((d) => d.temperature_2m_min));
  const maxTemp = Math.max(...daily.map((d) => d.temperature_2m_max));
  const tempRange = Math.max(1, maxTemp - minTemp);

  return (
    <div className="w-full bg-slate-900/50 border border-slate-800/80 rounded-2xl p-5 backdrop-blur-md shadow-xl">
      <div className="flex items-center justify-between mb-4 px-1">
        <h3 className="text-xs font-mono uppercase tracking-widest text-slate-300">
          7-Day Planetary Outlook
        </h3>
        <span className="text-[11px] font-mono text-slate-400">
          NWP Multi-Model Trajectory
        </span>
      </div>

      <div className="space-y-2.5">
        {daily.slice(0, 7).map((day, idx) => {
          const date = new Date(day.date);
          const dayName = idx === 0 ? "Today" : date.toLocaleDateString([], { weekday: "short" });
          const dayMin = Math.round(day.temperature_2m_min);
          const dayMax = Math.round(day.temperature_2m_max);
          const rainMax = day.precipitation_probability_max ?? 0;

          // Normalized bar offsets
          const leftPercent = ((day.temperature_2m_min - minTemp) / tempRange) * 100;
          const widthPercent = ((day.temperature_2m_max - day.temperature_2m_min) / tempRange) * 100;

          return (
            <div
              key={day.date}
              className="flex items-center justify-between gap-3 py-2 px-3 rounded-xl hover:bg-slate-800/40 transition-colors"
            >
              <span className="w-16 text-sm font-medium text-slate-200">{dayName}</span>

              {/* Weather icon & description */}
              <div className="flex items-center gap-2 w-36">
                <LivingWeatherIcon code={day.weather_code} size={22} isDay={true} />
                <span className="text-xs text-slate-400 truncate">{day.weather_description}</span>
              </div>

              {/* Rain chance */}
              <div className="w-12 text-right">
                {rainMax > 0 ? (
                  <span className="text-xs font-mono text-sky-400">{rainMax}%</span>
                ) : (
                  <span className="text-xs font-mono text-slate-600">-</span>
                )}
              </div>

              {/* Temperature Range Slider Bar */}
              <div className="flex-1 flex items-center gap-2 max-w-[200px]">
                <span className="w-7 text-right text-xs font-mono text-slate-400 tabular-nums">
                  {dayMin}°
                </span>
                <div className="relative flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="absolute top-0 bottom-0 rounded-full bg-gradient-to-r from-sky-400 to-amber-400"
                    style={{
                      left: `${leftPercent}%`,
                      width: `${Math.max(8, widthPercent)}%`,
                    }}
                  />
                </div>
                <span className="w-7 text-left text-xs font-mono text-slate-100 font-semibold tabular-nums">
                  {dayMax}°
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
