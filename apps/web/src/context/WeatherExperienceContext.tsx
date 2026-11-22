"use client";

import React, { createContext, useContext, useMemo } from "react";
import {
  WeatherForecastResponse,
  LocationSearchResult,
} from "@/types";
import {
  WeatherSceneState,
  AtmosphericVisualParameters,
} from "@/lib/atmosphere/weatherSceneTypes";
import {
  resolveWeatherScene,
  ResolvedAtmosphericScene,
} from "@/lib/atmosphere/weatherSceneResolver";

interface WeatherExperienceContextType {
  sceneState: WeatherSceneState;
  visuals: AtmosphericVisualParameters;
  selectedLocation: LocationSearchResult | null;
  selectedHourIndex: number;
  setSelectedHourIndex: (index: number) => void;
  isLoading: boolean;
}

const WeatherExperienceContext = createContext<WeatherExperienceContextType | null>(null);

interface WeatherExperienceProviderProps {
  weather: WeatherForecastResponse | null;
  location: LocationSearchResult | null;
  selectedHourIndex: number;
  onSelectHourIndex: (index: number) => void;
  isLoading?: boolean;
  children: React.ReactNode;
}

export const WeatherExperienceProvider: React.FC<WeatherExperienceProviderProps> = ({
  weather,
  location,
  selectedHourIndex,
  onSelectHourIndex,
  isLoading = false,
  children,
}) => {
  const resolvedScene: ResolvedAtmosphericScene = useMemo(() => {
    return resolveWeatherScene(weather, selectedHourIndex, location);
  }, [weather, selectedHourIndex, location]);

  const value = useMemo(
    () => ({
      sceneState: resolvedScene.state,
      visuals: resolvedScene.visuals,
      selectedLocation: location,
      selectedHourIndex,
      setSelectedHourIndex: onSelectHourIndex,
      isLoading,
    }),
    [resolvedScene, location, selectedHourIndex, onSelectHourIndex, isLoading]
  );

  return (
    <WeatherExperienceContext.Provider value={value}>
      {children}
    </WeatherExperienceContext.Provider>
  );
};

export function useWeatherExperience(): WeatherExperienceContextType {
  const ctx = useContext(WeatherExperienceContext);
  if (!ctx) {
    throw new Error("useWeatherExperience must be used within a WeatherExperienceProvider");
  }
  return ctx;
}
