---
name: risk-engine-science
description: Research-grounded, deterministic risk assessment engine specifications for extreme heat, precipitation, and wind hazards.
---

# Risk Engine Science Skill

## Principles & Guardrails
- **No Hallucinated "AI Risk Scores"**: Never output arbitrary percentages like "87% Flood Risk" without a calibrated statistical or hydrological model and peer-reviewed validation dataset.
- **Deterministic Heuristics Based on Recognized Scientific Guidance**:
  - **Heat Stress**:
    - Based on IMD Heat Wave criteria (Plains: Max temp >= 40°C with departure >= 4.5°C; or Severe Heat Wave when max temp >= 45°C).
    - NOAA National Weather Service Heat Index thresholds (Caution: 27-32°C, Extreme Caution: 32-41°C, Danger: 41-54°C).
  - **Extreme Rainfall**:
    - IMD Rainfall classification:
      - Heavy Rain: 64.5 mm to 115.5 mm in 24 hours.
      - Very Heavy Rain: 115.6 mm to 204.4 mm in 24 hours.
      - Extremely Heavy Rain: >= 204.5 mm in 24 hours.
      - Moderate Rain: 15.6 mm to 64.4 mm.
  - **High Wind & Squalls**:
    - IMD Squall criteria: Sudden wind increase to >= 50 km/h (14 m/s) lasting >= 1 minute.
    - Gale force wind: >= 62 km/h.
- **Actionable Precautions**:
  - Each risk signal must pair physical evidence with authoritative, safety-oriented guidance (e.g. referencing NDMA or WHO guidelines).
