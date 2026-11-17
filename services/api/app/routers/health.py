"""Health check and provider diagnostics router.

Performs genuine per-provider connectivity and response verification.
Status is HEALTHY only when all upstream providers are verified reachable.
"""
from datetime import datetime, timezone
import httpx
from fastapi import APIRouter
from services.api.app.config import settings

router = APIRouter(prefix="/api/health", tags=["Health"])


@router.get("")
async def health_check():
    upstream_statuses = {}
    latencies = {}

    async with httpx.AsyncClient(timeout=4.5) as client:
        # 1. Check Open-Meteo
        try:
            start = datetime.now()
            r = await client.get(f"{settings.OPEN_METEO_BASE_URL}/forecast?latitude=0&longitude=0")
            dur = (datetime.now() - start).total_seconds() * 1000
            upstream_statuses["open_meteo"] = "REACHABLE" if r.status_code == 200 else f"HTTP_{r.status_code}"
            latencies["open_meteo_ms"] = round(dur, 1)
        except Exception as exc:
            upstream_statuses["open_meteo"] = f"ERROR: {type(exc).__name__}"

        # 2. Check GDACS
        try:
            start = datetime.now()
            r = await client.get("https://www.gdacs.org/gdacsapi/api/events/geteventlist/SEARCH?format=geojson")
            dur = (datetime.now() - start).total_seconds() * 1000
            upstream_statuses["gdacs"] = "REACHABLE" if r.status_code == 200 else f"HTTP_{r.status_code}"
            latencies["gdacs_ms"] = round(dur, 1)
        except Exception as exc:
            upstream_statuses["gdacs"] = f"ERROR: {type(exc).__name__}"

        # 3. Check WMO SWIC
        try:
            start = datetime.now()
            r = await client.get("https://severeweather.wmo.int/json/wmo_all.json")
            dur = (datetime.now() - start).total_seconds() * 1000
            upstream_statuses["wmo_swic"] = "REACHABLE" if r.status_code == 200 else f"HTTP_{r.status_code}"
            latencies["wmo_swic_ms"] = round(dur, 1)
        except Exception as exc:
            upstream_statuses["wmo_swic"] = f"ERROR: {type(exc).__name__}"

        # 4. Check Alert-Hub
        try:
            start = datetime.now()
            r = await client.get("https://cap-alerts.s3.amazonaws.com/unfiltered/rss.xml")
            dur = (datetime.now() - start).total_seconds() * 1000
            upstream_statuses["alert_hub"] = "REACHABLE" if r.status_code == 200 else f"HTTP_{r.status_code}"
            latencies["alert_hub_ms"] = round(dur, 1)
        except Exception as exc:
            upstream_statuses["alert_hub"] = f"ERROR: {type(exc).__name__}"

    reachable_count = sum(1 for v in upstream_statuses.values() if v == "REACHABLE")
    total_providers = len(upstream_statuses)

    if reachable_count == total_providers:
        overall_status = "HEALTHY"
    elif reachable_count > 0:
        overall_status = "DEGRADED"
    else:
        overall_status = "UNAVAILABLE"

    return {
        "status": overall_status,
        "service": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "server_utc_time": datetime.now(timezone.utc).isoformat(),
        "reachable_providers_count": reachable_count,
        "total_providers_count": total_providers,
        "upstream_providers": upstream_statuses,
        "latencies": latencies,
    }
