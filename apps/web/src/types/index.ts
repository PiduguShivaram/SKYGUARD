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
  country_code?: string;
  country?: string;
  admin1?: string;
  admin2?: string;
  timezone?: string;
  formatted_label: string;
}

export interface CuratedCityWeather {
  cityName: string;
  temperature: number;
  weatherCode: number;
  isDay: boolean;
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
  cloud_cover?: number | null;
}

export interface HourlyForecastPoint {
  time: string;
  temperature_2m: number;
  precipitation_probability?: number | null;
  precipitation: number;
  weather_code: number;
  weather_description: string;
  wind_speed_10m: number;
  is_day?: number;
  cloud_cover?: number | null;
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
  requested_latitude: number;
  requested_longitude: number;
  latitude: number;
  longitude: number;
  elevation?: number;
  timezone: string;
  timezone_abbreviation?: string;
  utc_offset_seconds?: number;
  units: Record<string, string>;
  current: CurrentWeather;
  hourly: HourlyForecastPoint[];
  daily: DailyForecastPoint[];
  provenance: Provenance;
}

// Worldwide Weather & Disaster Alerts (Phase 2)
export type AlertCategory = "OFFICIAL_CAP_WARNING" | "GDACS_DISASTER_ALERT";
export type AlertSeverity = "Extreme" | "Severe" | "Moderate" | "Minor" | "Unknown";
export type ProviderHealthStatus = "CONNECTED" | "UNAVAILABLE" | "STALE";

export type GeographicStatus =
  | "POLYGON_VERIFIED"
  | "COORDINATE_POINT"
  | "TERRITORY_NATIONAL"
  | "LOCATION_UNVERIFIED";

export interface GlobalAlertItem {
  id: string;
  source_provider: string; // WMO SWIC, GDACS, Alert-Hub.org
  alert_type: AlertCategory;
  event: string;
  headline: string;
  severity: AlertSeverity;
  severity_original?: string;
  urgency?: string;
  certainty?: string;
  local_color_code?: string;
  language?: string;
  msg_type?: string;
  issuer: string;
  country_code?: string;
  affected_area: string;
  latitude?: number;
  longitude?: number;
  effective_time?: string;
  expires_time?: string;
  description: string;
  source_url: string;
  distance_km?: number;
  polygons?: string[];
  is_country_wide?: boolean;
  geographic_status?: GeographicStatus;
  status?: string;
  scope?: string;
  references?: string;
}

export interface ProviderHealth {
  provider_name: string;
  status: ProviderHealthStatus;
  total_alerts_fetched: number;
  retrieved_at: string;
  latency_ms: number;
  error_message?: string;
  attribution: string;
}

export interface GlobalAlertsResponse {
  query_country?: string;
  query_latitude?: number;
  query_longitude?: number;
  radius_km?: number;
  total_worldwide_official_warnings: number;
  total_worldwide_disasters: number;
  total_official_warnings: number;
  total_disaster_alerts: number;
  official_cap_warnings: GlobalAlertItem[];
  gdacs_disaster_alerts: GlobalAlertItem[];
  local_verified_warnings?: GlobalAlertItem[];
  country_wide_advisories?: GlobalAlertItem[];
  providers_health: Record<string, ProviderHealth>;
  coverage_notes: string;
  provenance: Provenance;
}

// Legacy / Helper Schemas
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
  applicability_notice?: string;
  provenance: Provenance;
}

export interface OfficialAlertResponse {
  provider_status: string;
  official_agency: string;
  query_location: string;
  district?: string;
  state?: string;
  active_alerts: any[];
  official_portal_url: string;
  ndma_sachet_url: string;
  unavailability_reason?: string;
  setup_instructions?: string;
  provenance: Provenance;
}

// Web Push Notifications & Subscriptions (Phase 3)
export type PushPermissionStatus = "default" | "granted" | "denied" | "unsupported";

export interface PushSubscribePayload {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
  country_code?: string;
  latitude?: number;
  longitude?: number;
  radius_km?: number;
  wants_country_wide?: boolean;
  existing_token?: string;
  categories?: AlertCategory[];
  min_severity?: AlertSeverity;
}

