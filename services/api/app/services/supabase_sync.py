"""
SkyGuard Supabase Cloud Persistence and Mirroring Service.
Connects securely to Supabase PostgreSQL via PostgREST to mirror authoritative
emergency alerts and query cloud workspace records with zero synthetic data.
"""
import logging
from typing import Any, Dict, List, Optional
import httpx

from services.api.app.config import settings

logger = logging.getLogger("skyguard.supabase")


async def sync_alert_to_supabase(alert_data: Dict[str, Any]) -> bool:
    """Sync authoritative alert record to Supabase PostgreSQL via PostgREST."""
    if not settings.SUPABASE_URL or not settings.SUPABASE_KEY:
        return False
    
    url = f"{settings.SUPABASE_URL.rstrip('/')}/rest/v1/authoritative_alerts"
    headers = {
        "apikey": settings.SUPABASE_KEY,
        "Authorization": f"Bearer {settings.SUPABASE_KEY}",
        "Content-Type": "application/json",
        "Prefer": "resolution=merge-duplicates"
    }
    
    payload = {
        "id": alert_data.get("id"),
        "event": alert_data.get("event"),
        "headline": alert_data.get("headline"),
        "severity": alert_data.get("severity"),
        "urgency": alert_data.get("urgency"),
        "certainty": alert_data.get("certainty"),
        "sender": alert_data.get("sender"),
        "area_desc": alert_data.get("area_desc"),
        "effective": alert_data.get("effective"),
        "expires": alert_data.get("expires"),
        "polygons_json": alert_data.get("polygons_json"),
        "circles_json": alert_data.get("circles_json"),
        "geocodes_json": alert_data.get("geocodes_json"),
        "status": alert_data.get("status", "Actual")
    }
    
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            resp = await client.post(url, headers=headers, json=payload)
            if resp.status_code in (200, 201):
                logger.info(f"Mirrored alert {payload['id']} to Supabase cloud.")
                return True
            else:
                logger.warning(f"Supabase alert sync returned status {resp.status_code}: {resp.text}")
                return False
    except Exception as e:
        logger.debug(f"Failed to sync alert to Supabase: {e}")
        return False


async def fetch_supabase_saved_locations(user_id: str) -> List[Dict[str, Any]]:
    """Retrieve saved locations for a user or device from Supabase."""
    if not settings.SUPABASE_URL or not settings.SUPABASE_KEY:
        return []
        
    url = f"{settings.SUPABASE_URL.rstrip('/')}/rest/v1/saved_locations?user_id=eq.{user_id}&select=*"
    headers = {
        "apikey": settings.SUPABASE_KEY,
        "Authorization": f"Bearer {settings.SUPABASE_KEY}",
    }
    
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            resp = await client.get(url, headers=headers)
            if resp.status_code == 200:
                return resp.json()
    except Exception as e:
        logger.debug(f"Failed to fetch saved locations from Supabase: {e}")
        
    return []
