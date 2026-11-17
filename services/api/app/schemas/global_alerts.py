"""Schemas for Worldwide Weather and Disaster Alerts (WMO CAP, GDACS, Alert-Hub)."""
from datetime import datetime, timezone
from enum import Enum
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field

from services.api.app.schemas.common import Provenance


class AlertCategoryEnum(str, Enum):
    OFFICIAL_CAP_WARNING = "OFFICIAL_CAP_WARNING"
    GDACS_DISASTER_ALERT = "GDACS_DISASTER_ALERT"


class AlertSeverityLevel(str, Enum):
    EXTREME = "Extreme"
    SEVERE = "Severe"
    MODERATE = "Moderate"
    MINOR = "Minor"
    UNKNOWN = "Unknown"


class ProviderHealthStatus(str, Enum):
    CONNECTED = "CONNECTED"
    UNAVAILABLE = "UNAVAILABLE"
    STALE = "STALE"


class GlobalAlertItem(BaseModel):
    id: str = Field(..., description="Unique source identifier for deduplication")
    source_provider: str = Field(..., description="WMO SWIC, GDACS, or Alert-Hub.org")
    alert_type: AlertCategoryEnum = Field(..., description="Categorical distinction: CAP warning vs GDACS disaster")
    event: str = Field(..., description="Event classification e.g. Tropical Cyclone, Flood, Severe Storm")
    headline: str = Field(..., description="Original headline from issuing authority")
    severity: AlertSeverityLevel = Field(..., description="Standardized CAP severity level")
    severity_original: Optional[str] = Field(None, description="Original severity as reported by upstream source")
    urgency: Optional[str] = Field("Unknown", description="CAP urgency: Immediate, Expected, Future, Past, Unknown")
    certainty: Optional[str] = Field("Unknown", description="CAP certainty: Observed, Likely, Possible, Unlikely, Unknown")
    local_color_code: Optional[str] = Field(None, description="Preserved official local warning colour code (e.g. Red, Orange, Yellow, Blue, Level III)")
    language: Optional[str] = Field("en", description="Original bulletin language code (e.g. en, zh, de, cs)")
    msg_type: Optional[str] = Field("Alert", description="CAP message type: Alert, Update, Cancel")
    issuer: str = Field(..., description="Authentic issuing meteorological or disaster authority")
    country_code: Optional[str] = Field(None, description="Standardized ISO-2 country code")
    affected_area: str = Field(..., description="Official area description or territory name")
    latitude: Optional[float] = Field(None, description="Centroid or point latitude if officially supplied")
    longitude: Optional[float] = Field(None, description="Centroid or point longitude if officially supplied")
    effective_time: Optional[str] = Field(None, description="Start/effective timestamp")
    expires_time: Optional[str] = Field(None, description="Expiry timestamp")
    description: str = Field(..., description="Detailed description or bulletin extract")
    source_url: str = Field(..., description="Direct link to official raw CAP XML or provider report")
    distance_km: Optional[float] = Field(None, description="Calculated distance in km from query location if coordinates supplied")


class ProviderHealth(BaseModel):
    provider_name: str
    status: ProviderHealthStatus
    total_alerts_fetched: int
    retrieved_at: str
    latency_ms: float
    error_message: Optional[str] = None
    attribution: str


class GlobalAlertsResponse(BaseModel):
    query_country: Optional[str] = None
    query_latitude: Optional[float] = None
    query_longitude: Optional[float] = None
    radius_km: Optional[float] = None
    total_worldwide_official_warnings: int = Field(0, description="Total active official CAP warnings globally before filtering")
    total_worldwide_disasters: int = Field(0, description="Total active disaster alerts globally before filtering")
    total_official_warnings: int = Field(..., description="Number of official warnings matching the current query filter")
    total_disaster_alerts: int = Field(..., description="Number of disaster alerts matching the current query filter")
    official_cap_warnings: List[GlobalAlertItem] = Field(default_factory=list)
    gdacs_disaster_alerts: List[GlobalAlertItem] = Field(default_factory=list)
    providers_health: Dict[str, ProviderHealth]
    coverage_notes: str = Field(
        default="Official CAP warnings originate from WMO-registered National Meteorological Services. GDACS multi-hazard alerts cover cyclones, floods, earthquakes, droughts, and volcanoes. Absence of alerts for a location does NOT imply 'No Danger' or 'All Clear'. Always cross-reference local civil protection authorities.",
        description="Transparent coverage limitation notice"
    )
    provenance: Provenance
