import {
  DailyForecastPoint,
  DiagnosticPushTestResponse,
  FarmerWatchResponse,
  GeocodingResponse,
  GlobalAlertItem,
  GlobalAlertsResponse,
  LocationSearchResult,
  PushPreferencesResponse,
  PushPreferencesUpdateRequest,
  PushSubscribePayload,
  PushSubscribeResponse,
  RiskEvaluationResponse,
  WeatherForecastResponse,
  MultiModelResponse,
  NearbyObservationResponse,
  RadarNowcastResponse,
  CuratedCityWeather,
} from "@/types";

/**
 * Resolves the backend API base URL based on runtime environment:
 * - Server Functions / SSR: Uses the bound internal service URL (process.env.API_URL) injected by Vercel
 * - Browser Client: Uses relative URL "" so requests hit same-origin and are routed via Vercel top-level rewrites
 * - Local / Standalone: Fallback to NEXT_PUBLIC_API_URL or http://127.0.0.1:8000
 */
export function getApiBase(): string {
  if (typeof window === "undefined") {
    const bound = process.env.API_URL || process.env.INTERNAL_API_URL;
    if (bound) {
      return bound.replace(/\/$/, "");
    }
    return (process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000").replace(/\/$/, "");
  }
  return process.env.NEXT_PUBLIC_API_URL ? process.env.NEXT_PUBLIC_API_URL.replace(/\/$/, "") : "";
}

const API_BASE = getApiBase();

export async function searchLocations(
  query: string,
  countryCode?: string,
  signal?: AbortSignal
): Promise<LocationSearchResult[]> {
  if (!query || query.trim().length < 2) return [];
  const params = new URLSearchParams({
    q: query.trim(),
    count: "5",
  });
  if (countryCode) {
    params.append("country_code", countryCode);
  }
  const res = await fetch(`${API_BASE}/api/v1/locations?${params.toString()}`, { signal });
  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({}));
    throw new Error(errorBody.detail || `Geocoding request failed (${res.status})`);
  }
  const data: GeocodingResponse = await res.json();
  return data.results;
}

export async function getForecast(
  latitude: number,
  longitude: number,
  signal?: AbortSignal
): Promise<WeatherForecastResponse> {
  const res = await fetch(`${API_BASE}/api/v1/weather?latitude=${latitude}&longitude=${longitude}`, { signal });
  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({}));
    throw new Error(errorBody.detail || `Weather forecast query failed (${res.status})`);
  }
  return res.json();
}

export async function getCuratedCitiesWeather(
  cities: { name: string; latitude: number; longitude: number }[],
  signal?: AbortSignal
): Promise<Record<string, CuratedCityWeather>> {
  if (!cities.length) return {};
  const lats = cities.map((c) => c.latitude).join(",");
  const lons = cities.map((c) => c.longitude).join(",");
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lats}&longitude=${lons}&current=temperature_2m,weather_code,is_day`;

  try {
    const res = await fetch(url, { signal });
    if (!res.ok) return {};
    const data = await res.json();
    const result: Record<string, CuratedCityWeather> = {};

    if (Array.isArray(data)) {
      data.forEach((item, idx) => {
        const city = cities[idx];
        if (city && item?.current) {
          result[city.name] = {
            cityName: city.name,
            temperature: Math.round(item.current.temperature_2m),
            weatherCode: item.current.weather_code,
            isDay: item.current.is_day === 1,
          };
        }
      });
    } else if (data?.current) {
      const city = cities[0];
      if (city) {
        result[city.name] = {
          cityName: city.name,
          temperature: Math.round(data.current.temperature_2m),
          weatherCode: data.current.weather_code,
          isDay: data.current.is_day === 1,
        };
      }
    }
    return result;
  } catch {
    return {};
  }
}

export async function getGlobalAlerts(
  countryCode?: string,
  latitude?: number,
  longitude?: number,
  radiusKm: number = 1000,
  signal?: AbortSignal
): Promise<GlobalAlertsResponse> {
  const params = new URLSearchParams();
  if (countryCode) params.append("country_code", countryCode);
  if (latitude !== undefined) params.append("latitude", latitude.toString());
  if (longitude !== undefined) params.append("longitude", longitude.toString());
  params.append("radius_km", radiusKm.toString());

  const res = await fetch(`${API_BASE}/api/v1/alerts/global?${params.toString()}`, { signal });
  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({}));
    throw new Error(errorBody.detail || `Global alerts query failed (${res.status})`);
  }
  return res.json();
}

export async function getAlertDetail(alertId: string, signal?: AbortSignal): Promise<GlobalAlertItem> {
  const res = await fetch(`${API_BASE}/api/v1/alerts/${alertId}`, { signal });
  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({}));
    throw new Error(errorBody.detail || `Alert detail fetch failed (${res.status})`);
  }
  return res.json();
}

export async function checkBackendHealth(signal?: AbortSignal): Promise<{
  status: string;
  service: string;
  version: string;
  upstream_providers?: Record<string, string>;
}> {
  const res = await fetch(`${API_BASE}/api/health`, { signal });
  if (!res.ok) {
    const fallback = await fetch(`${API_BASE}/health`, { signal });
    if (!fallback.ok) throw new Error("Backend unhealthy");
    return fallback.json();
  }
  return res.json();
}

export async function evaluateRisks(
  daily: DailyForecastPoint[],
  signal?: AbortSignal
): Promise<RiskEvaluationResponse> {
  const res = await fetch(`${API_BASE}/api/v1/risk/evaluate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ daily_forecast: daily }),
    signal,
  });
  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({}));
    throw new Error(errorBody.detail || `Risk evaluation failed (${res.status})`);
  }
  return res.json();
}

