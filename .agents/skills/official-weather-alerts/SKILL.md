---
name: official-weather-alerts
description: Ingestion and display standards for authoritative weather alerts from the India Meteorological Department (IMD) and NDMA SACHET.
---

# Official Weather Alerts Skill

## Context & Authority
- Only authorized national agencies (e.g. India Meteorological Department - IMD, National Disaster Management Authority - NDMA) issue official public weather warnings for India.
- Commercial or open NWP models (Open-Meteo, ECMWF) are forecast projections, NOT legal or official warnings.

## Rules for Alerts
- [ ] Visual Isolation: Official warnings MUST appear in a dedicated alert container with red/orange/yellow color coding according to standard IMD warning levels:
  - Red Warning (Take Action)
  - Orange Warning (Be Prepared)
  - Yellow Warning (Be Updated)
  - Green (No Warning / Normal conditions) - *ONLY when provider explicitly returns green status*.
- [ ] Disconnected/Unavailable Semantics:
  - If official IMD API feeds require authenticated credentials, or if the government feed is unreachable/down, SkyGuard must display:
    `Status: NOT_CONNECTED / SERVICE_UNAVAILABLE`
    With explanation: "Real-time IMD district warning feed is currently unauthenticated or unreachable. Check official IMD portal at mausam.imd.gov.in or NDMA SACHET at sachet.ndma.gov.in."
  - **NEVER** map an unavailable or error state to "No Active Warnings" or "Safe".
- [ ] Required Metadata:
  - Warning Issue Date/Time
  - Validity Window (`valid_until`)
  - Target District & State
  - Issuing Office (e.g., Regional Meteorological Centre, IMD)
  - Disaster Category (e.g., Cyclone, Heavy Rainfall, Thunderstorm, Heatwave)
