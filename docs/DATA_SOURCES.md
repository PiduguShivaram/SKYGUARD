# SkyGuard — Data Sources & Scientific Grounding

## 1. Upstream Providers

| Provider | Purpose | Authority / Nature | License / Terms | Integration Method |
|---|---|---|---|---|
| **Open-Meteo Geocoding API** | Location search, city to coordinate resolution | Global geographical gazetteer | Non-commercial open data (Attribution required: Geonames / OpenStreetMap) | REST GET `https://geocoding-api.open-meteo.com/v1/search` |
| **Open-Meteo Forecast API** | Numerical Weather Prediction (NWP) | Multi-model ensemble (ECMWF, GFS, ICON, DWD) | Free for open access, CC BY 4.0 | REST GET `https://api.open-meteo.com/v1/forecast` |
| **India Meteorological Department (IMD) / NDMA SACHET** | Official National Severe Weather Warnings | Official Government Meteorological Authority of India | Authoritative National Emergency Bulletins | REST GET via public portal or CAP-XML / RSS feed (`mausam.imd.gov.in`, `sachet.ndma.gov.in`) |

## 2. Thresholds & Scientific Grounding for Derived Indicators

### Extreme Heat Indicators
- **Scientific Basis**: India Meteorological Department (IMD) Heat Wave Criteria & NOAA National Weather Service (NWS) Heat Index.
- **Criteria**:
  - Moderate Heat: Maximum temperature $\ge 38^\circ\text{C}$ with elevated heat stress.
  - High / Severe Heat: Maximum temperature $\ge 43^\circ\text{C}$ (or $\ge 40^\circ\text{C}$ in plains with high relative humidity).
  - Precaution: Refer to NDMA Heat Wave Guidelines (hydration, avoiding direct sun between 12:00 - 15:00).

### Precipitation & Waterlogging Indicators
- **Scientific Basis**: IMD Standard Rainfall Classification.
  - Very Heavy Rainfall: $\ge 64.5\text{ mm}$ in 24 hours.
  - Heavy Rainfall: $\ge 35\text{ mm}$ with $\ge 80\%$ precipitation probability.
  - Moderate Rain: $20\text{ mm}$ to $34.9\text{ mm}$.
  - Precaution: Check IMD Radar/Nowcast, avoid low-lying underpasses and waterlogged zones.

### Wind & Squall Indicators
- **Scientific Basis**: IMD Squall & Cyclone Warning Criteria.
  - High Gusts: Peak wind gust $\ge 70\text{ km/h}$.
  - Moderate Wind: Peak wind gust $\ge 50\text{ km/h}$.
  - Precaution: Secure loose tin roofs, avoid parking under old trees or billboards.

## 3. Gated Agronomic Data
- **Soil Moisture**: Requires calibrated FDR/TDR sensors or verified root-zone satellite microwave data (SMAP/SMOS). Disabled until hardware telemetry is authenticated.
- **Vegetation Health**: Requires calibrated Sentinel-2 / Landsat-8 surface reflectance through Google Earth Engine. Disabled until service account credentials are provided.
- **Yield Loss Estimation**: Explicitly NOT PROVIDED without calibrated crop growth models (APSIM/DSSAT) and ground-truth validation.
