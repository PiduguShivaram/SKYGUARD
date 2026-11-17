"""Health check and provider diagnostics router."""
from datetime import datetime, timezone
import httpx
from fastapi import APIRouter
from services.api.app.config import settings

router = APIRouter(prefix="/api/health", tags=["Health"])


@router.get("")
async def health_check():
    upstream_status = "UNKNOWN"
    try:
        async with httpx.AsyncClient(timeout=3.0) as client:
            resp = await client.get(f"{settings.OPEN_METEO_BASE_URL}/forecast?latitude=0&longitude=0")
            if resp.status_code == 200:
                upstream_status = "REACHABLE"
            else:
                upstream_status = f"HTTP_{resp.status_code}"
    except Exception as exc:
        upstream_status = f"ERROR: {type(exc).__name__}"

    return {
        "status": "HEALTHY",
        "service": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "server_utc_time": datetime.now(timezone.utc).isoformat(),
        "upstream_providers": {
            "open_meteo": upstream_status,
            "imd_alerts": "CONFIGURED" if settings.IMD_API_KEY else "NOT_CONFIGURED (UNAUTHENTICATED)",
            "google_earth_engine": "CONFIGURED" if settings.EE_SERVICE_ACCOUNT else "NOT_CONFIGURED",
        },
    }
