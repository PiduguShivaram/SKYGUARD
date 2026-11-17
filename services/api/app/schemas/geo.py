"""Geocoding schemas."""
from typing import List, Optional
from pydantic import BaseModel, Field
from services.api.app.schemas.common import Provenance


class LocationSearchResult(BaseModel):
    id: int
    name: str
    latitude: float
    longitude: float
    elevation: Optional[float] = None
    feature_code: Optional[str] = None
    country_code: Optional[str] = None
    country: Optional[str] = None
    admin1: Optional[str] = Field(None, description="State / Province")
    admin2: Optional[str] = Field(None, description="District / County")
    admin3: Optional[str] = None
    timezone: Optional[str] = None
    formatted_label: str = Field(..., description="Display label e.g., 'Warangal, Telangana, India'")


class GeocodingResponse(BaseModel):
    query: str
    count: int
    results: List[LocationSearchResult]
    provenance: Provenance
