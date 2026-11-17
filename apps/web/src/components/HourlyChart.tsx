"use client";

import React, { useState } from "react";
import { Clock, Droplets, Thermometer } from "lucide-react";
import { HourlyForecastPoint } from "@/types";

interface HourlyChartProps {
  hourly: HourlyForecastPoint[];
}

export const HourlyChart: React.FC<HourlyChartProps> = ({ hourly }) => {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  // Take the upcoming 24 hours of live forecast data
  const data = hourly.slice(0, 24);

  if (!data || data.length === 0) {
    return (
      <div className="p-6 bg-slate-800/80 rounded-2xl border border-slate-700 text-center text-slate-400 text-sm">
        Hourly forecast data unavailable from provider.
      </div>
    );
  }

  const temps = data.map((d) => d.temperature_2m);
  const minTemp = Math.floor(Math.min(...temps));
  const maxTemp = Math.ceil(Math.max(...temps));
  const tempRange = Math.max(1, maxTemp - minTemp);

  // SVG dimensions
  const svgWidth = 800;
  const svgHeight = 220;
  const paddingX = 35;
  const paddingTop = 30;
  const paddingBottom = 40;
  const chartHeight = svgHeight - paddingTop - paddingBottom;
  const chartWidth = svgWidth - paddingX * 2;

  // Calculate points
  const points = data.map((d, idx) => {
    const x = paddingX + (idx / (data.length - 1)) * chartWidth;
    const normalizedY = (d.temperature_2m - minTemp) / tempRange;
    const y = paddingTop + chartHeight - normalizedY * chartHeight;
    return { x, y, data: d, index: idx };
  });

  // Build SVG path
  const pathD = points.reduce((acc, curr, idx) => {
    if (idx === 0) return `M ${curr.x} ${curr.y}`;
    const prev = points[idx - 1];
    // Smooth bezier curve
    const cx = (prev.x + curr.x) / 2;
    return `${acc} C ${cx} ${prev.y}, ${cx} ${curr.y}, ${curr.x} ${curr.y}`;
  }, "");

  // Area under curve
  const areaD = `${pathD} L ${points[points.length - 1].x} ${svgHeight - paddingBottom} L ${points[0].x} ${svgHeight - paddingBottom} Z`;

  const activePoint = hoverIndex !== null ? points[hoverIndex] : null;

  return (
    <div className="rounded-2xl bg-slate-800/80 border border-slate-700 p-6 shadow-xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
        <div>
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Clock className="w-4 h-4 text-blue-400" />
            <span>24-Hour Forecast Trend (Authentic NWP)</span>
          </h3>
          <p className="text-xs text-slate-400">
            Air temperature (°C) and precipitation chance (%) directly from Open-Meteo
          </p>
        </div>

        {activePoint && (
          <div className="flex items-center gap-3 text-xs bg-slate-900/90 px-3 py-1.5 rounded-xl border border-slate-700">
            <span className="text-slate-300 font-medium">
              {new Date(activePoint.data.time).toLocaleTimeString([], { hour: "numeric", hour12: true })}
            </span>
            <span className="text-amber-400 font-bold flex items-center gap-1">
              <Thermometer className="w-3 h-3" />
              {activePoint.data.temperature_2m.toFixed(1)}°C
            </span>
            {activePoint.data.precipitation_probability !== undefined && (
              <span className="text-blue-400 font-bold flex items-center gap-1">
                <Droplets className="w-3 h-3" />
                {activePoint.data.precipitation_probability}%
              </span>
            )}
          </div>
        )}
      </div>

      {/* SVG Chart Container */}
      <div className="w-full overflow-x-auto">
        <div className="min-w-[650px]">
          <svg
            viewBox={`0 0 ${svgWidth} ${svgHeight}`}
            className="w-full h-auto overflow-visible select-none"
            onMouseLeave={() => setHoverIndex(null)}
          >
            <defs>
              {/* Gradient for Temperature Area */}
              <linearGradient id="tempGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.4" />
                <stop offset="100%" stopColor="#3B82F6" stopOpacity="0.0" />
              </linearGradient>
            </defs>

            {/* Horizontal Grid lines */}
            {[0, 0.5, 1].map((ratio, i) => {
              const y = paddingTop + chartHeight * ratio;
              const val = maxTemp - ratio * tempRange;
              return (
                <g key={i}>
                  <line
                    x1={paddingX}
                    y1={y}
                    x2={svgWidth - paddingX}
                    y2={y}
                    stroke="#334155"
                    strokeDasharray="4 4"
                    strokeWidth="1"
                  />
                  <text
                    x={paddingX - 8}
                    y={y + 4}
                    fill="#64748B"
                    fontSize="10"
                    textAnchor="end"
                    fontFamily="monospace"
                  >
                    {Math.round(val)}°
                  </text>
                </g>
              );
            })}

            {/* Area Fill */}
            <path d={areaD} fill="url(#tempGradient)" />

            {/* Temperature Curve Line */}
            <path
              d={pathD}
              fill="none"
              stroke="#3B82F6"
              strokeWidth="2.5"
              strokeLinecap="round"
            />

            {/* Precipitation probability vertical bars along the bottom */}
            {points.map((p, idx) => {
              const prob = p.data.precipitation_probability ?? 0;
              const barHeight = (prob / 100) * 35;
              const barY = svgHeight - paddingBottom - barHeight;
              return (
                <g key={`bar-${idx}`}>
                  {prob > 5 && (
                    <rect
                      x={p.x - 3}
                      y={barY}
                      width={6}
                      height={barHeight}
                      fill="#60A5FA"
                      opacity={0.35}
                      rx={2}
                    />
                  )}
                </g>
              );
            })}

            {/* Interactive Data Points & Hover Targets */}
            {points.map((p, idx) => (
              <g
                key={`point-${idx}`}
                className="cursor-pointer"
                onMouseEnter={() => setHoverIndex(idx)}
              >
                {/* Invisible wide hit area */}
                <rect
                  x={p.x - 12}
                  y={0}
                  width={24}
                  height={svgHeight}
                  fill="transparent"
                />

                {/* Point dot (highlighted on hover or every 3 hours) */}
                {(hoverIndex === idx || idx % 4 === 0) && (
                  <circle
                    cx={p.x}
                    cy={p.y}
                    r={hoverIndex === idx ? 5 : 3.5}
                    fill={hoverIndex === idx ? "#60A5FA" : "#3B82F6"}
                    stroke="#0F172A"
                    strokeWidth="2"
                  />
                )}

                {/* X-axis time label (every 3 hours) */}
                {idx % 3 === 0 && (
                  <text
                    x={p.x}
                    y={svgHeight - 15}
                    fill="#94A3B8"
                    fontSize="10"
                    textAnchor="middle"
                    className="font-mono"
                  >
                    {new Date(p.data.time).toLocaleTimeString([], {
                      hour: "numeric",
                      hour12: true,
                    })}
                  </text>
                )}
              </g>
            ))}

            {/* Active Hover Guide line */}
            {activePoint && (
              <line
                x1={activePoint.x}
                y1={paddingTop}
                x2={activePoint.x}
                y2={svgHeight - paddingBottom}
                stroke="#60A5FA"
                strokeWidth="1.5"
                strokeDasharray="3 3"
              />
            )}
          </svg>
        </div>
      </div>
    </div>
  );
};
