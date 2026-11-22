# SkyGuard — Final Product Scope

## 1. Product Mission & Vision

**SkyGuard** is a personalized predictive weather and climate intelligence platform designed to help everyday citizens and farmers anticipate environmental hazards, understand their potential impact, and take informed preventive actions.

SkyGuard is:
- **Personalized & Local**: Delivers authentic weather intelligence and authoritative emergency alerts for the user's specific location.
- **Predictive & Explainable**: Provides transparent forecast-derived risk assessments based on scientifically documented thresholds (WMO/IMD).
- **Authoritative & Verified**: Preserves official CAP (Common Alerting Protocol) warnings from recognized national authorities (e.g., IMD, WMO SWIC, GDACS).
- **Agriculturally Grounded**: Features a dedicated Agricultural Weather Intelligence module (Farmer Mode) with crop-specific watches citing ICAR-AICRPAM and FAO guidelines.
- **Honest & Uncompromising**: Adheres strictly to the Zero Fake Data invariant. When data is unavailable or sensors are uncalibrated, it displays a clear, honest explanation rather than synthetic placeholders.

---

## 2. Core Modules

### Module 1: Genuine Real-Time Weather Intelligence
- **Provider**: Open-Meteo numerical weather prediction (NWP) API.
- **Coverage**: Global coordinate search and geolocation.
- **Metrics**: Temperature, feels-like, humidity, precipitation rate, wind speed & direction, atmospheric pressure, dew point, cloud cover, UV index, and sunrise/sunset.
- **Forecast Horizon**: Next 24/48 hours (hourly) and 7 days (daily outlook).
- **Provenance**: Explicit source attribution, grid resolution, and valid forecast timestamp.

### Module 2: Official Emergency Warnings & Global Disaster Monitoring
- **Providers**: World Meteorological Organization (WMO) SWIC, Alert-Hub.org, and UN OCHA / European Commission GDACS.
- **Standards**: OASIS Common Alerting Protocol (CAP 1.2) XML and JSON feeds.
- **Lifecycle Engine**: Complete handling of `Alert`, `Update`, and `Cancel` message types with `<references>` resolution and expiration filtering.
- **Spatial Segregation**:
  - `local_verified_warnings`: Strictly matched by polygon or radius coordinates.
  - `country_wide_advisories`: National bulletins or location-unverified notices.
- **Separation**: Global disaster radar and international CAP bulletins reside on a dedicated `/disasters` page to prevent overwhelming local users.

### Module 3: Explainable Predictive Weather Risk Engine
- **Hazards**: Extreme heatwave, heavy rainfall/waterlogging, gale-force winds.
- **Methodology**: Transparent deterministic rules derived from daily and hourly forecasts.
- **Scientific Attribution**: Cites WMO No. 522 and IMD operational classification manuals.
- **Actionable Guidance**: Practical preventive safety advice directly correlated to the hazard.

### Module 4: Web Push Notification Center
- **Protocol**: Voluntary user consent conforming to RFC 8292 (VAPID).
- **Security**: Strict SSRF defense on push gateways, cryptographic possession tokens (`sub_tok_...`) preventing subscription hijacking.
- **Delivery Integrity**: Audit persistence capturing actual push gateway response headers (`gateway_receipt`).
- **Preferences**: Configurable category and severity filters (`Moderate`, `Severe`, `Extreme`).

### Module 5: Agricultural Weather Intelligence (Farmer Mode)
- **Supported Crops**: Paddy, Cotton, Maize, Wheat, Soybean, Tomato.
- **Agronomic Rules**: Growth stage estimation based on sowing date, thermal comfort thresholds, water-balance requirements, dry-spell detection, excess rainfall alerts, and spray suitability windows.
- **Scientific Foundation**: Grounded in ICAR-AICRPAM and FAO Irrigation & Drainage Paper 56.
- **Gating**: Uncalibrated physical IoT sensors and field yield models are explicitly marked as `GATED` or `DISCONNECTED`.

---

## 3. Information Architecture

| Route | View Name | Purpose |
| :--- | :--- | :--- |
| `/` | **Personalized Weather Intelligence** | Current conditions, 24h diurnal timeline scrubber, 7-day outlook, personalized risk assessment, preventive recommendations, and verified local warnings. |
| `/disasters` | **Planetary Disaster Radar** | Interactive 3D Earth Globe and international WMO SWIC / GDACS multi-hazard disaster feed. |
| `/classic` | **Classic Observatory Dashboard** | Legacy dashboard maintained for backward compatibility. |
| `/api/v1/*` | **FastAPI Backend Services** | Weather, alerts, risk evaluation, farmer engine, push subscription, and provider health. |

---

## 4. Non-Negotiable Invariants

1. **Zero Synthetic / Fabricated Data**: No placeholder charts, synthetic soil moisture, or defaulting missing values to `0.0`.
2. **Strict Attribution**: Every meteorological value and warning carries source attribution, retrieval timestamp, and valid time.
3. **Categorical Separation**: Never label an experimental risk assessment or global disaster report as an official local emergency warning.
4. **Honest Failure States**: If an upstream service is down, display an honest 502 Bad Gateway or clear explanation.
5. **No Image Binaries in Git**: All screenshots and images must remain untracked and excluded from git pushes.
