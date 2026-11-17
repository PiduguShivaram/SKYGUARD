# SkyGuard — API Contract (Phase 1 Deliverable)

## 1. Overview
The SkyGuard API provides live, server-side proxied access to Open-Meteo Geocoding and Numerical Weather Prediction (NWP) forecast models. It guarantees zero-fabrication, full provenance tracking, and explicit units.

## 2. Endpoints

### 2.1 GET `/health`
Returns service operational status and upstream Open-Meteo connectivity diagnostics.

**Response Schema (`200 OK`)**:
```json
{
  "status": "HEALTHY",
  "service": "SkyGuard API",
  "version": "1.0.0",
  "server_utc_time": "2026-11-17T07:30:00Z",
  "upstream_providers": {
    "open_meteo": "REACHABLE"
  }
}
```

---

### 2.2 GET `/api/v1/locations`
Performs live place search against the Open-Meteo Geocoding API (`https://geocoding-api.open-meteo.com/v1/search`).

**Query Parameters**:
- `q` (string, required, min_length: 2): City, town, or location query.
- `count` (int, optional, default: 5, min: 1, max: 20): Maximum results to return.
- `country_code` (string, optional, default: "IN"): Two-letter ISO-3166 country filter (or empty for global).

**Response Schema (`200 OK`)**:
```json
{
  "query": "Warangal",
  "count": 1,
  "results": [
    {
      "id": 1253986,
      "name": "Warangal",
      "latitude": 17.9784,
      "longitude": 79.6005,
      "elevation": 274.0,
      "country_code": "IN",
      "country": "India",
      "admin1": "Telangana",
      "admin2": "Warangal",
      "timezone": "Asia/Kolkata",
      "formatted_label": "Warangal, Telangana, India"
    }
  ],
  "provenance": {
    "provider": "Open-Meteo Geocoding API",
    "attribution_url": "https://open-meteo.com/en/docs/geocoding-api",
    "disclaimer": "Geocoding data provided by Open-Meteo via OpenStreetMap and GeoNames.",
    "retrieved_at": "2026-11-17T07:30:00Z"
  }
}
```

---

### 2.3 GET `/api/v1/weather`
Fetches a genuine 7-day daily and hourly forecast from the Open-Meteo NWP Forecast API (`https://api.open-meteo.com/v1/forecast`).

**Query Parameters**:
- `latitude` (float, required, -90.0 to 90.0): Target latitude.
- `longitude` (float, required, -180.0 to 180.0): Target longitude.

**Response Schema (`200 OK`)**:
```json
{
  "requested_latitude": 17.9784,
  "requested_longitude": 79.6005,
  "latitude": 17.961,
  "longitude": 79.592,
  "elevation": 274.0,
  "timezone": "Asia/Kolkata",
  "timezone_abbreviation": "IST",
  "utc_offset_seconds": 19800,
  "units": {
    "temperature": "°C",
    "relative_humidity": "%",
    "apparent_temperature": "°C",
    "precipitation": "mm",
    "wind_speed": "km/h",
    "wind_gusts": "km/h"
  },
  "current": {
    "time": "2026-11-17T12:45",
    "temperature_2m": 31.4,
    "relative_humidity_2m": 42.0,
    "apparent_temperature": 32.8,
    "is_day": 1,
    "precipitation": 0.0,
    "weather_code": 1,
    "weather_description": "Mainly clear",
    "weather_icon": "mostly-clear",
    "wind_speed_10m": 8.6,
    "wind_direction_10m": 94.0
  },
  "hourly": [
    {
      "time": "2026-11-17T00:00",
      "temperature_2m": 22.1,
      "precipitation_probability": 0.0,
      "precipitation": 0.0,
      "weather_code": 1,
      "weather_description": "Mainly clear",
      "wind_speed_10m": 5.2
    }
  ],
  "daily": [
    {
      "date": "2026-11-17",
      "weather_code": 1,
      "weather_description": "Mainly clear",
      "weather_icon": "mostly-clear",
      "temperature_2m_max": 33.2,
      "temperature_2m_min": 19.4,
      "precipitation_sum": 0.0,
      "precipitation_probability_max": 0.0,
      "wind_gusts_10m_max": 22.0,
      "uv_index_max": 7.4,
      "sunrise": "2026-11-17T06:21",
      "sunset": "2026-11-17T17:39"
    }
  ],
  "provenance": {
    "provider": "Open-Meteo",
    "source_model": "Seamless Multi-Model NWP (ECMWF IFS / GFS / ICON)",
    "attribution_url": "https://open-meteo.com/en/docs",
    "disclaimer": "Numerical model forecast. NOT an official national emergency warning.",
    "retrieved_at": "2026-11-17T07:30:00Z"
  }
}
```

---

### 2.4 Error Codes
- `400 Bad Request`: Query too short or invalid latitude/longitude.
- `502 Bad Gateway`: Upstream Open-Meteo service returned an error.
- `504 Gateway Timeout`: Upstream request timed out.
