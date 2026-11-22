/**
 * SkyGuard Atmospheric Engine - Visual Parameter Mapping Layer
 * Translates normalized weather & solar state into precise, physically plausible visual directives.
 * Adheres strictly to creative-art-direction, animation-performance, and anti-ai-slop-design:
 * - Natural physical luma over neon artificial gradients.
 * - Restrained, realistic motion.
 * - Deterministic procedural variation derived from coordinates and valid time (0 fake weather).
 */

import {
  WeatherSceneState,
  AtmosphericVisualParameters,
} from "./weatherSceneTypes";

export function mapWeatherToVisuals(state: WeatherSceneState): AtmosphericVisualParameters {
  const {
    condition,
    solarPhase,
    solarPosition,
    temperatureC,
    cloudCoverPercent,
    precipitationRateMmH,
    windSpeedKmh,
    windDirectionDegrees,
    humidityPercent,
    isDay,
    locationName,
    latitude,
    longitude,
    validTimeUtc,
    dataStatus,
  } = state;

  // 1. Deterministic Procedural Seed (stable across re-renders for identical location & hour)
  const timeHourBucket = Math.floor(new Date(validTimeUtc).getTime() / 3600000);
  const rawSeed = Math.sin(latitude * 12.9898 + longitude * 78.233 + timeHourBucket * 0.37) * 43758.5453;
  const proceduralSeed = Math.abs(rawSeed) % 1;

  // Handle unavailable data status with neutral, dignified aesthetics
  if (dataStatus === "unavailable" || condition === "unknown") {
    return createUnavailableVisuals(state, proceduralSeed);
  }

  const cloudCover = cloudCoverPercent ?? 20;
  const precipRate = precipitationRateMmH ?? 0;
  const windSpd = windSpeedKmh ?? 8;
  const windDir = windDirectionDegrees ?? 180;
  const elev = solarPosition.elevation;

  // 2. Physical Sky Palette derived from solar elevation & weather condition
  const sky = computeSkyGradient(condition, solarPhase, elev);
  const luma = computeAtmosphericLuma(solarPhase, elev, cloudCover, condition);

  // 3. Cloud Visuals
  const cloudVisuals = computeCloudVisuals(condition, solarPhase, cloudCover, windSpd, windDir, luma);

  // 4. Precipitation Visuals
  const precipitationVisuals = computePrecipitationVisuals(condition, precipRate, windSpd, windDir);

  // 5. Celestial Bodies (Sun, Moon, Stars)
  const celestialVisuals = computeCelestialVisuals(solarPhase, solarPosition, cloudCover, condition);

  // 6. Atmospheric Effects (Droplets, Fog, Lightning)
  const atmosphericEffects = computeAtmosphericEffects(condition, humidityPercent, precipRate, cloudCover);

  // 7. Editorial Weather Narrative
  const { headline, explanation } = generateWeatherNarrative(state);

  return {
    skyGradient: sky,
    luma,
    ambientLightColor: luma > 0.4 ? "rgba(255, 255, 255, 0.95)" : "rgba(215, 230, 250, 0.85)",
    cloudVisuals,
    precipitationVisuals,
    celestialVisuals,
    atmosphericEffects,
    proceduralSeed,
    narrativeHeadline: headline,
    narrativeExplanation: explanation,
  };
}

