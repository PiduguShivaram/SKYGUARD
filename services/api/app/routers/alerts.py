"""Worldwide weather and disaster alerts router."""
import json
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from services.api.app.adapters.aggregator import global_alert_aggregator
from services.api.app.adapters.alert_hub import alert_hub_adapter
from services.api.app.adapters.gdacs import gdacs_adapter
from services.api.app.adapters.wmo import wmo_adapter
from services.api.app.db.base import get_db
from services.api.app.db.models import AlertRecord
from services.api.app.schemas.global_alerts import GlobalAlertItem, GlobalAlertsResponse

router = APIRouter(prefix="/api/v1/alerts", tags=["Worldwide Alerts"])


@router.get("", response_model=dict)
async def list_alerts(
    country_code: Optional[str] = Query(None, description="ISO-2 or ISO-3 country filter"),
    category: Optional[str] = Query(None, description="OFFICIAL_CAP_WARNING or GDACS_DISASTER_ALERT"),
    min_severity: Optional[str] = Query(None, description="Moderate, Severe, or Extreme"),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
):
    """Retrieve verified active alerts with pagination and filtering."""
    # 1. Fetch live aggregated alerts
    res = await global_alert_aggregator.get_all_alerts(country_code=country_code)
    all_alerts: List[GlobalAlertItem] = res.official_cap_warnings + res.gdacs_disaster_alerts

    # 2. Filter by category
    if category:
        all_alerts = [a for a in all_alerts if a.alert_type == category]

    # 3. Filter by severity
    severity_order = {"Extreme": 4, "Severe": 3, "Moderate": 2, "Minor": 1, "Unknown": 0}
    if min_severity and min_severity in severity_order:
        threshold = severity_order[min_severity]
        all_alerts = [a for a in all_alerts if severity_order.get(a.severity, 0) >= threshold]

    # 4. Paginate
    total = len(all_alerts)
    paginated = all_alerts[offset : offset + limit]

    return {
        "total": total,
        "limit": limit,
        "offset": offset,
        "alerts": paginated,
        "providers_health": res.providers_health,
        "coverage_notes": res.coverage_notes,
        "provenance": res.provenance,
    }


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
    alerts, health, total_unfiltered = await gdacs_adapter.fetch_alerts(
        country_code=country_code,
        query_lat=latitude,
        query_lon=longitude,
        radius_km=radius_km,
    )
    return {"total": len(alerts), "total_worldwide": total_unfiltered, "health": health, "alerts": alerts}


@router.get("/wmo")
async def get_wmo_cap_alerts(country_code: Optional[str] = Query(None)):
    """Direct feed of official WMO Severe Weather Information Centre (SWIC) CAP warnings."""
    alerts, health, total_unfiltered = await wmo_adapter.fetch_alerts(country_code=country_code)
    return {"total": len(alerts), "total_worldwide": total_unfiltered, "health": health, "alerts": alerts}


@router.get("/alerthub")
async def get_alerthub_cap_alerts(country_code: Optional[str] = Query(None)):
    """Direct feed of Alert-Hub.org international CAP aggregation feed."""
    alerts, health, total_unfiltered = await alert_hub_adapter.fetch_alerts(country_code=country_code)
    return {"total": len(alerts), "total_worldwide": total_unfiltered, "health": health, "alerts": alerts}


@router.get("/{alert_id}", response_model=GlobalAlertItem)
async def get_alert_detail(
    alert_id: str,
    db: AsyncSession = Depends(get_db),
):
    """Retrieve full details of a specific authentic alert by identifier."""
    # Check database cache first
    stmt = select(AlertRecord).where(AlertRecord.id == alert_id)
    res = await db.execute(stmt)
    rec = res.scalars().first()

    if rec and rec.raw_json:
        try:
            return GlobalAlertItem.model_validate_json(rec.raw_json)
        except Exception:
            pass

    # If not in DB, scan live feeds
    live_res = await global_alert_aggregator.get_all_alerts()
    all_live = live_res.official_cap_warnings + live_res.gdacs_disaster_alerts
    for a in all_live:
        if a.id == alert_id:
            return a

    raise HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail=f"Alert with identifier '{alert_id}' was not found in active authoritative feeds.",
    )
