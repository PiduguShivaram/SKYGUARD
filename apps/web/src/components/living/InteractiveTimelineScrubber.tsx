"use client";

import React, { useRef, useCallback } from "react";
import { HourlyForecastPoint } from "@/types";
import { LivingWeatherIcon } from "./LivingWeatherIcons";

interface InteractiveTimelineScrubberProps {
  hourly: HourlyForecastPoint[];
  selectedIndex: number;
  onSelectIndex: (idx: number) => void;
  timezone?: string;
}

export function InteractiveTimelineScrubber({
  hourly,
  selectedIndex,
  onSelectIndex,
  timezone,
}: InteractiveTimelineScrubberProps) {
  const railRef = useRef<HTMLDivElement>(null);
  const hours = hourly.slice(0, 24);

  const handlePointerInteraction = useCallback(
    (clientX: number) => {
      const rail = railRef.current;
      if (!rail) return;
      const rect = rail.getBoundingClientRect();
      const clickX = clientX - rect.left;
      const ratio = Math.max(0, Math.min(1, clickX / rect.width));
      const targetIdx = Math.round(ratio * (hours.length - 1));
      onSelectIndex(targetIdx);
    },
    [hours.length, onSelectIndex]
  );

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    handlePointerInteraction(e.clientX);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.buttons === 1) {
      handlePointerInteraction(e.clientX);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "ArrowLeft") {
      onSelectIndex(Math.max(0, selectedIndex - 1));
    } else if (e.key === "ArrowRight") {
      onSelectIndex(Math.min(hours.length - 1, selectedIndex + 1));
    } else if (e.key === "Home") {
      onSelectIndex(0);
    } else if (e.key === "End") {
      onSelectIndex(hours.length - 1);
    }
  };

  return (
    <div className="surface-panel p-4 w-full">
      <div className="flex items-center justify-between mb-3 px-1">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[#60A5FA]" />
          <h2 className="text-xs font-mono uppercase tracking-widest text-[#8B95A8]">
            24-Hour Atmospheric Timeline
          </h2>
        </div>
        <span className="text-[11px] font-mono text-[#7C879B]">
          Diurnal progression
        </span>
      </div>

      {/* Interactive Drag Rail */}
      <div
        ref={railRef}
        role="slider"
        tabIndex={0}
        aria-label="24-hour weather timeline"
        aria-valuemin={0}
        aria-valuemax={hours.length - 1}
        aria-valuenow={selectedIndex}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onKeyDown={handleKeyDown}
        className="relative flex items-center justify-between gap-1 py-3 px-2 select-none cursor-pointer overflow-x-auto focus:outline-none focus:ring-1 focus:ring-white/40 rounded-sg bg-black/20 backdrop-blur-sm border border-white/15"
      >
        {hours.map((point, idx) => {
          const date = new Date(point.time);
          let hourLabel = "";
          try {
            hourLabel = timezone
              ? new Intl.DateTimeFormat("en-US", { timeZone: timezone, hour: "numeric", hour12: true }).format(date)
              : date.toLocaleTimeString([], { hour: "numeric", hour12: true });
          } catch {
            hourLabel = date.toLocaleTimeString([], { hour: "numeric", hour12: true });
          }
          const temp = Math.round(point.temperature_2m ?? 0);
          const rain = point.precipitation_probability ?? 0;
          const code = point.weather_code ?? 0;
          const isSelected = idx === selectedIndex;
          const isDay = typeof point.is_day === "number"
            ? point.is_day === 1
            : date.getHours() >= 6 && date.getHours() <= 18;

          return (
            <button
              key={point.time}
              type="button"
              onClick={() => onSelectIndex(idx)}
              className={`flex-1 min-w-[58px] flex flex-col items-center py-2 px-1 rounded-sg transition-all duration-200 cursor-pointer ${
                isSelected
                  ? "bg-white text-[#1E3A5F] font-bold shadow-lg border-2 border-white scale-105 -translate-y-1 ring-2 ring-white/40"
                  : "bg-white/10 hover:bg-white/20 text-white/85 hover:text-white border border-white/15 hover:border-white/30 hover:-translate-y-0.5 hover:shadow-md"
              }`}
            >
              <span className={`text-[10px] font-mono mb-1 ${isSelected ? "text-[#1E3A5F] font-semibold" : "text-white/70"}`}>
                {hourLabel}
              </span>
              <div className="my-1">
                <LivingWeatherIcon code={code} isDay={isDay} size={22} />
              </div>
              <span className={`text-xs tabular-nums ${isSelected ? "text-[#1E3A5F] font-bold" : "text-white font-semibold"}`}>
                {temp}°
              </span>
              {rain > 0 ? (
                <span className={`text-[9px] font-mono mt-0.5 px-1 py-0.2 rounded-sg ${isSelected ? "bg-sky-600 text-white font-bold" : "bg-sky-500/30 text-sky-200 border border-sky-400/40"}`}>
                  {rain}%
                </span>
              ) : (
                <span className="text-[9px] font-mono text-transparent mt-0.5">-</span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
