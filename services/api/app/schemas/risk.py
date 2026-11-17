"""Experimental derived weather risk schemas."""
from enum import Enum
from typing import List, Optional
from pydantic import BaseModel, Field
from services.api.app.schemas.weather import DailyForecastPoint
from services.api.app.schemas.common import Provenance


class RiskSeverityEnum(str, Enum):
    HIGH = "High"
    MODERATE = "Moderate"
    LOW = "Low"


class RiskSignal(BaseModel):
    category: str = Field(..., description="Hazard category e.g., 'Extreme Heat Indicator'")
    severity: RiskSeverityEnum
    date: str = Field(..., description="Date of anticipated risk (YYYY-MM-DD)")
    threshold_basis: str = Field(..., description="Documented scientific rule and reference (e.g. IMD / WMO criteria)")
    evidence: str = Field(..., description="Factual numerical values triggering this heuristic")
    recommended_action: str = Field(..., description="Authoritative safety guidance (e.g. NDMA)")


class RiskEvaluationRequest(BaseModel):
    daily_forecast: List[DailyForecastPoint]


class RiskEvaluationResponse(BaseModel):
    evaluated_days: int
    signals: List[RiskSignal]
    methodology: str = Field(
        default="Deterministic rule-based heuristics referencing IMD rainfall classifications, WMO heat thresholds, and NDMA guidelines. Not an official IMD emergency alert.",
        description="Transparent methodology statement"
    )
    provenance: Provenance
