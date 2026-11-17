# SkyGuard — Implementation Phases & Roadmap

## Phase 0: Workspace Contracts & Repository Architecture
- [x] Establish `AGENTS.md`, `.agents/rules/`, and `.agents/skills/`.
- [x] Ingest and register all 10 project skills.
- [x] Formulate architecture, data source specifications, acceptance criteria, and status tracking docs.
- [ ] Initialize monorepo structure: `apps/web` (Next.js 14+ / TypeScript) and `services/api` (FastAPI / Python 3.12).
- [ ] Set up environment variable templates (`.env.example`) with empty secrets.

## Phase 1: Live Weather Vertical Slice (MVP Core)
- [ ] Implement backend FastAPI service with async HTTPX Open-Meteo client.
- [ ] Implement geocoding place search endpoint (`/api/v1/geo/search`).
- [ ] Implement forecast endpoint with current, hourly (24-48h), and daily (7-day) data with strict provenance metadata (`/api/v1/weather/forecast`).
- [ ] Implement Next.js frontend with:
  - Debounced search bar and opt-in Geolocation button.
  - Live Current Weather hero card with WMO weather condition icons and real-time metrics.
  - Authentic 24-hour hourly trend chart (temperature and precipitation probability curves).
  - 7-day daily forecast cards with high/low temperatures, precipitation totals, and wind gusts.
- [ ] Rigorous error handling: timeouts, upstream 5xx, invalid coordinates, offline notifications.

## Phase 2: Official Authoritative Alerts Integration
- [ ] Implement IMD / NDMA alert ingestion endpoint (`/api/v1/alerts/imd`).
- [ ] Support district/state geocoding to alert boundaries.
- [ ] Distinct visual alerts component in frontend with verified color-coded warning levels (Red, Orange, Yellow).
- [ ] Implement honest `SERVICE_UNAVAILABLE` / `NOT_CONNECTED` state with direct links to official portals (mausam.imd.gov.in, sachet.ndma.gov.in) when API is unauthenticated or unreachable.

## Phase 3: Scientific Derived Risk Indicators
- [ ] Implement deterministic risk assessment engine (`/api/v1/risk/evaluate`) based on IMD, WMO, and NDMA thresholds.
- [ ] Separate derived indicators from official alerts in UI with clear "Experimental Non-Official" labeling.
- [ ] Pair each signal with physical evidence and authoritative guidance.

## Phase 4: Gated Farmer Mode
- [ ] Implement Farmer Mode toggle and state management.
- [ ] Support crop selection (Paddy, Cotton, Maize, Wheat, Soybean, Tomato) and sowing date tracking.
- [ ] Compute forecast-based agricultural watches (dry-spell, excessive moisture, extreme heat).
- [ ] Display prominent gating badges for unconfigured in-situ soil moisture sensors, satellite indices (NDVI), and unvalidated yield loss estimators.

## Phase 5: Verification, Quality Assurance & Delivery
- [ ] Unit tests for risk engine and schemas with pytest.
- [ ] Live integration smoke tests against real Open-Meteo and IMD endpoints.
- [ ] Frontend build verification (`next build`) and end-to-end browser smoke testing.
- [ ] Complete `docs/IMPLEMENTATION_STATUS.md` with verified execution logs and local launch runbook.
