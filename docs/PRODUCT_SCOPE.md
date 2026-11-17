# SkyGuard — Product Scope & Specifications

## 1. Executive Summary
SkyGuard is a real-time, privacy-preserving weather intelligence and emergency warning platform designed to empower everyday citizens, commuters, and agricultural workers with trustworthy atmospheric data, official government disaster warnings, and transparent, research-backed risk indicators.

## 2. Target Personas & Operating Modes
### Public Mode (Primary)
- **Audience**: General citizens, commuters, outdoor workers, emergency managers.
- **Key Capabilities**:
  - Live geocoding place search and opt-in device location.
  - Current real-time weather conditions (temperature, apparent temperature, relative humidity, precipitation, wind speed & direction, WMO weather code description).
  - High-resolution 24-hour hourly trend charts and 7-day extended forecasts.
  - Dedicated Official Weather Alert center tracking national meteorological warnings (IMD/NDMA).
  - Transparent, research-based derived risk indicators (extreme heat, heavy rainfall/waterlogging, high winds).
  - Explicit data provenance, retrieval timestamps, units, and timezone visibility.

### Farmer Mode (Optional, Strictly Gated)
- **Audience**: Smallholder farmers, agronomists, farm managers.
- **Key Capabilities**:
  - Crop-specific operational watches (dry spells, field waterlogging risks, heat stress during critical phases) based strictly on forecasted weather metrics.
  - Transparent agronomic precautions linked to agricultural extension guidelines.
  - Explicit hardware/sensor gating: Soil moisture sensors, satellite multi-spectral indices (NDVI), and yield impact models are gated until verified in-situ sensors or authenticated earth observation APIs are provisioned.

## 3. Strict Data Integrity Principles
1. **Zero Fabrication**: No fake live data, placeholder graphs, or demo numbers anywhere in production.
2. **Attribution**: Every metric links back to its verified source (Open-Meteo, IMD).
3. **No False Safety**: Missing or unreachable alert feeds are explicitly flagged as `UNAVAILABLE` or `UNAUTHENTICATED`, never falsely reported as "No Alerts".
