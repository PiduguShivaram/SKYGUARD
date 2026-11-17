"""Farmer Mode agronomic schemas and telemetry gating status."""
from enum import Enum
from typing import List, Optional
from pydantic import BaseModel, Field
from services.api.app.schemas.weather import DailyForecastPoint
from services.api.app.schemas.common import Provenance


class CropTypeEnum(str, Enum):
    PADDY = "Paddy (Rice)"
    COTTON = "Cotton"
    MAIZE = "Maize"
    WHEAT = "Wheat"
    SOYBEAN = "Soybean"
    TOMATO = "Tomato"
    OTHER = "General Field Crop"


class SensorStatusEnum(str, Enum):
    CONNECTED = "CONNECTED"
    DISCONNECTED = "DISCONNECTED / UNCONFIGURED"
    GATED = "GATED (Awaiting Hardware Telemetry)"


class FarmerWatchSignal(BaseModel):
    category: str
    severity: str
    crop: str
    date: str
    observation: str
    action: str
    scientific_rationale: str


class HardwareGatingStatus(BaseModel):
    soil_moisture_sensor: SensorStatusEnum = SensorStatusEnum.DISCONNECTED
    satellite_ndvi_index: SensorStatusEnum = SensorStatusEnum.GATED
    field_yield_model: SensorStatusEnum = SensorStatusEnum.GATED
    explanation: str = Field(
        default="Direct soil moisture telemetry, Sentinel-2 10m NDVI anomalies, and plot-level yield loss predictions require authenticated IoT nodes, Earth Engine credentials, and calibrated local agronomic validation. They are strictly disabled to prevent speculative decisions.",
        description="Transparent gating rationale"
    )


class FarmerWatchRequest(BaseModel):
    crop: CropTypeEnum
    sowing_date: Optional[str] = None
    daily_forecast: List[DailyForecastPoint]


class FarmerWatchResponse(BaseModel):
    crop: str
    days_since_sowing: Optional[int] = None
    watches: List[FarmerWatchSignal]
    hardware_gating: HardwareGatingStatus
    provenance: Provenance
