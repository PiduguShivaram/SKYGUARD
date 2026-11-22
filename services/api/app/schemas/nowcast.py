"""Doppler radar nowcasting and frame telemetry schemas."""
from typing import List, Optional
from pydantic import BaseModel, Field
from services.api.app.schemas.common import Provenance


class RadarFrame(BaseModel):
    timestamp: int = Field(..., description="Unix epoch timestamp of radar frame")
    iso_time: str = Field(..., description="ISO 8601 UTC timestamp")
    tile_path: str = Field(..., description="URL path to radar composite tile layer")
    frame_type: str = Field(..., description="past | nowcast")


class NowcastInterval(BaseModel):
    time: str = Field(..., description="ISO 8601 UTC timestamp")
    lead_minutes: int = Field(..., description="Forecast lead time in minutes (0, 15, 30, 45, 60, 90, 120)")
    estimated_precipitation_rate_mmh: Optional[float] = Field(None, description="Estimated precipitation rate in mm/h (None if unknown)")
    trend: str = Field(..., description="STEADY | INTENSIFYING | WEAKENING | CLEAR | UNKNOWN")
    method: str = Field(..., description="RADAR_EXTRAPOLATION | KINEMATIC_RADAR_EXTRAPOLATION | NWP_DEGRADATION | UNKNOWN_DATA")


class RadarNowcastResponse(BaseModel):
    latitude: float
    longitude: float
    radar_status: str = Field(..., description="ACTIVE_HISTORICAL_MOSAIC_ONLY | ACTIVE | DEGRADED_OUT_OF_RADAR_COVERAGE")
    host: str = Field(..., description="Radar tile server host (e.g. RainViewer / IMD DWR)")
    validation_status: str = Field(
        "EXPERIMENTAL_UNVALIDATED_NOWCAST",
        description="Scientific validation status of forward nowcast extrapolation",
    )
    discontinued_upstream_notice: str = Field(
        ...,
        description="Notice regarding RainViewer Jan 1, 2026 free future nowcast frame discontinuation",
    )
    recent_frames: List[RadarFrame] = Field(default_factory=list, description="Recent authentic Doppler frames")
    nowcast_intervals: List[NowcastInterval] = Field(default_factory=list, description="0-120 minute precipitation extrapolation")
    coverage_note: str = Field(..., description="Explicit statement of Doppler radar coverage and limitations")
    provenance: Provenance
