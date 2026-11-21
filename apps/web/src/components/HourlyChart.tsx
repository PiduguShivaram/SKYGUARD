"use client";

import React, { useState } from "react";
import { Clock, Droplets, Thermometer, TrendingUp } from "lucide-react";
import { HourlyForecastPoint } from "@/types";

interface HourlyChartProps {
  hourly: HourlyForecastPoint[];
  units: Record<string, string>;
}

export const HourlyChart: React.FC<HourlyChartProps> = ({ hourly, units }) => {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const tempUnit = units.temperature || "°C";
  const data = hourly.slice(0, 24);

  if (!data || data.length === 0) {
    return (
      <div className="p-6 bg-[#0c1322]/80 rounded-2xl border border-white/[0.08] text-center text-slate-400 text-xs">
        Hourly numerical forecast data unavailable.
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

  // Build SVG spline path
  const pathD = points.reduce((acc, curr, idx) => {
    if (idx === 0) return `M ${curr.x} ${curr.y}`;
    const prev = points[idx - 1];
    const cx = (prev.x + curr.x) / 2;
    return `${acc} C ${cx} ${prev.y}, ${cx} ${curr.y}, ${curr.x} ${curr.y}`;
  }, "");

  // Area under curve
  const areaD = `${pathD} L ${points[points.length - 1].x} ${svgHeight - paddingBottom} L ${points[0].x} ${svgHeight - paddingBottom} Z`;

  const activePoint = hoverIndex !== null ? points[hoverIndex] : null;

  return (
    <div className="rounded-3xl bg-gradient-to-br from-[#0c1322] via-[#0a101d] to-[#070b14] border border-white/[0.08] p-6 sm:p-7 shadow-2xl backdrop-blur-xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        <div>
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Clock className="w-4 h-4 text-sky-400" />
            <span>24-Hour Temperature &amp; Rain Outlook</span>
          </h3>
          <p className="text-xs text-slate-400">
            Air temperature ({tempUnit}) and precipitation chance (%) directly from Open-Meteo
          </p>
        </div>

        {activePoint && (
          <div className="flex items-center gap-3 text-xs bg-[#060a14]/90 px-3.5 py-1.5 rounded-xl border border-white/[0.1] shadow-inner font-mono">
            <span className="text-slate-300 font-medium">
              {new Date(activePoint.data.time).toLocaleTimeString([], { hour: "numeric", hour12: true })}
            </span>
            <span className="text-amber-400 font-bold flex items-center gap-1">
              <Thermometer className="w-3.5 h-3.5" />
              {activePoint.data.temperature_2m.toFixed(1)} {tempUnit}
            </span>
            {activePoint.data.precipitation_probability !== undefined && activePoint.data.precipitation_probability !== null && (
              <span className="text-sky-400 font-bold flex items-center gap-1">
                <Droplets className="w-3.5 h-3.5" />
                {activePoint.data.precipitation_probability}%
              </span>
            )}
          </div>
        )}
      </div>

      {/* SVG Chart Container */}
      <div className="w-full overflow-x-auto pb-1">
        <div className="min-w-[650px]">
          <svg
            viewBox={`0 0 ${svgWidth} ${svgHeight}`}
            className="w-full h-auto overflow-visible select-none"
            onMouseLeave={() => setHoverIndex(null)}
          >
            <defs>
              <linearGradient id="hourlyTempGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#38BDF8" stopOpacity="0.35" />
                <stop offset="60%" stopColor="#0EA5E9" stopOpacity="0.1" />
                <stop offset="100%" stopColor="#0EA5E9" stopOpacity="0.0" />
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
                    stroke="#1e2c47"
                    strokeDasharray="4 4"
                    strokeWidth="1"
                  />
                  <text
                    x={paddingX - 8}
                    y={y + 4}
                    textAnchor="end"
                    fill="#64748b"
                    fontSize="10"
                    fontFamily="monospace"
                  >
                    {val.toFixed(0)}°
                  </text>
                </g>
              );
            })}

            {/* Area Fill under Curve */}
            <path d={areaD} fill="url(#hourlyTempGrad)" />

            {/* Main Spline Curve */}
            <path
              d={pathD}
              fill="none"
              stroke="#38BDF8"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* Interactive Data Points and Labels */}
            {points.map((pt, idx) => {
              const date = new Date(pt.data.time);
              const hourLabel = date.toLocaleTimeString([], { hour: "numeric", hour12: true });
              const isSelected = hoverIndex === idx;

              return (
                <g
                  key={idx}
                  className="cursor-pointer transition-all duration-150"
                  onMouseEnter={() => setHoverIndex(idx)}
                >
                  {/* Invisible broad hit target for hover */}
                  <rect
                    x={pt.x - 14}
                    y={paddingTop}
                    width={28}
                    height={chartHeight + paddingBottom}
                    fill="transparent"
                  />

                  {/* Vertical hover guide bar */}
                  {isSelected && (
                    <line
                      x1={pt.x}
                      y1={paddingTop}
                      x2={pt.x}
                      y2={svgHeight - paddingBottom}
                      stroke="#38BDF8"
                      strokeWidth="1.5"
                      strokeDasharray="2 2"
                      opacity="0.8"
                    />
                  )}

                  {/* Point Circle */}
                  <circle
                    cx={pt.x}
                    cy={pt.y}
                    r={isSelected ? 5.5 : 3}
                    fill={isSelected ? "#38BDF8" : "#0c1322"}
                    stroke="#38BDF8"
                    strokeWidth={isSelected ? "2.5" : "2"}
                    className="transition-all duration-150"
                  />

                  {/* Temperature label above point on select or key intervals */}
                  {(isSelected || idx % 4 === 0) && (
                    <text
                      x={pt.x}
                      y={pt.y - 10}
                      textAnchor="middle"
                      fill={isSelected ? "#FFFFFF" : "#94A3B8"}
                      fontSize={isSelected ? "11" : "10"}
                      fontWeight={isSelected ? "bold" : "normal"}
                      fontFamily="monospace"
                    >
                      {pt.data.temperature_2m.toFixed(0)}°
                    </text>
                  )}

                  {/* Precipitation Probability bar at the bottom */}
                  {pt.data.precipitation_probability !== undefined &&
                    pt.data.precipitation_probability !== null &&
                    pt.data.precipitation_probability > 0 && (
                      <rect
                        x={pt.x - 4}
                        y={svgHeight - paddingBottom - Math.min(20, (pt.data.precipitation_probability / 100) * 20)}
                        width={8}
                        height={Math.min(20, (pt.data.precipitation_probability / 100) * 20)}
                        rx="2"
                        fill="#38BDF8"
                        opacity={isSelected ? "0.9" : "0.5"}
                      />
                    )}

                  {/* Time label below chart */}
                  {(idx % 3 === 0 || isSelected) && (
                    <text
                      x={pt.x}
                      y={svgHeight - 12}
                      textAnchor="middle"
                      fill={isSelected ? "#38BDF8" : "#64748B"}
                      fontSize="10"
                      fontWeight={isSelected ? "bold" : "normal"}
                      fontFamily="sans-serif"
                    >
                      {hourLabel}
                    </text>
                  )}
                </g>
              );
            })}
          </svg>
        </div>
      </div>
    </div>
  );
};
