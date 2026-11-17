"""Worldwide weather and disaster alerts router."""
from typing import Optional
from fastapi import APIRouter, Query

from services.api.app.adapters.aggregator import global_alert_aggregator
from services.api.app.adapters.alert_hub import alert_hub_adapter
from services.api.app.adapters.gdacs import gdacs_adapter
from services.api.app.adapters.wmo import wmo_adapter
from services.api.app.schemas.global_alerts import GlobalAlertsResponse

router = APIRouter(prefix="/api/v1/alerts", tags=["Worldwide Alerts"])


@router.get("/global", response_model=GlobalAlertsResponse)
async def get_global_alerts(
    country_code: Optional[str] = Query(None, description="ISO-2 or ISO-3 country filter (e.g. IN, US, DE, JP)"),
    latitude: Optional[float] = Query(None, ge=-90.0, le=90.0, description="Latitude for proximity filtering"),
    longitude: Optional[float] = Query(None, ge=-180.0, le=180.0, description="Longitude for proximity filtering"),
    radius_km: Optional[float] = Query(1000.0, ge=50.0, le=10000.0, description="Search radius in kilometers for disasters"),
):
    """Retrieve worldwide official CAP weather warnings (WMO SWIC, Alert-Hub) and disaster alerts (GDACS)."""
    return await global_alert_aggregator.get_all_alerts(
        country_code=country_code,
        latitude=latitude,
        longitude=longitude,
        radius_km=radius_km,
    )


@router.get("/gdacs")
async def get_gdacs_alerts(
    country_code: Optional[str] = Query(None),
    latitude: Optional[float] = Query(None),
    longitude: Optional[float] = Query(None),
    radius_km: Optional[float] = Query(1000.0),
):
    """Direct feed of GDACS disaster events (Tropical Cyclones, Floods, Earthquakes, Droughts)."""
    alerts, health = await gdacs_adapter.fetch_alerts(
        country_code=country_code,
        query_lat=latitude,
        query_lon=longitude,
        radius_km=radius_km,
    )
    return {"total": len(alerts), "health": health, "alerts": alerts}


@router.get("/wmo")
async def get_wmo_cap_alerts(country_code: Optional[str] = Query(None)):
    """Direct feed of official WMO Severe Weather Information Centre (SWIC) CAP warnings."""
    alerts, health = await wmo_adapter.fetch_alerts(country_code=country_code)
    return {"total": len(alerts), "health": health, "alerts": alerts}


@router.get("/alerthub")
async def get_alerthub_cap_alerts(country_code: Optional[str] = Query(None)):
    """Direct feed of Alert-Hub.org international CAP aggregation feed."""
    alerts, health = await alert_hub_adapter.fetch_alerts(country_code=country_code)
    return {"total": len(alerts), "health": health, "alerts": alerts}
