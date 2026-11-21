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
    <div className="w-full bg-slate-900/60 border border-slate-800/80 rounded-2xl p-4 backdrop-blur-md shadow-xl">
      <div className="flex items-center justify-between mb-3 px-1">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-sky-400 animate-pulse" />
          <h2 className="text-xs font-mono uppercase tracking-widest text-slate-300">
            24-Hour Atmospheric Timeline
          </h2>
        </div>
        <span className="text-[11px] font-mono text-slate-400">
          Scrub to explore diurnal progression
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
        className="relative flex items-center justify-between gap-1 py-4 px-2 select-none cursor-pointer overflow-x-auto focus:outline-none focus:ring-1 focus:ring-sky-500/50 rounded-xl bg-slate-950/40"
      >
        {hours.map((point, idx) => {
          const date = new Date(point.time);
          const hourLabel = date.toLocaleTimeString([], { hour: "numeric", hour12: true });
          const temp = Math.round(point.temperature_2m ?? 0);
          const rain = point.precipitation_probability ?? 0;
          const code = point.weather_code ?? 0;
          const isSelected = idx === selectedIndex;
          const isDay = date.getHours() >= 6 && date.getHours() <= 18;

          return (
            <div
              key={point.time}
              onClick={() => onSelectIndex(idx)}
              className={`flex-1 min-w-[56px] flex flex-col items-center py-2 px-1 rounded-xl transition-all ${
                isSelected
                  ? "bg-slate-800/90 ring-1 ring-sky-400/80 scale-105 shadow-lg"
                  : "hover:bg-slate-800/40 opacity-70 hover:opacity-100"
              }`}
            >
              <span className="text-[10px] font-mono text-slate-400 mb-1">{hourLabel}</span>
              <div className="my-1">
                <LivingWeatherIcon code={code} isDay={isDay} size={24} />
              </div>
              <span className="text-xs font-semibold tabular-nums text-slate-100">{temp}°</span>
              {rain > 0 ? (
                <span className="text-[9px] font-mono text-sky-400 mt-0.5">{rain}%</span>
              ) : (
                <span className="text-[9px] font-mono text-transparent mt-0.5">-</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
