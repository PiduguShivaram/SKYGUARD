# Rule: Real Data Only (Zero Fabrication)

1. **Absolute Real Data Guarantee**:
   - Every environmental reading, forecast, coordinate, and unit must originate from a verified upstream API (Open-Meteo).
   - Never render placeholder readings, static sample temperatures (e.g. 24°C), demo charts, or synthetic coordinates in running production or staging views.
   - If upstream services are down, unreachable, or return errors, display explicit, honest unavailability messages with retry actions.

2. **No False Safety**:
   - Do NOT display an "All Clear", "Safe", or "No Warning" banner when no official alert feed is connected.
   - Clarify that Open-Meteo provides numerical weather prediction model forecasts, not official emergency warnings.

3. **Provenance Integrity**:
   - Display provider attribution ("Open-Meteo"), retrieval timestamp in UTC/local time, timezone, requested coordinates, and provider grid coordinates.
   - Display original units (°C, %, mm, km/h) directly derived from the API response.

4. **Testing Strictness**:
   - Pure-function unit tests with static test inputs are permitted only inside test suites (`tests/`) and must be explicitly labeled.
   - Never use mocked HTTP responses as evidence of live integration passes.
