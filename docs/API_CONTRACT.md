# SkyGuard — API Contract (Phase 1 & Phase 2 Deliverable)

## 1. Overview
The SkyGuard API provides live, server-side proxied access to:
1. **Open-Meteo Geocoding and NWP Weather Forecasts** (`https://api.open-meteo.com` & `https://geocoding-api.open-meteo.com`).
2. **WMO SWIC Global Severe Weather Information Centre** (`https://severeweather.wmo.int/json/wmo_all.json`) for official Common Alerting Protocol (CAP) bulletins from national meteorological services worldwide.
3. **GDACS Global Disaster Alert and Coordination System** (`https://www.gdacs.org/gdacsapi/api/events/geteventlist/SEARCH?format=geojson`) by UN OCHA and the European Commission for multi-hazard disaster events (tropical cyclones, floods, earthquakes, droughts, volcanic activity, wildfires).
4. **Alert-Hub.org International Emergency Stream** (`https://cap-alerts.s3.amazonaws.com/unfiltered/rss.xml`) aggregating real-time CAP RSS feeds.

It strictly enforces zero-fabrication, full provenance tracking, and explicit units.

---

## 2. Weather & Geocoding Endpoints

### 2.1 GET `/api/health`
Returns service operational status and upstream connectivity diagnostics for Open-Meteo, GDACS, WMO SWIC, and Alert-Hub.

**Response Schema (`200 OK`)**:
```json
{
  "status": "HEALTHY",
  "service": "SkyGuard API",
  "version": "1.0.0",
  "server_utc_time": "2026-11-17T07:55:48Z",
  "upstream_providers": {
    "open_meteo": "REACHABLE",
    "gdacs": "REACHABLE",
    "wmo_swic": "REACHABLE",
    "alert_hub": "REACHABLE"
  }
}
```

---

### 2.2 GET `/api/v1/locations`
Performs live place search against the Open-Meteo Geocoding API (`https://geocoding-api.open-meteo.com/v1/search`).

**Query Parameters**:
- `q` (string, required, min_length: 2): City, town, or location query.
- `count` (int, optional, default: 5, min: 1, max: 20): Maximum results to return.
- `country_code` (string, optional): Two-letter ISO-3166 country filter (or empty for global).

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

---

## 3. Global Weather & Disaster Alerts Endpoints (Phase 2)

### 3.1 GET `/api/v1/alerts/global`
Concurrent multi-provider worldwide alert aggregation and proximity search. Aggregates official national CAP warnings (WMO SWIC, Alert-Hub) and international disaster events (GDACS).

**Query Parameters**:
- `country_code` (string, optional): Two-letter ISO-3166 country code filter (e.g. `US`, `IN`, `JP`, `DE`).
- `latitude` (float, optional, -90.0 to 90.0): Spatial query latitude.
- `longitude` (float, optional, -180.0 to 180.0): Spatial query longitude.
- `radius_km` (float, optional, default: 1500.0, max: 20000.0): Search radius in kilometers.

