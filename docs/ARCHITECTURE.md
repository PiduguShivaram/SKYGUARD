# SkyGuard — Architecture & System Design

## 1. System Topology
```text
┌────────────────────────────────────────────────────────────────────────┐
│                              apps/web                                  │
│       Next.js 14+ (App Router) · React · TypeScript · Tailwind CSS      │
│   ┌──────────────────┐  ┌──────────────────┐  ┌────────────────────┐   │
│   │   Search & Geo   │  │ Weather & Charts │  │ Official Alerts &  │   │
│   │   Autocomplete   │  │ (Authentic NWP)  │  │ Gated Farmer Mode  │   │
│   └────────┬─────────┘  └────────┬─────────┘  └────────┬───────────┘   │
└────────────┼─────────────────────┼─────────────────────┼───────────────┘
             │                     │                     │
             │ HTTP / JSON         │                     │
             ▼                     ▼                     ▼
┌────────────────────────────────────────────────────────────────────────┐
│                            services/api                                │
│                FastAPI · Pydantic v2 · HTTPX (Async)                   │
│  ┌───────────────────────┐  ┌──────────────────┐  ┌─────────────────┐  │
│  │ Geocoding & Weather   │  │ Risk Assessment  │  │ IMD Alert Feed  │  │
│  │ Router (/api/v1/geo,  │  │ Engine           │  │ Router          │  │
│  │         /weather)     │  │ (/api/v1/risk)   │  │ (/api/v1/alerts)│  │
│  └───────────┬───────────┘  └────────┬─────────┘  └────────┬────────┘  │
└──────────────┼───────────────────────┼─────────────────────┼───────────┘
               │                       │                     │
               ▼                       ▼                     ▼
┌─────────────────────────┐ ┌──────────────────────┐ ┌───────────────────┐
│       Open-Meteo        │ │ Scientific Guidance  │ │     IMD / NDMA    │
│  NWP & Geocoding APIs   │ │  (IMD, WMO, NDMA)    │ │ Official Weather  │
│ (ECMWF, GFS, ICON IFS)  │ │ Deterministic Rules  │ │ Warnings Feeds    │
└─────────────────────────┘ └──────────────────────┘ └───────────────────┘
```

## 2. API Contract & Schemas
- **Provenance Header/Field**:
  Every response model extends `ProvenanceModel`:
  ```python
  class ProvenanceModel(BaseModel):
      provider: str
      source_model: Optional[str] = None
      retrieved_at: datetime
      attribution_url: str
      timezone: str
  ```
- **Categorical Integrity**:
  - `WeatherForecastResponse`: Holds current conditions, hourly series, daily series.
  - `OfficialAlertResponse`: Holds official government agency bulletins with status (`CONNECTED`, `NOT_CONNECTED`, `SERVICE_UNAVAILABLE`).
  - `RiskEvaluationResponse`: Holds experimental heuristic signals clearly tagged with severity, evidence, and advisory.
  - `FarmerWatchResponse`: Holds crop-specific watches and hardware gating statuses.

## 3. Data Flow & Security
- Frontend makes zero outbound calls with private tokens.
- All requests flow through `services/api`.
- Client requests opt-in browser geolocation; if denied, graceful degradation to textual search.