function computeSkyGradient(
  condition: string,
  solarPhase: string,
  elevation: number
): { from: string; via: string; to: string; horizonAura: string } {
  // Convective Storm
  if (condition === "thunderstorm") {
    return {
      from: "#121A24",
      via: "#1C2838",
      to: "#0B1118",
      horizonAura: "rgba(30, 45, 65, 0.4)",
    };
  }

  // Rain or Drizzle
  if (condition === "rain") {
    if (solarPhase === "night" || solarPhase === "twilight") {
      return {
        from: "#0A1320",
        via: "#121E30",
        to: "#060B12",
        horizonAura: "rgba(20, 35, 55, 0.35)",
      };
    }
    return {
      from: "#1A2E44",
      via: "#253E5C",
      to: "#132233",
      horizonAura: "rgba(45, 70, 95, 0.4)",
    };
  }

  // Snow
  if (condition === "snow") {
    return {
      from: "#223548",
      via: "#304862",
      to: "#182635",
      horizonAura: "rgba(55, 80, 105, 0.45)",
    };
  }

  // Fog
  if (condition === "fog") {
    return {
      from: "#203448",
      via: "#2D4660",
      to: "#162534",
      horizonAura: "rgba(50, 75, 95, 0.5)",
    };
  }

  // Overcast
  if (condition === "overcast") {
    if (solarPhase === "night" || solarPhase === "twilight") {
      return {
        from: "#0A121E",
        via: "#111C2C",
        to: "#060B12",
        horizonAura: "rgba(18, 30, 48, 0.3)",
      };
    }
    return {
      from: "#1E334A",
      via: "#2A4564",
      to: "#152435",
      horizonAura: "rgba(40, 65, 90, 0.4)",
    };
  }

  // Sunrise (warm golden horizon transitioning to twilight/day)
  if (solarPhase === "sunrise") {
    return {
      from: "#1A2740",
      via: "#353244",
      to: "#101625",
      horizonAura: "rgba(245, 158, 11, 0.45)",
    };
  }

  // Sunset (amber/rose horizon transitioning to cool indigo)
  if (solarPhase === "sunset") {
    return {
      from: "#162035",
      via: "#362438",
      to: "#0E1424",
      horizonAura: "rgba(234, 88, 12, 0.45)",
    };
  }

  // Civil / Nautical Twilight
  if (solarPhase === "twilight") {
    return {
      from: "#0D182B",
      via: "#162542",
      to: "#080E1A",
      horizonAura: "rgba(35, 55, 90, 0.35)",
    };
  }

  // Deep Nocturnal Sky (Clear or Partly Cloudy)
  if (solarPhase === "night") {
    return {
      from: "#08101E",
      via: "#0E1C33",
      to: "#050A13",
      horizonAura: "rgba(18, 32, 58, 0.3)",
    };
  }

  // Clear / Partly Cloudy Daytime
  return {
    from: "#184E82",
    via: "#2467A8",
    to: "#103860",
    horizonAura: "rgba(90, 160, 230, 0.35)",
  };
}

function computeAtmosphericLuma(
  solarPhase: string,
  elevation: number,
  cloudCover: number,
  condition: string
): number {
  let base = 0.15;
  if (solarPhase === "day") {
    base = 0.65 + Math.min(0.35, Math.max(0, elevation / 70) * 0.35);
  } else if (solarPhase === "sunrise" || solarPhase === "sunset") {
    base = 0.42;
  } else if (solarPhase === "twilight") {
    base = 0.25;
  } else {
    base = 0.12;
  }

  // Attenuate for cloudiness and storm
  const cloudDampening = 1 - (cloudCover / 100) * 0.38;
  const stormDampening = condition === "thunderstorm" ? 0.75 : 1.0;
  return Math.max(0.1, Math.min(1.0, base * cloudDampening * stormDampening));
}

function computeCloudVisuals(
  condition: string,
  solarPhase: string,
  cloudCover: number,
  windSpeed: number,
  windDir: number,
  luma: number
) {
  const density = Math.max(0.05, Math.min(1.0, cloudCover / 100));
  const layers = cloudCover > 70 ? 3 : cloudCover > 30 ? 2 : 1;
  const driftSpeed = Math.max(0.2, Math.min(2.5, (windSpeed / 12) * 0.5));

  let bodyColor = "#FFFFFF";
  let highlightColor = "#FFFFFF";
  let shadowColor = "rgba(15, 30, 50, 0.4)";

  if (solarPhase === "night") {
    bodyColor = "#9DB2C7";
    highlightColor = "#CAD6E4";
    shadowColor = "rgba(4, 9, 18, 0.85)";
  } else if (solarPhase === "sunrise" || solarPhase === "sunset") {
    bodyColor = "#FDE68A";
    highlightColor = "#FFFBEB";
    shadowColor = "rgba(40, 20, 25, 0.55)";
  } else if (condition === "thunderstorm") {
    bodyColor = "#8E9EAF";
    highlightColor = "#B4C4D4";
    shadowColor = "rgba(8, 14, 22, 0.9)";
  } else if (condition === "rain" || condition === "overcast") {
    bodyColor = "#D5E0EB";
    highlightColor = "#F1F5F9";
    shadowColor = "rgba(18, 30, 45, 0.6)";
  }

  return {
    density,
    coveragePercent: cloudCover,
    layers,
    driftSpeed,
    driftAngle: windDir,
    bodyColor,
    highlightColor,
    shadowColor,
    opacity: Math.max(0.65, Math.min(0.98, 0.6 + density * 0.38)),
  };
}

