import {
  DailyForecastPoint,
  FarmerWatchResponse,
  GeocodingResponse,
  LocationSearchResult,
  OfficialAlertResponse,
  RiskEvaluationResponse,
  WeatherForecastResponse,
} from "@/types";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

export async function searchLocations(query: string): Promise<LocationSearchResult[]> {
  if (!query || query.trim().length < 2) return [];
  const res = await fetch(`${API_BASE}/api/v1/geo/search?q=${encodeURIComponent(query.trim())}`);
  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({}));
    throw new Error(errorBody.detail || `Geocoding request failed (${res.status})`);
  }
  const data: GeocodingResponse = await res.json();
  return data.results;
}

export async function getForecast(latitude: number, longitude: number): Promise<WeatherForecastResponse> {
  const res = await fetch(`${API_BASE}/api/v1/weather/forecast?latitude=${latitude}&longitude=${longitude}`);
  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({}));
    throw new Error(errorBody.detail || `Weather forecast query failed (${res.status})`);
  }
  return res.json();
}

export async function getOfficialAlerts(
  district?: string,
  state?: string,
  locationLabel: string = "Selected Location"
): Promise<OfficialAlertResponse> {
  const params = new URLSearchParams({ location_label: locationLabel });
  if (district) params.append("district", district);
  if (state) params.append("state", state);

  const res = await fetch(`${API_BASE}/api/v1/alerts/imd?${params.toString()}`);
  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({}));
    throw new Error(errorBody.detail || `Official alerts query failed (${res.status})`);
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

export async function checkBackendHealth(): Promise<{ status: string; upstream_providers: Record<string, string> }> {
  const res = await fetch(`${API_BASE}/api/health`);
  if (!res.ok) throw new Error("Backend unhealthy");
  return res.json();
}
