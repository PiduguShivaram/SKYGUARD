# Rule: Absolute Data Integrity & Transparency

1. **No Synthetic or Mocked Live Data**:
   - Under no circumstances shall mock, fake, placeholder, synthetic, or pre-seeded environmental data (temperatures, precipitation, wind speeds, humidity, soil metrics, or alerts) be rendered in user-facing views or live application states.
   - If upstream APIs are unreachable, return an explicit error or unavailable status with clear diagnostics.

2. **Source Attribution & Timestamps**:
   - Every metric must indicate its authoritative origin (e.g., Open-Meteo, IMD, ECMWF).
   - Display data retrieval timestamp (`retrieved_at`), temporal validity window (`valid_time`), units of measure, and coordinate/district attribution.

3. **Separation of Warning Tiers**:
   - Official alerts from government meteorological agencies (IMD/NDMA) must be displayed in an exclusive, high-visibility component clearly labeled "Authoritative Warning".
   - Derived or experimental risk calculations (e.g. heat index, flash flood heuristics) must be distinctly titled "Experimental Derived Risk" and explicitly disclaim official endorsement.
   - Never convert a missing or empty alert response into a green "Safe / No Warnings" status unless the provider explicitly declares zero active hazards.

4. **Farmer Mode Gating**:
   - Features requiring localized sensor telemetry (e.g., in-situ soil moisture, canopy temperature) or multi-spectral satellite observations must remain strictly disabled with an explanatory badge until authenticated, calibrated data streams are established.
