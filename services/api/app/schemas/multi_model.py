"""Multi-model numerical weather prediction schemas and model registry."""
from typing import Dict, List, Optional
from pydantic import BaseModel, Field
from services.api.app.schemas.common import Provenance


class ModelMetadata(BaseModel):
    model_id: str = Field(..., description="Unique model identifier (e.g. ecmwf_ifs025, gfs_seamless, icon_seamless)")
    name: str = Field(..., description="Display model name")
    agency: str = Field(..., description="Meteorological agency (e.g. ECMWF, NOAA NCEP, DWD, UKMO, JMA)")
    country: str = Field(..., description="Country or international consortium")
    native_resolution_km: float = Field(..., description="Approximate horizontal grid spacing in km")
    forecast_horizon_days: int = Field(..., description="Forecast horizon available")
    status: str = Field(..., description="AVAILABLE | UNAVAILABLE | DEGRADED")
    notes: Optional[str] = None


class ModelForecastPoint(BaseModel):
    time: str = Field(..., description="ISO 8601 UTC timestamp")
    temperature_2m: float = Field(..., description="Temperature at 2m in Celsius")
    precipitation: Optional[float] = Field(None, description="Hourly precipitation amount in mm")
    wind_speed_10m: Optional[float] = Field(None, description="Wind speed at 10m in km/h")


class ConsensusPoint(BaseModel):
    time: str = Field(..., description="ISO 8601 UTC timestamp")
    consensus_temperature_2m: float = Field(..., description="Ensemble mean temperature in Celsius")
    median_temperature_2m: float = Field(..., description="Ensemble median temperature in Celsius")
    consensus_precipitation: Optional[float] = Field(None, description="Ensemble mean precipitation in mm")
    consensus_wind_speed_10m: Optional[float] = Field(None, description="Ensemble mean wind speed in km/h")
    temperature_spread_min: float = Field(..., description="Minimum temperature across reporting models")
    temperature_spread_max: float = Field(..., description="Maximum temperature across reporting models")
    temperature_std_dev: float = Field(..., description="Standard deviation among models (experimental model spread)")
    precipitation_spread_max: Optional[float] = Field(None, description="Maximum precipitation among models")
    models_reporting: List[str] = Field(default_factory=list, description="Models with valid forecast at this step")
    disagreement_level: str = Field(
        ...,
        description="LOW (<1.5C) | MODERATE (1.5-3.0C) | HIGH (>3.0C) | INSUFFICIENT_MODELS (<2 models)",
    )
    spread_classification: str = Field(
        "EXPERIMENTAL_MODEL_SPREAD",
        description="Explicit classification as uncalibrated multi-model dispersion",
    )
    empirical_coverage_note: Optional[str] = Field(
        None,
        description="Disclosure that spread indicates inter-model variance rather than calibrated Bayesian probability",
    )


class MultiModelResponse(BaseModel):
    latitude: float
    longitude: float
    elevation: Optional[float] = None
    timezone: str
    models_available: List[ModelMetadata]
    consensus_hourly: List[ConsensusPoint]
    models_series: Dict[str, List[ModelForecastPoint]] = Field(default_factory=dict)
    provenance: Provenance
