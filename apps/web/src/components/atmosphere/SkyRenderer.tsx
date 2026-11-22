"use client";

import React from "react";
import { AtmosphericVisualParameters } from "@/lib/atmosphere/weatherSceneTypes";

interface SkyRendererProps {
  visuals: AtmosphericVisualParameters;
  theme?: "light" | "dark";
}

export const SkyRenderer: React.FC<SkyRendererProps> = ({ visuals, theme = "light" }) => {
  const { skyGradient, luma } = visuals;

  const activeGradient =
    theme === "light"
      ? "linear-gradient(180deg, #185A9D 0%, #2B76C9 35%, #4696E8 70%, #76B7F9 100%)"
      : `linear-gradient(180deg, ${skyGradient.from} 0%, ${skyGradient.via} 50%, ${skyGradient.to} 100%)`;

  const activeAura =
    theme === "light"
      ? "radial-gradient(ellipse at 50% 90%, rgba(255, 245, 210, 0.45) 0%, transparent 70%)"
      : `radial-gradient(ellipse at 50% 90%, ${skyGradient.horizonAura} 0%, transparent 70%)`;

  return (
    <div
      className="absolute inset-0 pointer-events-none transition-colors duration-1000 ease-out"
      style={{
        background: activeGradient,
        zIndex: 1,
      }}
    >
      {/* Horizon Atmospheric Glow Aura */}
      <div
        className="absolute inset-0 pointer-events-none transition-opacity duration-1000"
        style={{
          background: activeAura,
          opacity: theme === "light" ? 0.95 : luma > 0.3 ? 0.9 : 0.4,
        }}
      />

      {/* Subtle Micro-Noise Textural Scatter for Physical Tangibility */}
      <div
        className="absolute inset-0 pointer-events-none opacity-20 mix-blend-overlay"
        style={{
          background: "radial-gradient(circle at 50% 40%, rgba(255,255,255,0.18) 0%, rgba(0,0,0,0.2) 100%)",
        }}
      />
    </div>
  );
};
