# SkyGuard — Acceptance Criteria & Validation Matrix

## Mandatory Verification Checks

1. **Zero Fake Data Check**:
   - [ ] Inspect network traffic and components: no placeholder values (like static "24°C" or "Rain tomorrow: 80%"), no pre-filled demo arrays, no math.random() risk scores.
   - [ ] On network failure: UI transitions to clean error card with retry button.

2. **Provenance & Attribution Check**:
   - [ ] Every rendered weather card displays provider ("Open-Meteo"), data retrieval timestamp, and timezone.
   - [ ] WMO code descriptions and units (°C, mm, km/h, %) are accurate.

3. **Official Alert Isolation Check**:
   - [ ] IMD official warning feed is kept distinct from NWP forecast.
   - [ ] If IMD API is unauthenticated or unreachable, status is explicitly rendered as `SERVICE_UNAVAILABLE` or `NOT_CONNECTED` with direct links to `mausam.imd.gov.in`. It must never display "Safe" or "No Warnings" erroneously.

4. **Transparent Risk Engine Check**:
   - [ ] All derived signals display explicit evidence (e.g. "Forecast max temp: 41°C meets Heat Wave threshold >= 40°C").
   - [ ] Disclaimers clearly mark derived signals as "Experimental Non-Official Heuristic".

5. **Gated Farmer Mode Check**:
   - [ ] Farmer Mode toggle shows agricultural watches based solely on forecasted rain/temperature.
   - [ ] Hardware soil sensors, satellite indices (NDVI), and yield prediction cards display honest `GATED / DISCONNECTED` badges.

6. **Full-Stack Execution & Tests**:
   - [ ] Python unit tests pass with pytest.
   - [ ] Live integration test reaches upstream Open-Meteo and validates live payload.
   - [ ] Frontend compiles without TypeScript or build errors.
