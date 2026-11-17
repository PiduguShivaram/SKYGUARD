---
name: farmer-intelligence
description: Standards for Farmer Mode agronomic intelligence, crop-weather watches, and strict gating of uncalibrated yield or sensor models.
---

# Farmer Intelligence Skill

## Agronomic Grounding
Farmer Mode provides specialized agricultural weather intelligence for crops such as Paddy (Rice), Cotton, Maize, Wheat, Soybean, and Tomato.

## Guardrails & Non-Negotiable Invariants
1. **No Fake Yield or Loss Estimates**:
   - Never output fabricated percentages like "Estimated Yield Loss: 14.2%" or "92% Crop Health".
   - Yield loss estimation requires validated historical yield data, soil physical properties, calibrated phenological models (e.g., DSSAT/APSIM), and on-field calibration.
2. **Transparent Weather Watches**:
   - Provide watches based solely on observable forecast metrics:
     - Dry-spell Watch: E.g., cumulative 7-day precipitation < 5mm with maximum temperature >= 35°C.
     - Field Waterlogging Watch: Forecast daily precipitation >= 50mm risking standing water.
     - Heat Stress Watch during flowering/anthesis: Maximum temperature >= 38°C.
3. **Hardware / Telemetry Gating**:
   - When in-situ soil moisture probes (volumetric water content sensors) or agrometeorological IoT nodes are disconnected, show an explicit badge: `Sensor Telemetry: DISCONNECTED / NOT CONFIGURED`.
   - Never invent soil moisture numbers or root-zone water tension.
