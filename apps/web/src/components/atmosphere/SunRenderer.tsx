"use client";

import React from "react";
import { AtmosphericVisualParameters } from "@/lib/atmosphere/weatherSceneTypes";

interface SunRendererProps {
  visuals: AtmosphericVisualParameters;
}

export const SunRenderer: React.FC<SunRendererProps> = ({ visuals }) => {
  const { celestialVisuals, luma } = visuals;
  if (!celestialVisuals.showSun) return null;

  const posX = `${celestialVisuals.sunPosition.x * 100}%`;
  const posY = `${celestialVisuals.sunPosition.y * 100}%`;

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
      {/* 1. Large Atmospheric Solar Radiance Aura */}
      <div
        className="rounded-full blur-3xl opacity-70 animate-pulse"
        style={{
          width: `${celestialVisuals.sunGlowRadius * 3.5}px`,
          height: `${celestialVisuals.sunGlowRadius * 3.5}px`,
          background: `radial-gradient(circle, ${celestialVisuals.sunColor} 0%, rgba(253, 224, 71, 0.25) 45%, transparent 75%)`,
          transform: "translate(-30%, -30%)",
        }}
      />

      {/* 2. Core Solar Disc with Limb Darkening */}
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full shadow-2xl"
        style={{
          width: `${celestialVisuals.sunGlowRadius * 0.9}px`,
          height: `${celestialVisuals.sunGlowRadius * 0.9}px`,
          background: `radial-gradient(circle at 38% 38%, #FFFFFF 0%, ${celestialVisuals.sunColor} 65%, #F59E0B 100%)`,
          boxShadow: `0 0 45px ${celestialVisuals.sunColor}, 0 0 90px rgba(245, 158, 11, 0.45)`,
        }}
      />

      {/* 3. Subtle Solar Beams */}
      <svg
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none opacity-40 animate-spin-slow"
        width={celestialVisuals.sunGlowRadius * 2.8}
        height={celestialVisuals.sunGlowRadius * 2.8}
        viewBox="0 0 100 100"
      >
        {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => (
          <line
            key={deg}
            x1="50"
            y1="22"
            x2="50"
            y2="10"
            stroke={celestialVisuals.sunColor}
            strokeWidth="2"
            strokeLinecap="round"
            transform={`rotate(${deg} 50 50)`}
          />
        ))}
      </svg>
    </div>
  );
};
