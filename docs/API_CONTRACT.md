# SkyGuard — API Contract (Phase 1, 2 & 3 Deliverables)

## 1. Overview
The SkyGuard API provides live, server-side proxied access to:
1. **Open-Meteo Geocoding and NWP Weather Forecasts** (`https://api.open-meteo.com` & `https://geocoding-api.open-meteo.com`).
2. **WMO SWIC Global Severe Weather Information Centre** (`https://severeweather.wmo.int/json/wmo_all.json`) for official Common Alerting Protocol (CAP) bulletins from national meteorological services worldwide.
3. **GDACS Global Disaster Alert and Coordination System** (`https://www.gdacs.org/gdacsapi/api/events/geteventlist/SEARCH?format=geojson`) by UN OCHA and the European Commission for multi-hazard disaster events (tropical cyclones, floods, earthquakes, droughts, volcanic activity, wildfires).
4. **Alert-Hub.org International Emergency Stream** (`https://cap-alerts.s3.amazonaws.com/unfiltered/rss.xml`) aggregating real-time CAP RSS feeds.
5. **Privacy-Preserving Web Push Notification System (Phase 3)**: Possession-bound browser Web Push subscriptions via VAPID RFC 8292 with SSRF defense and deduplicated alert matching.

It strictly enforces zero-fabrication, full provenance tracking, and explicit units.

---

## 2. Weather & Geocoding Endpoints

### 2.1 GET `/api/health`
Returns service operational status and upstream connectivity diagnostics for Open-Meteo, GDACS, WMO SWIC, and Alert-Hub.

---

### 2.2 GET `/api/v1/locations`
Performs live place search against the Open-Meteo Geocoding API (`https://geocoding-api.open-meteo.com/v1/search`).

---

### 2.3 GET `/api/v1/weather`
Fetches a genuine 7-day daily and hourly forecast from the Open-Meteo NWP Forecast API (`https://api.open-meteo.com/v1/forecast`).

---

## 3. Global Weather & Disaster Alerts Endpoints (Phase 2 & 3)

### 3.1 GET `/api/v1/alerts`
Retrieves verified active alerts with pagination, category, and minimum severity filtering.

**Query Parameters**:
- `country_code` (string, optional): Two-letter ISO-3166 country filter (e.g. `IN`, `US`, `DE`).
- `category` (string, optional): Filter by `OFFICIAL_CAP_WARNING` or `GDACS_DISASTER_ALERT`.
- `min_severity` (string, optional): Filter threshold: `Moderate`, `Severe`, or `Extreme`.
- `limit` (int, default: 50, min: 1, max: 200): Page size.
- `offset` (int, default: 0): Page offset.

---

### 3.2 GET `/api/v1/alerts/{alert_id}`
Retrieves full details of a specific authentic alert by identifier from the database cache or live upstream feed.

**Response Schema (`200 OK`)**:
```json
{
  "id": "AlertHub-280ff0f9-602e-577e-825d-675dc5cc0fae",
  "source_provider": "Alert-Hub.org",
  "alert_type": "OFFICIAL_CAP_WARNING",
  "event": "Yellow Warning for Road Ice and Snow",
  "headline": "Aihui District Meteorological Observatory issues yellow warning",
  "severity": "Unknown",
  "severity_original": "Original CAP severity not provided in RSS feed summary; inspect raw CAP XML",
  "issuer": "Official National Meteorological Service",
  "country_code": "CN",
  "affected_area": "Aihui District",
  "latitude": 50.25,
  "longitude": 127.50,
  "polygons": ["50.20,127.40 50.30,127.40 50.30,127.60 50.20,127.60"],
  "is_country_wide": false,
  "geographic_status": "POLYGON_VERIFIED",
  "effective_time": "2026-11-17T15:58:00Z",
  "expires_time": "2026-11-18T16:00:00Z",
  "description": "Roads will freeze and remain icy...",
  "source_url": "https://severeweather.wmo.int/v2/cap/..."
}
```

---

### 3.3 GET `/api/v1/alerts/global`
Concurrent multi-provider worldwide alert aggregation and proximity search across WMO SWIC, GDACS, and Alert-Hub.org.

---

## 4. Privacy-Preserving Web Push Notification Endpoints (Phase 3)

### 4.1 GET `/api/v1/push/vapid-public-key`
Returns the server's NIST P-256 public key in uncompressed URL-safe base64 format for browser `PushManager.subscribe({ applicationServerKey })`.

