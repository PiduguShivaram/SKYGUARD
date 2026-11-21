"use client";

import { useMemo } from "react";
import { CurrentWeather } from "@/types";

export type SkyPalette = {
  zenith: string;
  horizon: string;
  cloudBase: string;
  cloudLight: string;
  description: string;
  isNight: boolean;
};

/**
 * Derives physical atmospheric lighting and palette parameters from genuine Open-Meteo weather codes.
 */
export function useAtmosphereState(weather: CurrentWeather | null): SkyPalette {
  return useMemo(() => {
    if (!weather) {
      // Default quiet atmospheric dusk
      return {
        zenith: "#0B111E",
        horizon: "#1E293B",
        cloudBase: "#334155",
        cloudLight: "#64748B",
        description: "Atmosphere Unselected",
        isNight: true,
      };
    }

    const isDay = weather.is_day === 1;
    const code = weather.weather_code;

    // Severe thunderstorm / squall
    if (code >= 95) {
      return {
        zenith: "#090D16",
        horizon: "#1F2430",
        cloudBase: "#2A303C",
        cloudLight: "#E2E8F0",
        description: "Severe Thunderstorm Electric Charge",
        isNight: !isDay,
      };
    }

    // Heavy rain / shower
    if (code >= 61 && code <= 82) {
      return {
        zenith: isDay ? "#334155" : "#0A0E17",
        horizon: isDay ? "#64748B" : "#1E293B",
        cloudBase: "#1E293B",
        cloudLight: "#94A3B8",
        description: "Active Precipitation Canopy",
        isNight: !isDay,
      };
    }

    // Snow
    if (code >= 71 && code <= 86) {
      return {
        zenith: isDay ? "#64748B" : "#0F172A",
        horizon: isDay ? "#94A3B8" : "#334155",
        cloudBase: "#CBD5E1",
        cloudLight: "#F8FAFC",
        description: "Crystalline Snow Drift",
        isNight: !isDay,
      };
    }

    // Fog / Mist
    if (code >= 45 && code <= 48) {
      return {
        zenith: isDay ? "#475569" : "#0D1117",
        horizon: isDay ? "#94A3B8" : "#1E293B",
        cloudBase: "#64748B",
        cloudLight: "#CBD5E1",
        description: "Dense Tropospheric Mist",
        isNight: !isDay,
      };
    }

    // Overcast / Cloudy
    if (code >= 2 && code <= 3) {
      return {
        zenith: isDay ? "#2563EB" : "#060A12",
        horizon: isDay ? "#60A5FA" : "#1E293B",
        cloudBase: "#475569",
        cloudLight: "#E2E8F0",
        description: "Stratocumulus Cloud Layers",
        isNight: !isDay,
      };
    }

    // Clear / Mostly Clear
    if (isDay) {
      return {
        zenith: "#1D4ED8",
        horizon: "#60A5FA",
        cloudBase: "#93C5FD",
        cloudLight: "#FFFFFF",
        description: "Clear Azure Daylight",
        isNight: false,
      };
    } else {
      return {
        zenith: "#05070D",
        horizon: "#0F172A",
        cloudBase: "#1E293B",
        cloudLight: "#38BDF8",
        description: "Quiet Nocturnal Vault",
        isNight: true,
      };
    }
  }, [weather]);
}
