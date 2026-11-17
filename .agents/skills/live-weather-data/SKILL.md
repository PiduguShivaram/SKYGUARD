---
name: live-weather-data
description: Live geocoding and weather API integration standards, provenance tracking, rate limiting, and zero-fabrication error handling.
---

# Live Weather Data Skill

## Upstream Providers
- Primary Numerical Weather Prediction (NWP): **Open-Meteo API** (Free for non-commercial open data; best match models: ECMWF IFS, GFS, ICON).
- Geocoding: **Open-Meteo Geocoding API** (`geocoding-api.open-meteo.com/v1/search`).

## Checklist & Invariants
- [ ] No hardcoded default locations (e.g. do not default to London or New York on boot without user choice). Prompt user to search or share location.
- [ ] Provenance Metadata: Every response must attach:
  - `provider`: "Open-Meteo"
  - `retrieved_at`: ISO 8601 UTC timestamp
  - `timezone`: Local timezone of the requested coordinate
  - `elevation`: Elevation in meters above sea level
  - `coordinates`: Exact latitude and longitude queried
- [ ] Parameter Mapping:
  - Current: `temperature_2m`, `relative_humidity_2m`, `apparent_temperature`, `weather_code`, `wind_speed_10m`, `wind_direction_10m`, `is_day`, `precipitation`
  - Hourly: `temperature_2m`, `precipitation_probability`, `precipitation`, `weather_code`, `wind_speed_10m`
  - Daily: `temperature_2m_max`, `temperature_2m_min`, `precipitation_sum`, `precipitation_probability_max`, `wind_gusts_10m_max`, `uv_index_max`, `sunrise`, `sunset`
- [ ] Strict Error Recovery:
  - Catch network timeouts (`httpx.TimeoutException`) -> Return 504 with explanation.
  - Catch upstream 4xx/5xx responses -> Return 502 Bad Gateway with provider details.
  - Empty geocoding results -> Return empty array with zero hallucinated place suggestions.
