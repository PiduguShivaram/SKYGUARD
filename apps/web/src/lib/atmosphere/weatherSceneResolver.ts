/**
 * SkyGuard Atmospheric Engine - Master Scene Resolver
 * Unites Data Normalization, Astronomical Solar Coordinates, and Visual Parameter Mapping.
 * Returns both the verified meteorological state and the complete visual directives.
 */

import {
  WeatherForecastResponse,
  LocationSearchResult,
} from "@/types";
import {
  WeatherSceneState,
  AtmosphericVisualParameters,
} from "./weatherSceneTypes";
import { normalizeWeatherScene } from "./normalizeWeather";
import { mapWeatherToVisuals } from "./weatherVisualMapping";

export interface ResolvedAtmosphericScene {
  state: WeatherSceneState;
  visuals: AtmosphericVisualParameters;
}

export function resolveWeatherScene(
  forecast: WeatherForecastResponse | null,
  selectedHourIndex?: number,
  location?: LocationSearchResult | null
): ResolvedAtmosphericScene {
  const state = normalizeWeatherScene(forecast, selectedHourIndex, location);
  const visuals = mapWeatherToVisuals(state);
  return { state, visuals };
}