function computePrecipitationVisuals(
  condition: string,
  precipRate: number,
  windSpeed: number,
  windDir: number
) {
  let type: "none" | "rain" | "drizzle" | "snow" | "mixed" = "none";
  let intensity = 0;
  let particleCount = 0;
  let speed = 14;

  if (condition === "thunderstorm") {
    type = "rain";
    intensity = 0.95;
    particleCount = 140;
    speed = 22;
  } else if (condition === "rain") {
    type = precipRate < 1.0 ? "drizzle" : "rain";
    intensity = Math.max(0.3, Math.min(1.0, precipRate / 8));
    particleCount = type === "drizzle" ? 60 : 100;
    speed = type === "drizzle" ? 10 : 16;
  } else if (condition === "snow") {
    type = "snow";
    intensity = 0.6;
    particleCount = 70;
    speed = 2.5;
  }

  // Wind slant angle in radians
  const slant = (windSpeed / 50) * Math.sin((windDir * Math.PI) / 180);

  return {
    type,
    intensity,
    rateMmH: precipRate,
    particleCount,
    speed,
    slantAngle: slant,
  };
}

function computeCelestialVisuals(
  solarPhase: string,
  solarPosition: { screenPosition: { x: number; y: number }; elevation: number; lunarPhaseFraction: number },
  cloudCover: number,
  condition: string
) {
  const isSolarOccluded = cloudCover > 85 || condition === "thunderstorm";
  const showSun =
    (solarPhase === "day" || solarPhase === "sunrise" || solarPhase === "sunset") && !isSolarOccluded;

  const showMoon =
    (solarPhase === "night" || solarPhase === "twilight") && cloudCover < 85;

  let starDensity = 0;
  if (solarPhase === "night") {
    starDensity = Math.max(0, 1 - (cloudCover / 75));
  } else if (solarPhase === "twilight") {
    starDensity = Math.max(0, 0.35 - (cloudCover / 60));
  }

  let sunColor = "#FFF7ED";
  if (solarPhase === "sunrise" || solarPhase === "sunset") {
    sunColor = "#FDE047";
  }

  return {
    showSun,
    sunPosition: solarPosition.screenPosition,
    sunColor,
    sunGlowRadius: solarPhase === "day" ? 56 : 72,
    showMoon,
    moonPosition: solarPosition.screenPosition,
    moonPhaseFraction: solarPosition.lunarPhaseFraction,
    starDensity,
  };
}

function computeAtmosphericEffects(
  condition: string,
  humidity: number | null,
  precipRate: number,
  cloudCover: number
) {
  const hasFog = condition === "fog";
  const fogDensity = hasFog ? 0.75 : 0;
  const hasLightning = condition === "thunderstorm";
  const condensation = (humidity !== null && humidity > 78) || precipRate > 0 || condition === "rain" || condition === "thunderstorm";

  return {
    hasFog,
    fogDensity,
    hasLightning,
    lightningFrequency: hasLightning ? 4.5 : 0,
    condensationDroplets: condensation,
    dropletDensity: condensation ? 45 : 0,
    hazeOpacity: Math.min(0.35, (cloudCover / 100) * 0.25),
  };
}

