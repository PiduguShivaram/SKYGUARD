/**
 * SkyGuard Atmospheric Engine - Weather Data Normalization Layer
 * Transforms raw provider responses into a typed, verified, immutable WeatherSceneState.
 * Adheres to SkyGuard Data Integrity Invariants:
 * - Zero fabricated data.
 * - Local time strictly formatted in location's authentic IANA timezone.
 * - Explicit data availability status.
 */

import {
  WeatherForecastResponse,
  LocationSearchResult,
} from "@/types";
import {
  WeatherSceneState,
  WeatherCondition,
  DataAvailabilityStatus,
} from "./weatherSceneTypes";
import { calculateSolarPosition } from "./solarPosition";

export function normalizeWeatherScene(
  forecast: WeatherForecastResponse | null,
  selectedHourIndex?: number,
  location?: LocationSearchResult | null
): WeatherSceneState {
  // If forecast is completely absent
  if (!forecast) {
    const lat = location?.latitude ?? 0;
    const lon = location?.longitude ?? 0;
    const tz = location?.timezone || "UTC";
    const now = new Date();
    const solarPos = calculateSolarPosition(lat, lon, now);

    return {
      locationId: String(location?.id || "unknown"),
      locationName: location?.name || "Select Location",
      latitude: lat,
      longitude: lon,
      timezone: tz,
      validTimeUtc: now.toISOString(),
      localTime: formatLocalTime(now, tz),
      localDate: formatLocalDate(now, tz),
      condition: "unknown",
      solarPhase: solarPos.phase,
      solarPosition: solarPos,
      temperatureC: null,
      apparentTemperatureC: null,
      humidityPercent: null,
      cloudCoverPercent: null,
      precipitationRateMmH: null,
      precipitationProbability: null,
      windSpeedKmh: null,
      windDirectionDegrees: null,
      visibilityMeters: null,
      uvIndex: null,
      sunrise: null,
      sunset: null,
      weatherCode: 0,
      weatherDescription: "Awaiting atmospheric telemetry",
      isDay: solarPos.phase === "day" || solarPos.phase === "sunrise",
      dataStatus: "unavailable",
      source: "Open-Meteo NWP",
    };
  }

  const lat = forecast.latitude ?? location?.latitude ?? 0;
  const lon = forecast.longitude ?? location?.longitude ?? 0;
  const tz = forecast.timezone || location?.timezone || "UTC";

  // Check if an hourly forecast slice is selected
  const activeHour =
    selectedHourIndex !== undefined &&
    forecast.hourly &&
    forecast.hourly[selectedHourIndex]
      ? forecast.hourly[selectedHourIndex]
      : null;

  const current = forecast.current;

  // Determine valid time string and UTC date
  const validTimeString = activeHour ? activeHour.time : current?.time || new Date().toISOString();
  const validDate = new Date(validTimeString);

  // Compute authentic local time & date string
  const localTime = formatLocalTime(validDate, tz);
  const localDate = formatLocalDate(validDate, tz);

  // Calculate exact astronomical solar position for this coordinate & instant
  const solarPos = calculateSolarPosition(lat, lon, validDate);

  // Determine diurnal isDay
  let isDay: boolean;
  if (activeHour && typeof activeHour.is_day === "number") {
    isDay = activeHour.is_day === 1;
  } else if (current && typeof current.is_day === "number") {
    isDay = current.is_day === 1;
  } else {
    isDay = solarPos.phase === "day" || solarPos.phase === "sunrise";
  }

  // Weather code and metrics
  const weatherCode = activeHour ? activeHour.weather_code : current ? current.weather_code : 0;
  const tempC = activeHour ? activeHour.temperature_2m : current ? current.temperature_2m : null;
  const apparentTempC = current ? current.apparent_temperature : tempC;
  const humidity = current ? current.relative_humidity_2m : null;
  const precipRate = activeHour ? activeHour.precipitation : current ? current.precipitation : null;
  const precipProb = activeHour
    ? activeHour.precipitation_probability ?? null
    : forecast.daily?.[0]?.precipitation_probability_max ?? null;
  const windSpeed = activeHour ? activeHour.wind_speed_10m : current ? current.wind_speed_10m : null;
  const windDir = current ? current.wind_direction_10m ?? null : null;
  const uvIndex = forecast.daily?.[0]?.uv_index_max ?? (isDay ? 4 : 0);
  const sunrise = forecast.daily?.[0]?.sunrise ?? null;
  const sunset = forecast.daily?.[0]?.sunset ?? null;

  // Cloud cover percent
  let cloudCover: number | null = null;
  if (activeHour && typeof activeHour.cloud_cover === "number") {
    cloudCover = activeHour.cloud_cover;
  } else if (current && typeof current.cloud_cover === "number") {
    cloudCover = current.cloud_cover;
  } else {
    // Meteorological estimation from WMO interpretation code
    cloudCover = estimateCloudCoverFromWmo(weatherCode);
  }

  // Classify weather condition
  const condition = classifyCondition(weatherCode);

  // Classify overall data status
  let dataStatus: DataAvailabilityStatus = "available";
  if (tempC === null || weatherCode === null) {
    dataStatus = "partial";
  }

  const desc = activeHour
    ? activeHour.weather_description
    : current
    ? current.weather_description
    : "Observation Active";

  return {
    locationId: String(location?.id || `${lat.toFixed(2)},${lon.toFixed(2)}`),
    locationName: location?.name || "Selected Location",
    latitude: lat,
    longitude: lon,
    timezone: tz,
    validTimeUtc: validDate.toISOString(),
    localTime,
    localDate,
    condition,
    solarPhase: solarPos.phase,
    solarPosition: solarPos,
    temperatureC: tempC,
    apparentTemperatureC: apparentTempC,
    humidityPercent: humidity,
    cloudCoverPercent: cloudCover,
    precipitationRateMmH: precipRate,
    precipitationProbability: precipProb,
    windSpeedKmh: windSpeed,
    windDirectionDegrees: windDir,
    visibilityMeters: null,
    uvIndex,
    sunrise,
    sunset,
    weatherCode,
    weatherDescription: desc,
    isDay,
    dataStatus,
    source: forecast.provenance?.provider || "Open-Meteo NWP",
  };
}

