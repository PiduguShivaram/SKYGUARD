"""Authentic weather station observation schemas (WMO / NOAA AWC METAR network)."""
from typing import Dict, Optional
from pydantic import BaseModel, Field
from services.api.app.schemas.common import Provenance


class StationObservation(BaseModel):
    station_id: str = Field(..., description="ICAO / WMO 4-letter station identifier (e.g. VIDP, EGLL, KJFK)")
    station_name: str = Field(..., description="Station or airport facility name")
    latitude: float
    longitude: float
    elevation_m: Optional[float] = None
    distance_km: Optional[float] = Field(None, description="Distance from user query coordinates in km")
    observation_time: str = Field(..., description="ISO 8601 UTC observation timestamp")
    temperature_c: Optional[float] = Field(None, description="Observed dry-bulb temperature in Celsius")
    dewpoint_c: Optional[float] = Field(None, description="Observed dewpoint in Celsius")
    relative_humidity: Optional[float] = Field(None, description="Calculated relative humidity % from temp/dewpoint")
    wind_speed_kmh: Optional[float] = Field(None, description="Observed wind speed in km/h")
    wind_direction_deg: Optional[float] = Field(None, description="Wind direction in degrees (0-360)")
    visibility_km: Optional[float] = Field(None, description="Horizontal visibility in km")
    pressure_hpa: Optional[float] = Field(None, description="Altimeter sea-level pressure in hPa")
    weather_condition: Optional[str] = Field(None, description="Significant weather code / condition (e.g. HZ, BR, RA)")
    flight_category: Optional[str] = Field(None, description="VFR | MVFR | IFR | LIFR")
    qc_passed: bool = Field(True, description="Quality control validation flag")
    raw_metar: str = Field(..., description="Raw authentic METAR observation string")
    source_network: str = Field(..., description="Observational network (e.g. NOAA Aviation Weather Center / WMO)")


class NearbyObservationResponse(BaseModel):
    query_latitude: float
    query_longitude: float
    observation: Optional[StationObservation] = None
    model_comparison: Optional[Dict[str, float]] = Field(
        None,
        description="Ground-truth observation vs NWP model grid comparison (e.g. model_temp, obs_temp, bias_c)"
    )
    status: str = Field(..., description="OBSERVATION_FOUND | NO_STATION_WITHIN_RANGE | STATION_OFFLINE")
    provenance: Provenance
