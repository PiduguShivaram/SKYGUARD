"""Health check and provider diagnostics router."""
from datetime import datetime, timezone
import httpx
from fastapi import APIRouter
from services.api.app.config import settings

router = APIRouter(prefix="/api/health", tags=["Health"])


@router.get("")
async def health_check():
    upstream_statuses = {}

    async with httpx.AsyncClient(timeout=4.0) as client:
        # Check Open-Meteo
        try:
            r = await client.get(f"{settings.OPEN_METEO_BASE_URL}/forecast?latitude=0&longitude=0")
            upstream_statuses["open_meteo"] = "REACHABLE" if r.status_code == 200 else f"HTTP_{r.status_code}"
        except Exception as exc:
            upstream_statuses["open_meteo"] = f"ERROR: {type(exc).__name__}"

        # Check GDACS
        try:
            r = await client.get("https://www.gdacs.org/gdacsapi/api/events/geteventlist/SEARCH?format=geojson")
            upstream_statuses["gdacs"] = "REACHABLE" if r.status_code == 200 else f"HTTP_{r.status_code}"
        except Exception as exc:
            upstream_statuses["gdacs"] = f"ERROR: {type(exc).__name__}"

        # Check WMO SWIC
        try:
            r = await client.get("https://severeweather.wmo.int/json/wmo_all.json")
            upstream_statuses["wmo_swic"] = "REACHABLE" if r.status_code == 200 else f"HTTP_{r.status_code}"
        except Exception as exc:
            upstream_statuses["wmo_swic"] = f"ERROR: {type(exc).__name__}"

        # Check Alert-Hub
        try:
            r = await client.get("https://cap-alerts.s3.amazonaws.com/unfiltered/rss.xml")
            upstream_statuses["alert_hub"] = "REACHABLE" if r.status_code == 200 else f"HTTP_{r.status_code}"
        except Exception as exc:
            upstream_statuses["alert_hub"] = f"ERROR: {type(exc).__name__}"

    return {
        "status": "HEALTHY",
        "service": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "server_utc_time": datetime.now(timezone.utc).isoformat(),
        "upstream_providers": upstream_statuses,
    }