export async function getFarmerWatches(
  crop: string,
  daily: DailyForecastPoint[],
  sowingDate?: string,
  signal?: AbortSignal
): Promise<FarmerWatchResponse> {
  const res = await fetch(`${API_BASE}/api/v1/farmer/watch`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      crop: crop,
      sowing_date: sowingDate || null,
      daily_forecast: daily,
    }),
    signal,
  });
  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({}));
    throw new Error(errorBody.detail || `Farmer watches query failed (${res.status})`);
  }
  return res.json();
}

// Push Notification Client Functions (Phase 3)
export async function getVapidPublicKey(): Promise<string> {
  const res = await fetch(`${API_BASE}/api/v1/push/vapid-public-key`);
  if (!res.ok) {
    throw new Error("Failed to retrieve VAPID applicationServerKey from server.");
  }
  const data = await res.json();
  return data.public_key;
}

export async function subscribePush(payload: PushSubscribePayload): Promise<PushSubscribeResponse> {
  const res = await fetch(`${API_BASE}/api/v1/push/subscribe`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `Push subscription registration failed (${res.status})`);
  }
  return res.json();
}

export async function getPushPreferences(token: string): Promise<PushPreferencesResponse> {
  const res = await fetch(`${API_BASE}/api/v1/push/preferences`, {
    headers: {
      "X-Subscription-Token": token,
    },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `Failed to fetch push preferences (${res.status})`);
  }
  return res.json();
}

export async function updatePushPreferences(
  token: string,
  payload: PushPreferencesUpdateRequest
): Promise<PushPreferencesResponse> {
  const res = await fetch(`${API_BASE}/api/v1/push/preferences`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      "X-Subscription-Token": token,
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `Failed to update push preferences (${res.status})`);
  }
  return res.json();
}

export async function unsubscribePush(
  subscriptionId: string,
  token: string
): Promise<{ status: string; subscription_id: string }> {
  const res = await fetch(`${API_BASE}/api/v1/push/subscriptions/${subscriptionId}`, {
    method: "DELETE",
    headers: {
      "X-Subscription-Token": token,
    },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `Failed to unsubscribe (${res.status})`);
  }
  return res.json();
}

export async function sendDiagnosticPushTest(token: string): Promise<DiagnosticPushTestResponse> {
  const res = await fetch(`${API_BASE}/api/v1/push/test`, {
    method: "POST",
    headers: {
      "X-Subscription-Token": token,
    },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `Diagnostic push test failed (${res.status})`);
  }
  return res.json();
}

// Hybrid Multi-Model, Station Observation & Radar Nowcast APIs
export async function getMultiModelForecast(
  latitude: number,
  longitude: number,
  days: number = 5,
  signal?: AbortSignal
): Promise<MultiModelResponse> {
  const res = await fetch(
    `${API_BASE}/api/v1/prediction/multi-model?latitude=${latitude}&longitude=${longitude}&days=${days}`,
    { signal }
  );
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `Multi-model forecast query failed (${res.status})`);
  }
  return res.json();
}

export async function getStationObservation(
  latitude: number,
  longitude: number,
  modelTemp?: number,
  signal?: AbortSignal
): Promise<NearbyObservationResponse> {
  const params = new URLSearchParams({
    latitude: latitude.toString(),
    longitude: longitude.toString(),
  });
  if (modelTemp !== undefined) {
    params.append("model_temp", modelTemp.toString());
  }
  const res = await fetch(`${API_BASE}/api/v1/prediction/observation?${params.toString()}`, { signal });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `Station observation query failed (${res.status})`);
  }
  return res.json();
}

export async function getRadarNowcast(
  latitude: number,
  longitude: number,
  currentPrecip: number = 0.0,
  signal?: AbortSignal
): Promise<RadarNowcastResponse> {
  const res = await fetch(
    `${API_BASE}/api/v1/prediction/nowcast?latitude=${latitude}&longitude=${longitude}&current_precip=${currentPrecip}`,
    { signal }
  );
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `Radar nowcast query failed (${res.status})`);
  }
  return res.json();
}

export async function getTelegramBotInfo(): Promise<{
  bot_username: string;
  bot_url: string;
  is_configured: boolean;
  instructions: string;
}> {
  const res = await fetch(`${API_BASE}/api/v1/telegram/bot-info`);
  if (!res.ok) {
    throw new Error(`Failed to fetch Telegram bot info (${res.status})`);
  }
  return res.json();
}

export async function sendTelegramTestAlert(
  chatId: string,
  location: string = "My Location",
  authToken?: string
): Promise<{ status: string; message: string }> {
  const res = await fetch(`${API_BASE}/api/v1/telegram/test-alert`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, location, auth_token: authToken }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `Telegram test alert failed (${res.status})`);
  }
  return res.json();
}

export async function requestTelegramVerification(
  chatId: string,
  cityName: string = "My Location",
  latitude?: number,
  longitude?: number
): Promise<{ status: string; chat_id: string; message: string }> {
  const res = await fetch(`${API_BASE}/api/v1/telegram/request-verification`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      city_name: cityName,
      latitude,
      longitude,
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `Verification code request failed (${res.status})`);
  }
  return res.json();
}

export async function confirmTelegramVerificationCode(
  chatId: string,
  code: string,
  cityName?: string,
  latitude?: number,
  longitude?: number
): Promise<{ status: string; chat_id: string; auth_token: string; is_verified: boolean }> {
  const res = await fetch(`${API_BASE}/api/v1/telegram/verify-code`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      code,
      city_name: cityName,
      latitude,
      longitude,
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `Code verification failed (${res.status})`);
  }
  return res.json();
}

