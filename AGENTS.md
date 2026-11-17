# SkyGuard — Autonomous Agent Working Agreement & Repository Contract

## Mission
Build and maintain SkyGuard: an accessible, trustworthy, real-time public weather intelligence and verified official emergency warning platform with an optional, strictly gated Farmer Mode.

## Absolute Data Integrity Invariants (Non-Negotiable)
1. **Zero Fake/Synthetic Live Data**: Never render or seed placeholder charts, demo alerts, hand-entered temperatures, synthetic soil moisture, or randomly generated risk percentages in product mode.
2. **Attribution & Provenance**: Every observation, forecast, and warning field must carry explicit source attribution (`provider`), retrieval timestamp (`retrieved_at`), temporal validity (`valid_time` or `period`), unit specifications, and timezone.
3. **Categorical Separation**: Maintain strict separation across UI, API schemas, and logs between:
   - Official Authoritative Warnings (e.g., IMD, NDMA, State Disaster Management Authorities)
   - Model Forecasts (e.g., Open-Meteo / ECMWF / GFS)
   - Real-time Sensor Observations
   - Experimental Derived Risk Indicators (transparent deterministic heuristics)
   - Agronomic Advisories
   *Never label an experimental derived indicator or model forecast as an official IMD warning.*
4. **Honest Failure & Unavailability**: When an upstream provider is unavailable, down, rate-limited, unauthenticated, or lacks coverage for a coordinate, render a clear, actionable unavailability state explaining why. An empty warning response from an unconnected provider must NEVER be shown as "No warnings / Safe".
5. **No Hallucinated Science**: Do not invent thresholds, model accuracy metrics, yield predictions, field-level spatial resolutions, or satellite refresh frequencies.
6. **Testing Isolation**: Mocked HTTP responses or synthetic fixtures are strictly confined to offline unit tests and must never leak into application runtime or serve as acceptance for live integrations.

## Architecture & Technology Stack
- **Web Client (`apps/web`)**: Next.js (App Router), TypeScript, Tailwind CSS, Lucide icons, Chart.js / SVG visualizations rendering only authentic live data points.
- **Backend Service (`services/api`)**: Python 3.12, FastAPI, Pydantic v2 schemas, HTTPX async HTTP client with strict timeout/retry policies.
- **Infrastructure (`infra`)**: Modular setup, containerization (Docker), PostgreSQL/PostGIS (introduced when persistent alert subscriptions/spatial caching are needed).
- **Quality Assurance (`tests`)**: Pytest for unit & live integration tests; Playwright for browser validation.

## Workspace Customizations & Skill Ingestion
Agents operating in this workspace must consult and adhere to the specialized skills in `.agents/skills/`:
- `project-architecture`
- `fullstack-engineering`
- `live-weather-data`
- `official-weather-alerts`
- `weather-ui-ux`
- `risk-engine-science`
- `verification-quality`
- `release-security`
- `farmer-intelligence`
- `satellite-geospatial`
