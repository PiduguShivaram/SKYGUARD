"use client";

import React from "react";
import { DailyForecastPoint } from "@/types";
import { LivingWeatherIcon } from "./LivingWeatherIcons";

interface LivingDailyOutlookProps {
  daily: DailyForecastPoint[];
}

function getTempColor(celsius: number): string {
  if (celsius <= 0) return "#60A5FA";
  if (celsius <= 10) return "#38BDF8";
  if (celsius <= 20) return "#34D399";
  if (celsius <= 28) return "#FCD34D";
  return "#FB923C";
}

export function LivingDailyOutlook({ daily }: LivingDailyOutlookProps) {
  if (!daily || daily.length === 0) return null;

  // Shared scale across all 7 rows
  const minTemp = Math.min(...daily.map((d) => d.temperature_2m_min));
  const maxTemp = Math.max(...daily.map((d) => d.temperature_2m_max));
  const tempRange = Math.max(1, maxTemp - minTemp);

  return (
    <div className="surface-panel p-5 w-full">
      <div className="flex items-center justify-between mb-4 pb-2.5 border-b border-white/10">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-white/70 font-mono">
          7-Day Planetary Outlook
        </h3>
        <span className="text-[11px] font-mono text-white/50">
          NWP Multi-Model Trajectory
        </span>
      </div>

      <div className="space-y-1.5">
        {daily.slice(0, 7).map((day, idx) => {
          const date = new Date(day.date);
          const dayName = idx === 0 ? "Today" : date.toLocaleDateString([], { weekday: "short" });
          const dayMin = Math.round(day.temperature_2m_min);
          const dayMax = Math.round(day.temperature_2m_max);
          const rainMax = day.precipitation_probability_max;

          // Normalized bar offsets on the shared 7-day scale
          const leftPercent = Math.max(0, Math.min(100, ((day.temperature_2m_min - minTemp) / tempRange) * 100));
          const widthPercent = Math.max(8, Math.min(100 - leftPercent, ((day.temperature_2m_max - day.temperature_2m_min) / tempRange) * 100));

          const colorStart = getTempColor(dayMin);
          const colorEnd = getTempColor(dayMax);

          return (
            <div
              key={day.date}
              className="flex items-center justify-between gap-3 py-2 px-2.5 rounded-sg hover:bg-white/10 transition-colors text-xs"
            >
              <span className="w-16 font-medium text-white">{dayName}</span>

              {/* Weather icon & description */}
              <div className="flex items-center gap-2 w-36">
                <LivingWeatherIcon code={day.weather_code} size={20} isDay={true} />
                <span className="text-xs text-white/70 truncate">{day.weather_description || "Clear"}</span>
              </div>

              {/* Rain chance: explicit n/a if missing */}
              <div className="w-12 text-right">
                {rainMax !== undefined && rainMax !== null ? (
                  <span className="font-mono text-[#60A5FA]">{rainMax}%</span>
                ) : (
                  <span className="font-mono text-white/40">n/a</span>
                )}
              </div>

              {/* Temperature Range Slider Bar: 4px track radius */}
              <div className="flex-1 flex items-center gap-2 max-w-[200px]">
                <span className="w-7 text-right font-mono text-white/70 tabular-nums">
                  {dayMin}°
                </span>
                <div className="relative flex-1 h-1.5 bg-black/30 rounded-sg overflow-hidden border border-white/15">
                  <div
                    className="absolute top-0 bottom-0 rounded-sg"
                    style={{
                      left: `${leftPercent}%`,
                      width: `${widthPercent}%`,
                      background: `linear-gradient(90deg, ${colorStart} 0%, ${colorEnd} 100%)`,
                    }}
                  />
                </div>
                <span className="w-7 text-left font-mono text-white font-semibold tabular-nums">
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
