"""Official weather alerts router (IMD / NDMA)."""
from typing import Optional
from fastapi import APIRouter, Query
from services.api.app.clients.imd import imd_client
from services.api.app.schemas.alerts import OfficialAlertResponse

router = APIRouter(prefix="/api/v1/alerts", tags=["Official Alerts"])


@router.get("/imd", response_model=OfficialAlertResponse)
async def get_imd_alerts(
    district: Optional[str] = Query(None, description="District name"),
    state: Optional[str] = Query(None, description="State / Province name"),
    location_label: str = Query("Selected Location", description="Display label"),
):
    return await imd_client.get_district_alerts(
        district=district,
        state=state,
        location_label=location_label,
    )
