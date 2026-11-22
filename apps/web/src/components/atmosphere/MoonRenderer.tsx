"use client";

import React from "react";
import { AtmosphericVisualParameters } from "@/lib/atmosphere/weatherSceneTypes";

interface MoonRendererProps {
  visuals: AtmosphericVisualParameters;
}

export const MoonRenderer: React.FC<MoonRendererProps> = ({ visuals }) => {
  const { celestialVisuals } = visuals;
  if (!celestialVisuals.showMoon) return null;

  const posX = `${celestialVisuals.moonPosition.x * 100}%`;
  const posY = `${celestialVisuals.moonPosition.y * 100}%`;

  return (
    <div
      className="absolute pointer-events-none transition-all duration-700 ease-out"
      style={{
        left: posX,
        top: posY,
        transform: "translate(-50%, -50%)",
        zIndex: 5,
      }}
    >
      {/* 1. Soft Lunar Atmospheric Halo */}
      <div
        className="w-36 h-36 rounded-full blur-2xl opacity-60"
        style={{
          background: "radial-gradient(circle, rgba(226, 232, 240, 0.45) 0%, rgba(148, 163, 184, 0.15) 50%, transparent 75%)",
          transform: "translate(-25%, -25%)",
        }}
      />

      {/* 2. Lunar Disc SVG with Earthshine & Crater Texturing */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-14 h-14">
        <svg
          viewBox="0 0 50 50"
          className="w-full h-full drop-shadow-[0_0_18px_rgba(255,255,255,0.7)]"
          fill="none"
        >
          <defs>
            <radialGradient id="moonBody" cx="40%" cy="35%" r="60%">
              <stop offset="0%" stopColor="#FFFFFF" />
              <stop offset="70%" stopColor="#E2E8F0" />
              <stop offset="100%" stopColor="#94A3B8" />
            </radialGradient>
            <mask id="moonPhaseMask">
              <rect x="0" y="0" width="50" height="50" fill="white" />
              {/* Crescent shadow mask */}
              <circle cx="34" cy="20" r="19" fill="black" />
            </mask>
          </defs>

          {/* Earthshine faint silhouette */}
          <circle cx="25" cy="25" r="20" fill="rgba(255, 255, 255, 0.12)" />

          {/* Illuminated Lunar Surface */}
          <circle
            cx="25"
            cy="25"
            r="20"
            fill="url(#moonBody)"
            mask="url(#moonPhaseMask)"
          />
        </svg>
      </div>
    </div>
  );
};