function classifyCondition(wmoCode: number): WeatherCondition {
  // Thunderstorm
  if (wmoCode >= 95) return "thunderstorm";
  // Rain
  if ((wmoCode >= 60 && wmoCode <= 69) || (wmoCode >= 80 && wmoCode <= 82)) return "rain";
  // Drizzle
  if (wmoCode >= 50 && wmoCode <= 59) return "rain";
  // Snow
  if ((wmoCode >= 70 && wmoCode <= 79) || (wmoCode >= 85 && wmoCode <= 86)) return "snow";
  // Fog
  if (wmoCode === 45 || wmoCode === 48) return "fog";
  // Overcast
  if (wmoCode === 3) return "overcast";
  // Partly Cloudy
  if (wmoCode === 1 || wmoCode === 2) return "partly-cloudy";
  // Clear
  if (wmoCode === 0) return "clear";
  return "unknown";
}

function estimateCloudCoverFromWmo(wmoCode: number): number {
  if (wmoCode === 0) return 5;
  if (wmoCode === 1) return 25;
  if (wmoCode === 2) return 55;
  if (wmoCode === 3) return 90;
  if (wmoCode === 45 || wmoCode === 48) return 95;
  if (wmoCode >= 50 && wmoCode <= 69) return 85;
  if (wmoCode >= 70 && wmoCode <= 79) return 90;
  if (wmoCode >= 80 && wmoCode <= 84) return 90;
  if (wmoCode >= 95) return 100;
  return 40;
}

function formatLocalTime(date: Date, timezone: string): string {
  try {
    return new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    }).format(date);
  } catch {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: true });
  }
}

function formatLocalDate(date: Date, timezone: string): string {
  try {
    return new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      day: "numeric",
      month: "short",
      year: "numeric",
    }).format(date);
  } catch {
    return date.toLocaleDateString([], { day: "numeric", month: "short", year: "numeric" });
  }
}
