/**
 * SkyGuard Atmospheric Engine - Core Type Definitions & Scientific Contracts
 * Strict zero-fabrication contract: preserves provenance, units, and nullability.
 */

export type SolarPhase = "day" | "sunrise" | "sunset" | "twilight" | "night";

export type WeatherCondition =
  | "clear"
  | "partly-cloudy"
  | "overcast"
  | "rain"
  | "snow"
  | "thunderstorm"
  | "fog"
  | "mixed"
  | "unknown";

export type DataAvailabilityStatus = "available" | "partial" | "stale" | "unavailable";

export interface SolarPosition {
  elevation: number; // in degrees: < -18 night, -18 to -12 astronomical, -12 to -6 nautical, -6 to 0 civil twilight, 0 to 6 sunrise/sunset, > 6 day
  azimuth: number; // in degrees (0° North, 90° East, 180° South, 270° West)
  phase: SolarPhase;
  zenithProgress: number; // 0 (dawn) -> 0.5 (solar noon) -> 1 (dusk)
  screenPosition: { x: number; y: number }; // normalized 0.0 to 1.0 along the sky dome
  lunarPhaseFraction: number; // 0.0 (New Moon) -> 0.5 (Full Moon) -> 1.0 (Waning Crescent)
}

export interface WeatherSceneState {
  locationId: string;
  locationName: string;
  latitude: number;
  longitude: number;
  timezone: string;

  validTimeUtc: string;
  localTime: string;
  localDate: string;

  condition: WeatherCondition;
  solarPhase: SolarPhase;
  solarPosition: SolarPosition;

  temperatureC: number | null;
  apparentTemperatureC: number | null;
  humidityPercent: number | null;
  cloudCoverPercent: number | null;
  precipitationRateMmH: number | null;
  precipitationProbability: number | null;
  windSpeedKmh: number | null;
  windDirectionDegrees: number | null;
  visibilityMeters: number | null;
  uvIndex: number | null;

  sunrise: string | null;
  sunset: string | null;

  weatherCode: number;
  weatherDescription: string;
  isDay: boolean;

  dataStatus: DataAvailabilityStatus;
  source: string;
}

export interface AtmosphericVisualParameters {
  skyGradient: {
    from: string;
    via: string;
    to: string;
    horizonAura: string;
  };
  luma: number; // 0.0 (deep midnight) to 1.0 (bright midday sun)
  ambientLightColor: string;
  
  cloudVisuals: {
    density: number; // 0.0 to 1.0
    coveragePercent: number; // 0 to 100
    layers: number; // 1 to 3
    driftSpeed: number; // normalized pixel drift based on wind speed
    driftAngle: number; // wind direction in degrees
    bodyColor: string;
    highlightColor: string;
    shadowColor: string;
    opacity: number;
  };

  precipitationVisuals: {
    type: "none" | "rain" | "drizzle" | "snow" | "mixed";
    intensity: number; // 0.0 to 1.0
    rateMmH: number;
    particleCount: number;
    speed: number;
    slantAngle: number; // in radians derived from wind velocity
  };

  celestialVisuals: {
    showSun: boolean;
    sunPosition: { x: number; y: number };
    sunColor: string;
    sunGlowRadius: number;
    showMoon: boolean;
    moonPosition: { x: number; y: number };
    moonPhaseFraction: number;
    starDensity: number; // 0.0 in overcast/day up to 1.0 in clear night
  };

  atmosphericEffects: {
    hasFog: boolean;
    fogDensity: number;
    hasLightning: boolean;
    lightningFrequency: number; // seconds between strikes
    condensationDroplets: boolean;
    dropletDensity: number;
    hazeOpacity: number;
  };

  proceduralSeed: number; // deterministic seed from lat, lon, and time
  narrativeHeadline: string;
  narrativeExplanation: string;
}
