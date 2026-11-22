"use client";

import React from "react";
import { AtmosphericVisualParameters } from "@/lib/atmosphere/weatherSceneTypes";
import { SkyRenderer } from "./SkyRenderer";
import { RainRenderer } from "./RainRenderer";
import { LightningRenderer } from "./LightningRenderer";

interface DynamicAtmosphereProps {
  visuals: AtmosphericVisualParameters;
  children?: React.ReactNode;
  className?: string;
  isBackground?: boolean;
  theme?: "light" | "dark";
}

export const DynamicAtmosphere: React.FC<DynamicAtmosphereProps> = ({
  visuals,
  children,
  className = "",
  isBackground = false,
  theme = "light",
}) => {
  return (
    <div
      className={`relative w-full overflow-hidden select-none ${className}`}
      style={{
        minHeight: isBackground ? "100vh" : undefined,
        height: isBackground ? "100%" : undefined,
      }}
    >
      {/* 1. Base Sky Atmospheric Gradient & Horizon Glow (Physical Daylight Transitions) */}
      <SkyRenderer visuals={visuals} theme={theme} />

      {/* 2. Canvas Rain Streaks & Moisture Droplets (Zero decorative stars, Zero celestial illustrations) */}
      <RainRenderer visuals={visuals} />

      {/* 3. Convective Atmospheric Illumination Flash (When Thunderstorm is Active) */}
      <LightningRenderer visuals={visuals} />

      {/* 4. Foreground Content / Children Overlay */}
      <div className="relative z-10 w-full h-full">
        {children}
      </div>
    </div>
  );
};
