---
name: satellite-geospatial
description: Satellite earth observation integration standards (Copernicus Sentinel-2, Landsat, GEE) and gating rules for NDVI/EVI indices.
---

# Satellite Geospatial Skill

## Principles & Invariants
1. **Real Satellite Data Only**:
   - Do not display synthetic NDVI heatmaps, fabricated vegetation indices, or mock satellite imagery tiles.
   - Satellite products require real-time Google Earth Engine (GEE), Copernicus Open Access Hub, or NASA Earthdata authentication.
2. **Gated State Presentation**:
   - If GEE service account credentials (`EE_SERVICE_ACCOUNT`, `EE_PRIVATE_KEY`) are unconfigured, render an explicit status:
     `Satellite Earth Observation: UNCONNECTED`
     Explanation: "Google Earth Engine service account is not provisioned. To enable Sentinel-2 NDVI/NDWI vegetation anomaly tracking, configure credentials in .env."
3. **Resolution & Latency Disclaimers**:
   - When satellite features are active, clearly specify spatial resolution (e.g., 10m for Sentinel-2, 30m for Landsat-8) and revisit frequency (5-day cycle).
