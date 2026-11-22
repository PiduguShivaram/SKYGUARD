"""Multi-model numerical weather prediction client querying ECMWF, GFS, ICON, UKMO, and JMA."""
import logging
from typing import Dict, List, Optional
import httpx
from fastapi import HTTPException
from services.api.app.schemas.common import Provenance
from services.api.app.schemas.multi_model import (
    ModelMetadata,
    ModelForecastPoint,
    MultiModelResponse,
)
from services.api.app.services.consensus_engine import compute_consensus_series

logger = logging.getLogger(__name__)

OPEN_METEO_FORECAST_URL = "https://api.open-meteo.com/v1/forecast"

# Authoritative Numerical Weather Prediction Registry
MODEL_REGISTRY: Dict[str, ModelMetadata] = {
    "ecmwf_ifs025": ModelMetadata(
        model_id="ecmwf_ifs025",
        name="ECMWF IFS",
        agency="European Centre for Medium-Range Weather Forecasts",
        country="International (Reading, UK)",
        native_resolution_km=25.0,
        forecast_horizon_days=10,
        status="AVAILABLE",
        notes="Gold-standard global medium-range numerical weather model.",
    ),
    "gfs_seamless": ModelMetadata(
        model_id="gfs_seamless",
        name="NOAA GFS",
        agency="National Oceanic and Atmospheric Administration (NCEP)",
        country="United States",
        native_resolution_km=28.0,
        forecast_horizon_days=16,
        status="AVAILABLE",
        notes="United States global forecast system seamless ensemble.",
    ),
    "icon_seamless": ModelMetadata(
        model_id="icon_seamless",
        name="DWD ICON",
        agency="Deutscher Wetterdienst (DWD)",
        country="Germany",
        native_resolution_km=13.0,
        forecast_horizon_days=7,
        status="AVAILABLE",
        notes="Icosahedral Nonhydrostatic model with non-hydrostatic dynamics.",
    ),
    "ukmo_seamless": ModelMetadata(
        model_id="ukmo_seamless",
        name="UK Met Office (UKMO)",
        agency="Met Office",
        country="United Kingdom",
        native_resolution_km=10.0,
        forecast_horizon_days=6,
        status="AVAILABLE",
        notes="Unified Model global configuration with 4D-Var data assimilation.",
    ),
    "jma_seamless": ModelMetadata(
        model_id="jma_seamless",
        name="JMA GSM",
        agency="Japan Meteorological Agency",
        country="Japan",
        native_resolution_km=20.0,
        forecast_horizon_days=8,
        status="AVAILABLE",
        notes="Global Spectral Model operated by Japan Meteorological Agency.",
    ),
}

REQUESTED_MODELS = ["ecmwf_ifs025", "gfs_seamless", "icon_seamless", "ukmo_seamless", "jma_seamless"]


async def fetch_multi_model_forecast(
    latitude: float,
    longitude: float,
    forecast_days: int = 5,
    http_client: Optional[httpx.AsyncClient] = None,
) -> MultiModelResponse:
    """Queries multi-model numerical weather predictions and computes consensus & model spread.

    Zero synthetic data invariant: missing models are marked UNAVAILABLE rather than fabricated.
    """
    params = {
        "latitude": latitude,
        "longitude": longitude,
        "hourly": ["temperature_2m", "precipitation", "wind_speed_10m"],
        "models": REQUESTED_MODELS,
        "forecast_days": min(max(forecast_days, 1), 7),
        "timezone": "UTC",
    }

    should_close_client = False
    if http_client is None:
        http_client = httpx.AsyncClient(timeout=12.0)
        should_close_client = True

    try:
        response = await http_client.get(OPEN_METEO_FORECAST_URL, params=params)
        if response.status_code != 200:
            logger.error("Open-Meteo multi-model query failed: status %s, %s", response.status_code, response.text)
            raise HTTPException(
                status_code=502,
                detail=f"Multi-model weather prediction provider error ({response.status_code}): {response.text[:200]}",
            )

        data = response.json()
        hourly_data = data.get("hourly", {})
        times = hourly_data.get("time", [])

        if not times:
            raise HTTPException(status_code=502, detail="Multi-model forecast array empty from upstream provider.")

        # Extract per-model series
        models_series: Dict[str, List[ModelForecastPoint]] = {}
        available_models: List[ModelMetadata] = []

        for model_id in REQUESTED_MODELS:
            t_key = f"temperature_2m_{model_id}"
            p_key = f"precipitation_{model_id}"
            w_key = f"wind_speed_10m_{model_id}"

            # Check if this model returned in the payload
            if t_key in hourly_data and p_key in hourly_data and w_key in hourly_data:
                t_arr = hourly_data[t_key]
                p_arr = hourly_data[p_key]
                w_arr = hourly_data[w_key]

                # Check if array is populated and has valid non-null entries
                if len(t_arr) == len(times) and any(v is not None for v in t_arr):
                    series_points = []
                    for i in range(len(times)):
                        temp_val = t_arr[i]
                        precip_val = p_arr[i] if i < len(p_arr) else None
                        wind_val = w_arr[i] if i < len(w_arr) else None

                        if temp_val is not None:
                            series_points.append(
                                ModelForecastPoint(
                                    time=times[i],
                                    temperature_2m=float(temp_val),
                                    precipitation=float(precip_val) if precip_val is not None else None,
                                    wind_speed_10m=float(wind_val) if wind_val is not None else None,
                                )
                            )

                    if series_points:
                        models_series[model_id] = series_points
                        meta = MODEL_REGISTRY.get(model_id)
                        if meta:
                            available_models.append(meta)

        if not models_series:
            raise HTTPException(status_code=502, detail="No valid numerical model streams returned for coordinates.")

        # Compute consensus and spread across valid models
        consensus_hourly = compute_consensus_series(times, models_series)

        provenance = Provenance(
            provider="Open-Meteo Multi-Model Ensemble (ECMWF, NOAA GFS, DWD ICON, UKMO, JMA)",
            attribution_url="https://open-meteo.com/en/docs/ensemble-api",
            disclaimer=(
                "Individual NWP models represent numerical physics forecasts from national and international "
                "meteorological services. Model spread reflects forecast uncertainty and should not be confused "
                "with an official emergency warning."
            ),
        )

        return MultiModelResponse(
            latitude=data.get("latitude", latitude),
            longitude=data.get("longitude", longitude),
            elevation=data.get("elevation"),
            timezone=data.get("timezone", "UTC"),
            models_available=available_models,
            consensus_hourly=consensus_hourly,
            models_series=models_series,
            provenance=provenance,
        )

    finally:
        if should_close_client:
            await http_client.aclose()