function generateWeatherNarrative(state: WeatherSceneState): { headline: string; explanation: string } {
  const { condition, solarPhase, temperatureC, windSpeedKmh, locationName, weatherDescription } = state;
  const tempRounded = temperatureC !== null ? Math.round(temperatureC) : "--";
  const windRounded = windSpeedKmh !== null ? Math.round(windSpeedKmh) : "--";

  let headline = weatherDescription;
  let explanation = `Surface temperatures at ${tempRounded}°C across ${locationName} with ${windRounded} km/h wind.`;

  if (condition === "thunderstorm") {
    headline = solarPhase === "night" ? "Nocturnal Convective Storm" : "Severe Convective Storm";
    explanation = `Intense electrical discharge and localized precipitation convective cells across ${locationName}. Ground wind velocity at ${windRounded} km/h.`;
  } else if (condition === "rain") {
    headline = solarPhase === "night" ? "Nocturnal Rain Showers" : "Atmospheric Rain Showers";
    explanation = `Persistent precipitation system impacting ${locationName} with ground ambient temperature at ${tempRounded}°C.`;
  } else if (condition === "snow") {
    headline = "Sub-Freezing Snowfall";
    explanation = `Cold polar airmass bringing active snowfall across ${locationName} at ${tempRounded}°C.`;
  } else if (condition === "fog") {
    headline = solarPhase === "night" ? "Dense Nocturnal Fog" : "Dense Atmospheric Fog";
    explanation = `Near-surface moisture saturation causing reduced horizontal visibility across ${locationName}.`;
  } else if (condition === "overcast") {
    headline = solarPhase === "night" ? "Overcast Night Sky" : "Dense Overcast Sky";
    explanation = `Continuous stratiform cloud deck obstructing solar irradiance across ${locationName}. Ambient temperature at ${tempRounded}°C.`;
  } else if (condition === "partly-cloudy") {
    headline = solarPhase === "night" ? "Partly Cloudy Night" : "Partly Cloudy Atmosphere";
    explanation = `Scattered cumulus formations allowing intermittent stellar/solar penetration across ${locationName}.`;
  } else if (condition === "clear") {
    if (solarPhase === "night") {
      headline = "Clear Nocturnal Sky";
      explanation = `Unobstructed stellar sky with radiational nocturnal cooling across ${locationName}. Ground temperature at ${tempRounded}°C.`;
    } else if (solarPhase === "sunrise") {
      headline = "Solar Dawn Transition";
      explanation = `Atmospheric daylight boundary advancing across ${locationName}. Ground ambient temperature at ${tempRounded}°C.`;
    } else if (solarPhase === "sunset") {
      headline = "Solar Dusk Transition";
      explanation = `Solar disk descending below local horizon across ${locationName} at ${tempRounded}°C.`;
    } else {
      headline = "Radiant & Clear Sky";
      explanation = `Optimal direct solar irradiance across ${locationName}. Clean air mass with ${tempRounded}°C ambient temperature.`;
    }
  }

  return { headline, explanation };
}

function createUnavailableVisuals(
  state: WeatherSceneState,
  proceduralSeed: number
): AtmosphericVisualParameters {
  return {
    skyGradient: {
      from: "#141D29",
      via: "#1D2A3B",
      to: "#0F1620",
      horizonAura: "rgba(25, 40, 60, 0.3)",
    },
    luma: 0.3,
    ambientLightColor: "rgba(220, 230, 245, 0.8)",
    cloudVisuals: {
      density: 0.4,
      coveragePercent: 40,
      layers: 1,
      driftSpeed: 0.4,
      driftAngle: 180,
      bodyColor: "#CBD5E1",
      highlightColor: "#E2E8F0",
      shadowColor: "rgba(10, 18, 28, 0.6)",
      opacity: 0.7,
    },
    precipitationVisuals: {
      type: "none",
      intensity: 0,
      rateMmH: 0,
      particleCount: 0,
      speed: 10,
      slantAngle: 0,
    },
    celestialVisuals: {
      showSun: false,
      sunPosition: { x: 0.5, y: 0.4 },
      sunColor: "#FFFFFF",
      sunGlowRadius: 40,
      showMoon: false,
      moonPosition: { x: 0.5, y: 0.3 },
      moonPhaseFraction: 0.5,
      starDensity: 0,
    },
    atmosphericEffects: {
      hasFog: false,
      fogDensity: 0,
      hasLightning: false,
      lightningFrequency: 0,
      condensationDroplets: false,
      dropletDensity: 0,
      hazeOpacity: 0.1,
    },
    proceduralSeed,
    narrativeHeadline: "Awaiting Atmospheric Telemetry",
    narrativeExplanation: "Connect to live satellite feeds or select a geographic coordinate above.",
  };
}
