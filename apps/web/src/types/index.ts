export interface Provenance {
  provider: string;
  retrieved_at: string;
  source_model?: string;
  attribution_url: string;
  disclaimer: string;
}

export interface LocationSearchResult {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
  elevation?: number;
  country?: string;
  admin1?: string;
  admin2?: string;
  formatted_label: string;
}

export interface GeocodingResponse {
  query: string;
  count: number;
  results: LocationSearchResult[];
  provenance: Provenance;
}

export interface CurrentWeather {
  time: string;
  temperature_2m: number;
  relative_humidity_2m: number;
  apparent_temperature: number;
  is_day: number;
  precipitation: number;
  weather_code: number;
  weather_description: string;
  weather_icon: string;
  wind_speed_10m: number;
  wind_direction_10m?: number;
}

export interface HourlyForecastPoint {
  time: string;
  temperature_2m: number;
  precipitation_probability?: number | null;
  precipitation: number;
  weather_code: number;
  weather_description: string;
  wind_speed_10m: number;
}

export interface DailyForecastPoint {
  date: string;
  weather_code: number;
  weather_description: string;
  weather_icon: string;
  temperature_2m_max: number;
  temperature_2m_min: number;
  precipitation_sum: number;
  precipitation_probability_max?: number | null;
  wind_gusts_10m_max: number;
  uv_index_max?: number | null;
  sunrise?: string | null;
  sunset?: string | null;
}

export interface WeatherForecastResponse {
  latitude: number;
  longitude: number;
  elevation?: number;
  timezone: string;
  timezone_abbreviation?: string;
  current: CurrentWeather;
  hourly: HourlyForecastPoint[];
  daily: DailyForecastPoint[];
  provenance: Provenance;
}

export type AlertSeverity =
  | "Red Warning (Take Action)"
  | "Orange Warning (Be Prepared)"
  | "Yellow Warning (Be Updated)"
  | "Green (No Warning / Normal)";

export type AlertProviderStatus =
  | "CONNECTED"
  | "SERVICE_UNAVAILABLE"
  | "UNAUTHENTICATED"
  | "NOT_CONFIGURED";

export interface OfficialAlertItem {
  id: string;
  headline: string;
  event: string;
  severity: AlertSeverity;
  effective: string;
  expires: string;
  area_description: string;
  state: string;
  district: string;
  instruction?: string;
  issuing_office: string;
}

export interface OfficialAlertResponse {
  provider_status: AlertProviderStatus;
  official_agency: string;
  query_location: string;
  district?: string;
  state?: string;
  active_alerts: OfficialAlertItem[];
  official_portal_url: string;
  ndma_sachet_url: string;
  unavailability_reason?: string;
  setup_instructions?: string;
  provenance: Provenance;
}

export type RiskSeverity = "High" | "Moderate" | "Low";

export interface RiskSignal {
  category: string;
  severity: RiskSeverity;
  date: string;
  threshold_basis: string;
  evidence: string;
  recommended_action: string;
}

export interface RiskEvaluationResponse {
  evaluated_days: number;
  signals: RiskSignal[];
  methodology: string;
  provenance: Provenance;
}

export type SensorStatus =
  | "CONNECTED"
  | "DISCONNECTED / UNCONFIGURED"
  | "GATED (Awaiting Hardware Telemetry)";

export interface HardwareGatingStatus {
  soil_moisture_sensor: SensorStatus;
  satellite_ndvi_index: SensorStatus;
  field_yield_model: SensorStatus;
  explanation: string;
}

export interface FarmerWatchSignal {
  category: string;
  severity: string;
  crop: string;
  date: string;
  observation: string;
  action: string;
  scientific_rationale: string;
}

export interface FarmerWatchResponse {
  crop: string;
  days_since_sowing?: number;
  watches: FarmerWatchSignal[];
  hardware_gating: HardwareGatingStatus;
  provenance: Provenance;
}
