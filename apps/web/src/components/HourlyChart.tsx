"use client";

import React, { useState } from "react";
import { Clock, Droplets, Thermometer } from "lucide-react";
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
      <div className="p-6 surface-panel text-center text-zinc-400 text-xs">
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
  const svgHeight = 200;
  const paddingX = 30;
  const paddingTop = 25;
  const paddingBottom = 35;
  const chartHeight = svgHeight - paddingTop - paddingBottom;
  const chartWidth = svgWidth - paddingX * 2;

  // Calculate coordinates with linear interpolation to prevent extreme overshoot
  const points = data.map((d, idx) => {
    const x = paddingX + (idx / (data.length - 1)) * chartWidth;
    const normalizedY = (d.temperature_2m - minTemp) / tempRange;
    const y = paddingTop + chartHeight - normalizedY * chartHeight;
    return { x, y, data: d, index: idx };
  });

  // Construct smooth spline path
  const pathD = points.reduce((acc, curr, idx) => {
    if (idx === 0) return `M ${curr.x} ${curr.y}`;
    const prev = points[idx - 1];
    const cx = (prev.x + curr.x) / 2;
    return `${acc} C ${cx} ${prev.y}, ${cx} ${curr.y}, ${curr.x} ${curr.y}`;
  }, "");

  // Area fill under curve
  const areaD = `${pathD} L ${points[points.length - 1].x} ${svgHeight - paddingBottom} L ${points[0].x} ${svgHeight - paddingBottom} Z`;

  const activePoint = hoverIndex !== null ? points[hoverIndex] : null;

  return (
    <div className="surface-panel p-6 sm:p-7 shadow-sm">
      {/* Header and Live Hover Readout */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div>
          <h3 className="text-sm font-semibold text-white flex items-center gap-2">
            <Clock className="w-4 h-4 text-blue-400" />
            <span>24-Hour Temperature &amp; Rain Outlook</span>
          </h3>
          <p className="text-xs text-zinc-400">
            Air temperature ({tempUnit}) and precipitation chance (%) directly from Open-Meteo
          </p>
        </div>

        {activePoint && (
          <div className="flex items-center gap-3 text-xs bg-[#11141a] px-3 py-1.5 rounded-sg border border-[#212630] font-mono self-start sm:self-auto">
            <span className="text-zinc-300 font-medium">
              {new Date(activePoint.data.time).toLocaleTimeString([], { hour: "numeric", hour12: true })}
            </span>
            <span className="text-blue-400 font-semibold flex items-center gap-1">
              <Thermometer className="w-3.5 h-3.5" />
              {activePoint.data.temperature_2m.toFixed(1)} {tempUnit}
            </span>
            {activePoint.data.precipitation_probability !== undefined && activePoint.data.precipitation_probability !== null && (
              <span className="text-sky-300 font-semibold flex items-center gap-1">
                <Droplets className="w-3.5 h-3.5" />
                {activePoint.data.precipitation_probability}%
              </span>
            )}
          </div>
        )}
      </div>

      {/* SVG Chart Container */}
      <div className="w-full overflow-x-auto pb-1">
        <div className="min-w-[640px]">
          <svg
            viewBox={`0 0 ${svgWidth} ${svgHeight}`}
            className="w-full h-auto overflow-visible select-none"
            onMouseLeave={() => setHoverIndex(null)}
          >
            <defs>
              <linearGradient id="hourlyAreaGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.2" />
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
                    stroke="#212630"
                    strokeDasharray="4 4"
                    strokeWidth="1"
                  />
                  <text
                    x={paddingX - 8}
                    y={y + 3.5}
                    textAnchor="end"
                    fill="#6e7681"
                    fontSize="10"
                    fontFamily="sans-serif"
                  >
                    {val.toFixed(0)}°
                  </text>
                </g>
              );
            })}

            {/* Area Fill */}
            <path d={areaD} fill="url(#hourlyAreaGrad)" />

            {/* Temperature Curve */}
            <path
              d={pathD}
              fill="none"
              stroke="#3B82F6"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* Hover Vertical Guide */}
            {activePoint && (
              <line
                x1={activePoint.x}
                y1={paddingTop}
                x2={activePoint.x}
                y2={svgHeight - paddingBottom}
                stroke="#60A5FA"
                strokeWidth="1"
                strokeDasharray="2 2"
              />
            )}

            {/* Data Nodes & Hour Labels */}
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
                    r={isHovered ? 4.5 : 2}
                    fill={isHovered ? "#60A5FA" : "#3B82F6"}
                    stroke="#161B22"
                    strokeWidth={isHovered ? 2 : 1}
                  />

                  {showLabel && (
                    <text
                      x={pt.x}
                      y={svgHeight - paddingBottom + 16}
                      textAnchor="middle"
                      fill="#8b949e"
                      fontSize="10"
                      fontFamily="sans-serif"
                    >
                      {hourLabel}
                    </text>
                  )}

                  {/* Invisible scrub hit target */}
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
