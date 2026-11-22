"""Hybrid multi-model prediction, radar nowcasting, and observational grounding router."""
from typing import Optional
from fastapi import APIRouter, Query
from services.api.app.clients.multi_model import fetch_multi_model_forecast
from services.api.app.schemas.multi_model import MultiModelResponse
from services.api.app.schemas.nowcast import RadarNowcastResponse
from services.api.app.schemas.observations import NearbyObservationResponse
from services.api.app.schemas.satellite import SatelliteCatalogResponse
from services.api.app.adapters.satellite import get_satellite_catalog
from services.api.app.services.nowcast_engine import generate_radar_nowcast
from services.api.app.services.observation_service import get_nearest_station_observation
from services.api.app.services.ml_correction import apply_mos_forecast_correction

router = APIRouter(prefix="/api/v1/prediction", tags=["Hybrid Prediction Engine"])


@router.get("/multi-model", response_model=MultiModelResponse)
async def get_multi_model_forecast(
    latitude: float = Query(..., ge=-90.0, le=90.0, description="Latitude coordinate"),
    longitude: float = Query(..., ge=-180.0, le=180.0, description="Longitude coordinate"),
    days: int = Query(5, ge=1, le=7, description="Forecast days"),
):
    """Retrieves numerical weather predictions from ECMWF IFS, NOAA GFS, DWD ICON, UKMO, and JMA with consensus spread."""
    return await fetch_multi_model_forecast(latitude=latitude, longitude=longitude, forecast_days=days)


@router.get("/observation", response_model=NearbyObservationResponse)
async def get_station_observation(
    latitude: float = Query(..., ge=-90.0, le=90.0, description="Latitude coordinate"),
    longitude: float = Query(..., ge=-180.0, le=180.0, description="Longitude coordinate"),
    model_temp: Optional[float] = Query(None, description="Optional NWP model temperature to benchmark bias"),
):
    """Retrieves authentic station observations from nearest WMO / NOAA METAR station."""
    return await get_nearest_station_observation(latitude=latitude, longitude=longitude, model_temp_c=model_temp)


@router.get("/nowcast", response_model=RadarNowcastResponse)
async def get_precipitation_nowcast(
    latitude: float = Query(..., ge=-90.0, le=90.0, description="Latitude coordinate"),
    longitude: float = Query(..., ge=-180.0, le=180.0, description="Longitude coordinate"),
    current_precip: Optional[float] = Query(None, description="Current precipitation rate in mm/h (omit if unknown)"),
):
    """Retrieves Doppler radar composite frames and 0-120 minute nowcasting trajectory with honest NWP fallback."""
    return await generate_radar_nowcast(latitude=latitude, longitude=longitude, current_precip_rate_mmh=current_precip)


@router.get("/satellite", response_model=SatelliteCatalogResponse)
async def get_satellite_earth_observation_catalog():
    """Retrieves ISRO MOSDAC (INSAT-3DR) and Copernicus Sentinel-2 satellite Earth Observation telemetry."""
    return get_satellite_catalog()


@router.get("/horizons")
async def get_stratified_prediction_horizons(
    latitude: float = Query(..., ge=-90.0, le=90.0),
    longitude: float = Query(..., ge=-180.0, le=180.0),
):
    """Provides stratified prediction horizon breakdown (0h, 0-2h, 2-6h, 6-24h, 1-7d) with microclimate ML correction."""
    multi_model = await fetch_multi_model_forecast(latitude=latitude, longitude=longitude, forecast_days=5)
    nowcast = await generate_radar_nowcast(latitude=latitude, longitude=longitude)

    # First point consensus
    first_pt = multi_model.consensus_hourly[0] if multi_model.consensus_hourly else None
    model_temp = first_pt.consensus_temperature_2m if first_pt else None

    # Station observation
    obs_resp = await get_nearest_station_observation(latitude=latitude, longitude=longitude, model_temp_c=model_temp)

    # ML post-processing on first step
    mos_correction = None
    if first_pt:
        obs_bias = obs_resp.model_comparison.get("temp_bias_c") if obs_resp.model_comparison else None
        mos_correction = apply_mos_forecast_correction(
            consensus_point=first_pt,
            target_elevation_m=multi_model.elevation,
            grid_elevation_m=multi_model.elevation,
            nearby_station_bias_c=obs_bias,
        )

    return {
        "latitude": latitude,
        "longitude": longitude,
        "elevation": multi_model.elevation,
        "prediction_horizons": {
            "horizon_0h_ground_truth": {
                "station_observation": obs_resp.observation,
                "status": obs_resp.status,
                "nwp_bias_comparison": obs_resp.model_comparison,
            },
            "horizon_0_2h_nowcast": {
                "radar_status": nowcast.radar_status,
                "intervals": nowcast.nowcast_intervals[:5],
                "coverage_note": nowcast.coverage_note,
            },
            "horizon_2_6h_short_term": {
                "consensus_hourly": multi_model.consensus_hourly[2:6],
            },
            "horizon_6_24h_diurnal": {
                "consensus_hourly": multi_model.consensus_hourly[6:24],
            },
            "horizon_1_7d_synoptic": {
                "consensus_hourly": multi_model.consensus_hourly[24:120],
                "models_available": multi_model.models_available,
            },
        },
        "ml_mos_correction": mos_correction,
        "provenance": multi_model.provenance,
    }