export interface PushSubscribeResponse {
  subscription_id: string;
  possession_token: string;
  endpoint: string;
  categories: AlertCategory[];
  min_severity: AlertSeverity;
  country_code?: string;
  latitude?: number;
  longitude?: number;
  radius_km: number;
  wants_country_wide: boolean;
  created_at: string;
}

export interface PushPreferencesResponse {
  subscription_id: string;
  endpoint: string;
  categories: AlertCategory[];
  min_severity: AlertSeverity;
  country_code?: string;
  latitude?: number;
  longitude?: number;
  radius_km: number;
  wants_country_wide: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface PushPreferencesUpdateRequest {
  categories?: AlertCategory[];
  min_severity?: AlertSeverity;
  country_code?: string;
  latitude?: number;
  longitude?: number;
  radius_km?: number;
  wants_country_wide?: boolean;
  is_active?: boolean;
}

export interface DiagnosticPushTestResponse {
  status: string;
  receipt?: string;
  message?: string;
  note?: string;
}

// Hybrid Multi-Model & Nowcasting Engine (Phases A-K)
export interface ModelMetadata {
  model_id: string;
  name: string;
  agency: string;
  country: string;
  native_resolution_km: number;
  forecast_horizon_days: number;
  status: string;
  notes?: string;
}

export interface ModelForecastPoint {
  time: string;
  temperature_2m: number;
  precipitation?: number | null;
  wind_speed_10m?: number | null;
}

export interface ConsensusPoint {
  time: string;
  consensus_temperature_2m: number;
  median_temperature_2m: number;
  consensus_precipitation?: number | null;
  consensus_wind_speed_10m?: number | null;
  temperature_spread_min: number;
  temperature_spread_max: number;
  temperature_std_dev: number;
  precipitation_spread_max?: number | null;
  models_reporting: string[];
  disagreement_level: "LOW" | "MODERATE" | "HIGH" | "INSUFFICIENT_MODELS";
}

export interface MultiModelResponse {
  latitude: number;
  longitude: number;
  elevation?: number;
  timezone: string;
  models_available: ModelMetadata[];
  consensus_hourly: ConsensusPoint[];
  models_series: Record<string, ModelForecastPoint[]>;
  provenance: Provenance;
}

export interface StationObservation {
  station_id: string;
  station_name: string;
  latitude: number;
  longitude: number;
  elevation_m?: number;
  distance_km?: number;
  observation_time: string;
  temperature_c?: number;
  dewpoint_c?: number;
  relative_humidity?: number;
  wind_speed_kmh?: number;
  wind_direction_deg?: number;
  visibility_km?: number;
  pressure_hpa?: number;
  weather_condition?: string;
  flight_category?: string;
  qc_passed: boolean;
  raw_metar: string;
  source_network: string;
}

export interface NearbyObservationResponse {
  query_latitude: number;
  query_longitude: number;
  observation?: StationObservation | null;
  model_comparison?: {
    model_temp_c: number;
    observed_temp_c: number;
    temp_bias_c: number;
    station_distance_km: number;
  } | null;
  status: "OBSERVATION_FOUND" | "NO_STATION_WITHIN_RANGE" | "STATION_OFFLINE";
  provenance: Provenance;
}

export interface RadarFrame {
  timestamp: number;
  iso_time: string;
  tile_path: string;
  frame_type: "past" | "nowcast";
}

export interface NowcastInterval {
  time: string;
  lead_minutes: number;
  estimated_precipitation_rate_mmh: number;
  trend: "STEADY" | "INTENSIFYING" | "WEAKENING" | "CLEAR";
  method: "RADAR_EXTRAPOLATION" | "NWP_DEGRADATION";
}

export interface RadarNowcastResponse {
  latitude: number;
  longitude: number;
  radar_status: "ACTIVE" | "ACTIVE_HISTORICAL_MOSAIC_ONLY" | "OUTSIDE_GROUND_RADAR_COVERAGE" | "DEGRADED_OUT_OF_RADAR_COVERAGE" | "DEGRADED_UNAVAILABLE";
  host: string;
  recent_frames: RadarFrame[];
  nowcast_intervals: NowcastInterval[];
  coverage_note: string;
  provenance: Provenance;
}
