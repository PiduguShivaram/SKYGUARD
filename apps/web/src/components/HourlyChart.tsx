"use client";

import React, { useState } from "react";
import { Clock, Droplets, Thermometer, TrendingUp, Activity } from "lucide-react";
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
      <div className="p-6 bg-[#11141b] rounded-2xl border border-[#202532] text-center text-zinc-400 text-xs font-mono">
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
    <div className="rounded-2xl bg-[#11141b] border border-[#202532] p-6 sm:p-7 shadow-2xl relative">
      {/* Geodetic Corner Ticks */}
      <div className="absolute top-2 left-2 text-[#2b3243] font-mono text-[9px] select-none pointer-events-none">+</div>
      <div className="absolute top-2 right-2 text-[#2b3243] font-mono text-[9px] select-none pointer-events-none">+</div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        <div>
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Clock className="w-4 h-4 text-amber-400" />
            <span>24-Hour Temperature &amp; Rain Outlook</span>
          </h3>
          <p className="text-xs text-zinc-400 font-mono">
            Air temperature ({tempUnit}) and precipitation chance (%) directly from Open-Meteo
          </p>
        </div>

        {activePoint && (
          <div className="flex items-center gap-3 text-xs bg-[#0c0e13] px-3.5 py-1.5 rounded-lg border border-[#252b3a] shadow-inner font-mono">
            <span className="text-zinc-300 font-medium">
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
                <stop offset="0%" stopColor="#F59E0B" stopOpacity="0.25" />
                <stop offset="70%" stopColor="#D97706" stopOpacity="0.05" />
                <stop offset="100%" stopColor="#B45309" stopOpacity="0.0" />
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
                    stroke="#1c212d"
                    strokeDasharray="4 4"
                    strokeWidth="1"
                  />
                  <text
                    x={paddingX - 8}
                    y={y + 4}
                    textAnchor="end"
                    fill="#525d73"
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
              stroke="#F59E0B"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* Vertical Cursor on Hover */}
            {activePoint && (
              <line
                x1={activePoint.x}
                y1={paddingTop}
                x2={activePoint.x}
                y2={svgHeight - paddingBottom}
                stroke="#FBBF24"
                strokeWidth="1.5"
                strokeDasharray="2 2"
              />
            )}

            {/* Interactive Data Nodes */}
            {points.map((pt, idx) => {
              const isHovered = hoverIndex === idx;
              const hourLabel = new Date(pt.data.time).toLocaleTimeString([], { hour: "numeric" });
              const showLabel = idx % 3 === 0 || idx === points.length - 1;

              return (
                <g
                  key={idx}
                  className="cursor-pointer"
                  onMouseEnter={() => setHoverIndex(idx)}
                >
                  <circle
                    cx={pt.x}
                    cy={pt.y}
                    r={isHovered ? 5.5 : 2.5}
                    fill={isHovered ? "#FBBF24" : "#D97706"}
                    stroke="#0B0D10"
                    strokeWidth={isHovered ? 2.5 : 1}
                    className="transition-all duration-150"
                  />
                  {showLabel && (
                    <text
                      x={pt.x}
                      y={svgHeight - paddingBottom + 18}
                      textAnchor="middle"
                      fill="#64748b"
                      fontSize="9"
                      fontFamily="monospace"
                    >
                      {hourLabel}
                    </text>
                  )}
                  {/* Invisible hit target for smooth hovering */}
                  <rect
                    x={pt.x - chartWidth / (data.length * 2)}
                    y={paddingTop}
                    width={chartWidth / data.length}
                    height={chartHeight + paddingBottom}
                    fill="transparent"
                  />
                </g>
              );
            })}
          </svg>
        </div>
      </div>
    </div>
  );
};