**Response Schema (`200 OK`)**:
```json
{
  "query_country": "US",
  "query_latitude": 40.7128,
  "query_longitude": -74.0060,
  "radius_km": 1500.0,
  "total_official_warnings": 1292,
  "total_disaster_alerts": 83,
  "official_cap_warnings": [
    {
      "id": "wmo-us-nws-20261117-001",
      "source_provider": "WMO SWIC",
      "alert_type": "OFFICIAL_CAP_WARNING",
      "event": "Special Weather Statement",
      "headline": "Special Weather Statement issued for Hudson Valley",
      "severity": "Moderate",
      "severity_original": "3",
      "issuer": "US National Weather Service (NWS)",
      "country_code": "US",
      "affected_area": "Southern Westchester, New York",
      "latitude": 41.03,
      "longitude": -73.76,
      "effective_time": "2026-11-17T07:15:00Z",
      "expires_time": "2026-11-17T18:00:00Z",
      "description": "Gusty winds and falling temperatures...",
      "source_url": "https://severeweather.wmo.int/v2/cap/us-nws-001.xml",
      "distance_km": 42.1
    }
  ],
  "gdacs_disaster_alerts": [
    {
      "id": "gdacs-tc-1001234",
      "source_provider": "GDACS (UN OCHA / European Commission)",
      "alert_type": "GDACS_DISASTER_ALERT",
      "event": "Tropical Cyclone",
      "headline": "Tropical Cyclone AKVAN-26 in Arabian Sea",
      "severity": "Severe",
      "severity_original": "Orange",
      "issuer": "Global Disaster Alert and Coordination System",
      "country_code": "IN",
      "affected_area": "Gujarat / Arabian Sea",
      "latitude": 20.15,
      "longitude": 68.42,
      "effective_time": "2026-11-16T12:00:00Z",
      "expires_time": "2026-11-19T00:00:00Z",
      "description": "Tropical Cyclone AKVAN-26 with maximum sustained wind speeds reaching 120 km/h.",
      "source_url": "https://www.gdacs.org/report.aspx?eventid=1001234&eventtype=TC",
      "distance_km": 1250.0
    }
  ],
  "providers_health": {
    "gdacs": {
      "provider_name": "GDACS",
      "status": "CONNECTED",
      "total_alerts_fetched": 83,
      "retrieved_at": "2026-11-17T07:55:55Z",
      "latency_ms": 1456.5,
      "attribution": "UN OCHA & European Commission (https://www.gdacs.org)"
    },
    "wmo_swic": {
      "provider_name": "WMO SWIC",
      "status": "CONNECTED",
      "total_alerts_fetched": 2143,
      "retrieved_at": "2026-11-17T07:55:54Z",
      "latency_ms": 431.2,
      "attribution": "World Meteorological Organization (https://severeweather.wmo.int)"
    },
    "alert_hub": {
      "provider_name": "Alert-Hub.org",
      "status": "CONNECTED",
      "total_alerts_fetched": 100,
      "retrieved_at": "2026-11-17T07:55:55Z",
      "latency_ms": 1419.8,
      "attribution": "Alert-Hub.org (https://alert-hub.org)"
    }
  },
  "coverage_notes": "SkyGuard aggregates genuine international severe weather feeds: official CAP bulletins from WMO-registered National Meteorological Services, Alert-Hub.org international emergency feeds, and UN OCHA / European Commission GDACS global disaster monitoring. Absence of active warnings for a coordinate or country does NOT signify 'All Clear' or 'No Danger'. Always consult your local national civil protection and emergency management agencies.",
  "provenance": {
    "provider": "WMO SWIC, GDACS, Alert-Hub.org",
    "attribution_url": "https://severeweather.wmo.int",
    "disclaimer": "Aggregated genuine public emergency feeds. Not a substitute for official local civil protection mandates.",
    "retrieved_at": "2026-11-17T07:55:55Z"
  }
}
```

---

### 3.2 Individual Adapter Endpoints
- **GET `/api/v1/alerts/gdacs`**: Direct access to GDACS multi-hazard disaster feed.
- **GET `/api/v1/alerts/wmo`**: Direct access to WMO SWIC international CAP warnings.
- **GET `/api/v1/alerts/alerthub`**: Direct access to Alert-Hub.org unfiltered CAP feed.

---

## 4. Error Codes & Invariants
- `400 Bad Request`: Query parameter invalid or coordinates out of range.
- `502 Bad Gateway`: Upstream feed unparseable or connectivity error.
- `504 Gateway Timeout`: Upstream provider exceeded timeout threshold.
- **Zero Fabrication Invariant**: If no alerts are active for a region, the list is empty and `coverage_notes` explains that absence does not signify "All Clear" or "No Danger". No fake alerts or synthetic mock badges are permitted.