**Response Schema (`200 OK`)**:
```json
{
  "public_key": "BOsfa0k4VtfLkg7Oqx6pDt5m-UUI-ZECJjwlekMcFc1xNPb_ofBD0oupGHBSKWUpCa6sBH9p9nBIrxDHf6-kAro"
}
```

---

### 4.2 POST `/api/v1/push/subscribe`
Registers or updates a browser push subscription. Generates and returns a secret possession token (`sub_tok_...`) required for future modifications.

**Security Controls**:
- **SSRF Defense**: Validates endpoint domain against approved browser push gateways (`fcm.googleapis.com`, `*.push.services.mozilla.com`, `*.push.apple.com`, `*.notify.windows.com`), enforces HTTPS on port 443, and performs DNS resolution checks blocking private, loopback, link-local, and reserved IP addresses.
- **Anti-Takeover Protection**: Re-registering or updating an existing active push endpoint strictly requires passing `existing_token` matching the stored SHA-256 hash. Unauthorized takeover attempts return `HTTP 409 Conflict`.
- **Sliding Window Rate Limiting**: Enforces max 10 registration requests per minute per IP.
- **Geographic Scope Opt-In**: `wants_country_wide` boolean allows voluntary opt-in for nationwide bulletins.

**Request Schema**:
```json
{
  "endpoint": "https://fcm.googleapis.com/fcm/send/device_token_xyz",
  "keys": {
    "p256dh": "BNcRdreALRF...",
    "auth": "tB3jQx..."
  },
  "country_code": "IN",
  "latitude": 17.9784,
  "longitude": 79.6005,
  "radius_km": 500.0,
  "wants_country_wide": false,
  "existing_token": null,
  "categories": ["OFFICIAL_CAP_WARNING", "GDACS_DISASTER_ALERT"],
  "min_severity": "Moderate"
}
```

**Response Schema (`201 Created`)**:
```json
{
  "subscription_id": "a8fab057-1328-41cc-a5e4-de2617615393",
  "possession_token": "sub_tok_NyNslZP...",
  "endpoint": "https://fcm.googleapis.com/fcm/send/device_token_xyz",
  "categories": ["OFFICIAL_CAP_WARNING", "GDACS_DISASTER_ALERT"],
  "min_severity": "Moderate",
  "country_code": "IN",
  "latitude": 17.9784,
  "longitude": 79.6005,
  "radius_km": 500.0,
  "wants_country_wide": false,
  "created_at": "2026-11-17T09:00:00Z"
}
```

---

### 4.3 DELETE `/api/v1/push/subscriptions/{subscription_id}`
Deactivates and removes subscription from server.
- **Required Header**: `X-Subscription-Token: <possession_token>`

**Response Schema (`200 OK`)**:
```json
{
  "status": "UNSUBSCRIBED",
  "subscription_id": "a8fab057-1328-41cc-a5e4-de2617615393"
}
```

---

### 4.4 GET `/api/v1/push/preferences`
Retrieves active preferences for the authenticated possession token.
- **Required Header**: `X-Subscription-Token: <possession_token>`

---

### 4.5 PUT `/api/v1/push/preferences`
Updates alert categories, minimum severity, or location filtering preferences.
- **Required Header**: `X-Subscription-Token: <possession_token>`

---

### 4.6 POST `/api/v1/push/test`
Dispatches an explicitly labeled diagnostic push notification containing **no weather claim** to verify browser Web Push delivery end-to-end. Rate limited to 5 requests per minute.
- **Required Header**: `X-Subscription-Token: <possession_token>`

**Diagnostic Payload Content**:
```json
{
  "id": "diagnostic-test",
  "title": "SkyGuard Push Notification System — Diagnostic Test",
  "body": "Operational check: Web Push delivery is functional. This is a technical diagnostic notification and contains NO weather or disaster hazard claim.",
  "tag": "skyguard-diagnostic-test"
}
```

---

### 4.7 POST `/api/v1/push/dispatch-sync`
Triggers an on-demand synchronization pass across active genuine feeds (WMO SWIC, GDACS), matches against active subscriptions using Shapely Point-in-Polygon verification, and dispatches encrypted Web Push messages.
- **Authorization Required**: Header `X-Worker-Key: <INTERNAL_WORKER_KEY>` matching backend configuration. Unauthorized requests return `HTTP 403 Forbidden`.
- **Delivery Guarantees**:
  - Differentiates Gateway Acceptance (`GATEWAY_ACCEPTED`) from client display; records gateway receipts (`HTTP_201`).
  - Implements exponential backoff retry scheduling for transient failures (HTTP 429, 5xx).
  - Automatically deactivates permanently dead subscriptions (HTTP 404, 410).
