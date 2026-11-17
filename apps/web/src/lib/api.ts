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
} from "@/types";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

export async function searchLocations(query: string, countryCode?: string): Promise<LocationSearchResult[]> {
  if (!query || query.trim().length < 2) return [];
  const params = new URLSearchParams({
    q: query.trim(),
    count: "5",
  });
  if (countryCode) {
    params.append("country_code", countryCode);
  }
  const res = await fetch(`${API_BASE}/api/v1/locations?${params.toString()}`);
  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({}));
    throw new Error(errorBody.detail || `Geocoding request failed (${res.status})`);
  }
  const data: GeocodingResponse = await res.json();
  return data.results;
}

export async function getForecast(latitude: number, longitude: number): Promise<WeatherForecastResponse> {
  const res = await fetch(`${API_BASE}/api/v1/weather?latitude=${latitude}&longitude=${longitude}`);
  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({}));
    throw new Error(errorBody.detail || `Weather forecast query failed (${res.status})`);
  }
  return res.json();
}

export async function getGlobalAlerts(
  countryCode?: string,
  latitude?: number,
  longitude?: number,
  radiusKm: number = 1000
): Promise<GlobalAlertsResponse> {
  const params = new URLSearchParams();
  if (countryCode) params.append("country_code", countryCode);
  if (latitude !== undefined) params.append("latitude", latitude.toString());
  if (longitude !== undefined) params.append("longitude", longitude.toString());
  params.append("radius_km", radiusKm.toString());

  const res = await fetch(`${API_BASE}/api/v1/alerts/global?${params.toString()}`);
  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({}));
    throw new Error(errorBody.detail || `Global alerts query failed (${res.status})`);
  }
  return res.json();
}

export async function getAlertDetail(alertId: string): Promise<GlobalAlertItem> {
  const res = await fetch(`${API_BASE}/api/v1/alerts/${alertId}`);
  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({}));
    throw new Error(errorBody.detail || `Alert detail fetch failed (${res.status})`);
  }
  return res.json();
}

export async function checkBackendHealth(): Promise<{
  status: string;
  service: string;
  version: string;
  upstream_providers?: Record<string, string>;
}> {
  const res = await fetch(`${API_BASE}/api/health`);
  if (!res.ok) {
    const fallback = await fetch(`${API_BASE}/health`);
    if (!fallback.ok) throw new Error("Backend unhealthy");
    return fallback.json();
  }
  return res.json();
}

export async function evaluateRisks(daily: DailyForecastPoint[]): Promise<RiskEvaluationResponse> {
  const res = await fetch(`${API_BASE}/api/v1/risk/evaluate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ daily_forecast: daily }),
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
  sowingDate?: string
): Promise<FarmerWatchResponse> {
  const res = await fetch(`${API_BASE}/api/v1/farmer/watch`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      crop: crop,
      sowing_date: sowingDate || null,
      daily_forecast: daily,
    }),
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
