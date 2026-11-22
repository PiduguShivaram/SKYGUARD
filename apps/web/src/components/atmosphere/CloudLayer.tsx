"use client";

import React, { useMemo } from "react";
import { AtmosphericVisualParameters } from "@/lib/atmosphere/weatherSceneTypes";
import { useReducedMotion } from "@/hooks/useReducedMotion";

interface CloudLayerProps {
  visuals: AtmosphericVisualParameters;
}

export const CloudLayer: React.FC<CloudLayerProps> = ({ visuals }) => {
  const prefersReduced = useReducedMotion();
  const { cloudVisuals, proceduralSeed } = visuals;

  // Compute procedural shape modifiers from stable seed
  const cloudVariants = useMemo(() => {
    const s1 = proceduralSeed;
    const s2 = (proceduralSeed * 1.618) % 1;
    const s3 = (proceduralSeed * 2.718) % 1;

    return [
      {
        path: `M 65 145 C ${35 + s1 * 20} 145 ${15 + s2 * 15} 125 20 95 C 20 68 ${45 + s3 * 10} 50 75 52 C ${85 + s1 * 15} 28 ${115 + s2 * 20} 14 148 15 C ${182 + s3 * 15} 15 210 32 222 62 C 235 60 250 60 262 68 C ${290 + s1 * 15} 74 312 96 312 125 C 312 152 285 172 250 172 L 75 172 Z`,
        highlight: `M 85 60 C ${100 + s1 * 10} 38 128 24 160 24 C 196 24 222 42 232 70 C 245 66 265 72 275 85 C 255 68 222 60 190 62 C 152 65 115 78 85 105 Z`,
      },
      {
        path: `M 50 135 C 25 135 10 115 15 88 C 15 62 38 45 65 48 C 76 25 102 12 132 14 C 164 14 190 30 200 58 C 212 55 225 55 235 62 C 260 66 280 86 280 112 C 280 138 255 155 225 155 L 60 155 Z`,
        highlight: `M 75 55 C 90 35 115 22 145 22 C 178 22 202 38 210 65 C 220 60 240 68 250 80 C 230 64 200 58 170 60 C 135 62 105 74 75 98 Z`,
      },
    ];
  }, [proceduralSeed]);

  if (cloudVisuals.coveragePercent < 5) {
    return null; // Crystal clear sky, zero cloud clutter
  }

  const primaryVariant = cloudVariants[0];
  const secondaryVariant = cloudVariants[1];

  return (
    <div className="relative w-full flex items-center justify-center select-none pointer-events-none min-h-[190px] sm:min-h-[230px]">
      {/* Layer 2: Secondary Background Cloud (when overcast or rainy) */}
      {cloudVisuals.layers >= 2 && (
        <div
          className="absolute -top-6 -left-8 sm:-left-16 scale-90 opacity-60 filter blur-[1px] transition-transform duration-1000 ease-out"
          style={{
            animation: prefersReduced ? "none" : `driftCloud ${24 / cloudVisuals.driftSpeed}s ease-in-out infinite alternate`,
          }}
        >
          <svg
            className="w-56 sm:w-72 h-auto"
            viewBox="0 0 320 180"
            fill="none"
          >
            <path
              d={secondaryVariant.path}
              fill={cloudVisuals.shadowColor}
              opacity="0.85"
            />
          </svg>
        </div>
      )}

      {/* Layer 1: Primary Organic Volumetric Cloud Centerpiece */}
      <div
        className="relative transition-transform duration-700 ease-out z-10"
        style={{
          animation: prefersReduced ? "none" : `floatCloud ${8 / cloudVisuals.driftSpeed}s ease-in-out infinite alternate`,
        }}
      >
        <svg
          className="w-64 sm:w-84 lg:w-96 h-auto overflow-visible drop-shadow-2xl"
          viewBox="0 0 340 190"
          fill="none"
        >
          <defs>
            <filter id="cloudDepthShadow" x="-30%" y="-30%" width="160%" height="160%">
              <feDropShadow dx="0" dy="16" stdDeviation="18" floodColor={cloudVisuals.shadowColor} />
            </filter>
            <linearGradient id="cloudBodyGrad" x1="170" y1="20" x2="170" y2="170" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.98" />
              <stop offset="65%" stopColor={cloudVisuals.bodyColor} stopOpacity={cloudVisuals.opacity} />
              <stop offset="100%" stopColor={cloudVisuals.shadowColor} stopOpacity="0.85" />
            </linearGradient>
            <radialGradient id="cloudSpecular" cx="35%" cy="30%" r="55%">
              <stop offset="0%" stopColor={cloudVisuals.highlightColor} stopOpacity="0.95" />
              <stop offset="100%" stopColor={cloudVisuals.highlightColor} stopOpacity="0" />
            </radialGradient>
          </defs>

          {/* Main Silhouette with Drop Shadow */}
          <g filter="url(#cloudDepthShadow)">
            <path
              d={primaryVariant.path}
              fill="url(#cloudBodyGrad)"
            />
            {/* Top Volumetric Rim Highlight */}
            <path
              d={primaryVariant.highlight}
              fill="url(#cloudSpecular)"
            />
          </g>
        </svg>
      </div>

      <style jsx>{`
        @keyframes floatCloud {
          0% {
            transform: translateY(0px) scale(1);
          }
          100% {
            transform: translateY(-8px) scale(1.015);
          }
        }
        @keyframes driftCloud {
          0% {
            transform: translateX(-12px);
          }
          100% {
            transform: translateX(14px);
          }
        }
      `}</style>
    </div>
  );
};
