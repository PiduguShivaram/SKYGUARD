"""Observational grounding service comparing ground-truth station observations with NWP estimates."""
import logging
from typing import Optional
import httpx
from services.api.app.clients.noaa_awc import (
    fetch_observations_in_bbox,
    haversine_distance_km,
)
from services.api.app.schemas.common import Provenance
from services.api.app.schemas.observations import (
    NearbyObservationResponse,
    StationObservation,
)

logger = logging.getLogger(__name__)


async def get_nearest_station_observation(
    latitude: float,
    longitude: float,
    model_temp_c: Optional[float] = None,
    max_radius_km: float = 200.0,
    http_client: Optional[httpx.AsyncClient] = None,
) -> NearbyObservationResponse:
    """Finds the closest official WMO / NOAA METAR station to query coordinates and benchmarks NWP bias.

    Invariants:
    1. Numerical weather models are NEVER labeled as station observations.
    2. Missing station data honestly yields status 'NO_STATION_WITHIN_RANGE'.
    """
    # Search bounding box approx +/- 1.8 degrees (~200 km)
    delta = 1.8
    observations = await fetch_observations_in_bbox(
        min_lat=latitude - delta,
        min_lon=longitude - delta,
        max_lat=latitude + delta,
        max_lon=longitude + delta,
        http_client=http_client,
    )

    closest_obs: Optional[StationObservation] = None
    min_dist = float("inf")

    for obs in observations:
        dist = haversine_distance_km(latitude, longitude, obs.latitude, obs.longitude)
        if dist < min_dist and dist <= max_radius_km:
            min_dist = dist
            closest_obs = obs
            closest_obs.distance_km = round(dist, 1)

    provenance = Provenance(
        provider="NOAA Aviation Weather Center / WMO METAR Network",
        attribution_url="https://aviationweather.gov/data/metar/",
        disclaimer=(
            "Station observations represent physical sensor measurements from international WMO reporting stations. "
            "Model comparison indicates grid-to-station numerical prediction bias."
        ),
    )

    if closest_obs is None:
        return NearbyObservationResponse(
            query_latitude=latitude,
            query_longitude=longitude,
            observation=None,
            model_comparison=None,
            status="NO_STATION_WITHIN_RANGE",
            provenance=provenance,
        )

    # Compute ground-truth NWP model comparison if model temperature provided
    comparison = None
    if model_temp_c is not None and closest_obs.temperature_c is not None:
        bias = round(model_temp_c - closest_obs.temperature_c, 2)
        comparison = {
            "model_temp_c": round(model_temp_c, 2),
            "observed_temp_c": round(closest_obs.temperature_c, 2),
            "temp_bias_c": bias,
            "station_distance_km": closest_obs.distance_km or 0.0,
        }

    return NearbyObservationResponse(
        query_latitude=latitude,
        query_longitude=longitude,
        observation=closest_obs,
        model_comparison=comparison,
        status="OBSERVATION_FOUND",
        provenance=provenance,
    )
