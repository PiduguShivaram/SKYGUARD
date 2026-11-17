"""Official emergency alerts schemas."""
from enum import Enum
from typing import List, Optional
from pydantic import BaseModel, Field
from services.api.app.schemas.common import Provenance


class AlertSeverityEnum(str, Enum):
    RED = "Red Warning (Take Action)"
    ORANGE = "Orange Warning (Be Prepared)"
    YELLOW = "Yellow Warning (Be Updated)"
    GREEN = "Green (No Warning / Normal)"


class AlertProviderStatus(str, Enum):
    CONNECTED = "CONNECTED"
    SERVICE_UNAVAILABLE = "SERVICE_UNAVAILABLE"
    UNAUTHENTICATED = "UNAUTHENTICATED"
    NOT_CONFIGURED = "NOT_CONFIGURED"


class OfficialAlertItem(BaseModel):
    id: str
    headline: str
    event: str
    severity: AlertSeverityEnum
    effective: str
    expires: str
    area_description: str
    state: str
    district: str
    instruction: Optional[str] = None
    issuing_office: str = "India Meteorological Department (IMD)"


class OfficialAlertResponse(BaseModel):
    provider_status: AlertProviderStatus
    official_agency: str = "India Meteorological Department (IMD)"
    query_location: str
    district: Optional[str] = None
    state: Optional[str] = None
    active_alerts: List[OfficialAlertItem] = Field(default_factory=list)
    official_portal_url: str = "https://mausam.imd.gov.in"
    ndma_sachet_url: str = "https://sachet.ndma.gov.in"
    unavailability_reason: Optional[str] = None
    setup_instructions: Optional[str] = None
    provenance: Provenance
