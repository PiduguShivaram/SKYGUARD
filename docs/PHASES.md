# SkyGuard — Implementation Phases & Roadmap

## Phase 0: Workspace Contracts & Repository Architecture
- [x] Establish `AGENTS.md`, `.agents/rules/`, and `.agents/skills/`.
- [x] Ingest and register all 10 project skills.
- [x] Formulate architecture, data source specifications, acceptance criteria, and status tracking docs.
- [x] Initialize monorepo structure: `apps/web` (Next.js 14+ / TypeScript) and `services/api` (FastAPI / Python 3.12).
- [x] Set up environment variable templates (`.env.example`) with empty secrets.

## Phase 1: Live Weather Vertical Slice (MVP Core)
- [x] Implement backend FastAPI service with async HTTPX Open-Meteo client.
- [x] Implement geocoding place search endpoint (`/api/v1/locations`).
- [x] Implement forecast endpoint with current, hourly (24-48h), and daily (7-day) data with strict provenance metadata (`/api/v1/weather`).
- [x] Implement Next.js frontend with:
  - Debounced search bar and popular cities chips.
  - Live Current Weather hero card with WMO weather condition icons and real-time metrics.
  - Authentic 24-hour hourly trend chart (temperature and precipitation probability curves).
  - 7-day daily forecast cards with high/low temperatures, precipitation totals, and wind gusts.
- [x] Rigorous error handling: timeouts, upstream 5xx, invalid coordinates, offline notifications.

## Phase 2: Global Weather & Disaster Alerts Architecture
- [x] Worldwide severe weather Common Alerting Protocol (CAP) and disaster monitoring architecture.
- [x] Live WMO Severe Weather Information Centre (SWIC) adapter (`/api/v1/alerts/wmo`).
- [x] Live UN OCHA / European Commission GDACS GeoJSON adapter (`/api/v1/alerts/gdacs`).
- [x] Live Alert-Hub.org emergency CAP RSS stream adapter (`/api/v1/alerts/alerthub`).
- [x] Multi-provider concurrent aggregator (`/api/v1/alerts/global`).
- [x] Frontend `GlobalAlertsPanel` with provider health indicators, distance calculation, categorical tabs, and honest coverage limitation notices.

## Phase 3: Scientific Derived Risk Indicators
- [x] Deterministic risk assessment engine (`/api/v1/risk/evaluate`) based on physical IMD, WMO, and NDMA thresholds.
- [x] Categorical separation from official warnings in UI with prominent `EXPERIMENTAL` badges.
- [x] Transparent physical evidence and authoritative guidance basis on every hazard signal.

## Phase 4: Gated Farmer Mode
- [x] Public Mode vs Farmer Mode switcher in sticky header navigation.
- [x] Standing crop selection (Paddy, Cotton, Maize, Wheat, Soybean, Tomato) and sowing date calculation.
- [x] Forecast-based agrometeorological watches (extended dry-spell, waterlogging, crop thermal stress).
- [x] Strict hardware gating badges (`DISCONNECTED` for soil moisture telemetry, `GATED` for Sentinel-2 satellite NDVI and unvalidated plot yield estimators).

## Phase 5: Verification, Quality Assurance & Delivery
- [x] Pytest suite covering all schemas, endpoints, risk engine, farmer engine, and live upstream feeds (19/19 passed).
- [x] Live integration smoke test script (`scripts/check_live.py`).
- [x] Playwright browser end-to-end automation (`tests/test_browser_e2e.py`) verifying both Public Mode and Farmer Mode.
- [x] Complete documentation: `docs/API_CONTRACT.md`, `docs/IMPLEMENTATION_STATUS.md`, and `docs/PHASES.md`.
