"""Common schemas, provenance models, and error responses."""
from datetime import datetime, timezone
from typing import Optional, Any
from pydantic import BaseModel, Field


class Provenance(BaseModel):
    provider: str = Field(..., description="Name of the authoritative upstream data source")
    retrieved_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        description="UTC timestamp when data was fetched from provider"
    )
    source_model: Optional[str] = Field(None, description="Specific NWP or forecast model utilized")
    attribution_url: str = Field(..., description="Link to provider terms and official source")
    disclaimer: str = Field(
        ...,
        description="Explicit limitation notice separating official warnings from numerical forecasts"
    )


class ErrorResponse(BaseModel):
    error: str = Field(..., description="Short error code or title")
    message: str = Field(..., description="Detailed diagnostic message explaining reason for unavailability")
    actionable_reason: Optional[str] = Field(None, description="Suggested action for resolution")
    provider: Optional[str] = Field(None, description="Affected upstream provider")
    status_code: int = Field(500, description="HTTP status code")
