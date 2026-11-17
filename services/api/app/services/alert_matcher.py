"""Alert matching engine, background syncing, and push dispatcher."""
import json
from datetime import datetime, timezone
from typing import Dict, List, Optional, Tuple

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from services.api.app.adapters.aggregator import global_alert_aggregator
from services.api.app.adapters.geo_utils import haversine_distance_km
from services.api.app.db.models import AlertRecord, NotificationDelivery, PushSubscription
from services.api.app.schemas.global_alerts import GlobalAlertItem
from services.api.app.services.push_service import send_web_push

SEVERITY_LEVELS = {
    "Unknown": 0,
    "Minor": 1,
    "Moderate": 2,
    "Severe": 3,
    "Extreme": 4,
}


def is_severity_eligible(alert_sev: str, min_sev: str) -> bool:
    """Check if alert severity meets or exceeds the subscription's minimum threshold."""
    alert_rank = SEVERITY_LEVELS.get(alert_sev, 0)
    min_rank = SEVERITY_LEVELS.get(min_sev, 2)
    return alert_rank >= min_rank


def is_alert_expired(expires_str: Optional[str]) -> bool:
    """Check if the alert timestamp indicates it is expired."""
    if not expires_str:
        return False
    try:
        # Standard ISO timestamp parsing
        exp_dt = datetime.fromisoformat(expires_str.replace("Z", "+00:00"))
        return exp_dt < datetime.now(timezone.utc)
    except Exception:
        return False


def is_geographic_match(
    sub_country: Optional[str],
    sub_lat: Optional[float],
    sub_lon: Optional[float],
    sub_radius: float,
    alert: GlobalAlertItem,
) -> Tuple[bool, Optional[float]]:
    """Determine geographic eligibility strictly from documented coverage.
    
    Returns:
        (is_match: bool, distance_km: float | None)
    """
    # 1. Direct country code match if specified
    if sub_country and alert.country_code:
        if sub_country.upper() == alert.country_code.upper():
            return True, None

    # 2. Coordinate proximity check if coordinates exist on both
    if (
        sub_lat is not None
        and sub_lon is not None
        and alert.latitude is not None
        and alert.longitude is not None
    ):
        dist = haversine_distance_km(sub_lat, sub_lon, alert.latitude, alert.longitude)
        if dist <= sub_radius:
            return True, dist
        return False, dist

    # 3. If subscription has country code but alert lacks country code: no match
    if sub_country and not alert.country_code:
        return False, None

    # 4. If subscription has only coordinates and alert has only country code:
    # Do not invent arbitrary bounding or assume proximity
    return False, None


async def sync_upstream_alerts_to_db(db: AsyncSession) -> List[GlobalAlertItem]:
    """Fetch genuine active alerts from upstream providers (WMO SWIC, GDACS, Alert-Hub) and cache them in DB."""
    response = await global_alert_aggregator.get_all_alerts()
    all_alerts: List[GlobalAlertItem] = (
        response.official_cap_warnings + response.gdacs_disaster_alerts
    )

    for item in all_alerts:
        stmt = select(AlertRecord).where(AlertRecord.id == item.id)
        res = await db.execute(stmt)
        existing = res.scalars().first()

        if existing:
            existing.headline = item.headline
            existing.severity = item.severity
            existing.urgency = item.urgency
            existing.certainty = item.certainty
            existing.local_color_code = item.local_color_code
            existing.language = item.language
            existing.msg_type = item.msg_type
            existing.description = item.description
            existing.effective_time = item.effective_time
            existing.expires_time = item.expires_time
            existing.affected_area = item.affected_area
            existing.latitude = item.latitude
            existing.longitude = item.longitude
            existing.is_active = True
            existing.retrieved_at = datetime.now(timezone.utc)
        else:
            rec = AlertRecord(
                id=item.id,
                source_provider=item.source_provider,
                alert_type=item.alert_type,
                event=item.event,
                headline=item.headline,
                severity=item.severity,
                urgency=item.urgency,
                certainty=item.certainty,
                local_color_code=item.local_color_code,
                language=item.language,
                msg_type=item.msg_type,
                issuer=item.issuer,
                country_code=item.country_code,
                affected_area=item.affected_area,
                latitude=item.latitude,
                longitude=item.longitude,
                effective_time=item.effective_time,
                expires_time=item.expires_time,
                description=item.description,
                source_url=item.source_url,
                raw_json=json.dumps(item.model_dump()),
                retrieved_at=datetime.now(timezone.utc),
                is_active=True,
            )
            db.add(rec)

    await db.commit()
    return all_alerts


async def process_and_dispatch_active_alerts(db: AsyncSession) -> Dict[str, int]:
    """Match active genuine alerts against eligible subscriptions and dispatch notifications."""
    alerts = await sync_upstream_alerts_to_db(db)

    # Fetch all active subscriptions
    stmt = select(PushSubscription).where(PushSubscription.is_active.is_(True))
    res = await db.execute(stmt)
    subscriptions = res.scalars().all()

    stats = {
        "active_alerts_scanned": len(alerts),
        "subscriptions_scanned": len(subscriptions),
        "notifications_dispatched": 0,
        "duplicates_skipped": 0,
        "expired_skipped": 0,
        "filtered_skipped": 0,
    }

    for alert in alerts:
        # Check expiry
        if is_alert_expired(alert.expires_time):
            stats["expired_skipped"] += 1
            continue

        for sub in subscriptions:
            # Parse subscription categories
            try:
                sub_cats = json.loads(sub.categories)
            except Exception:
                sub_cats = ["OFFICIAL_CAP_WARNING", "GDACS_DISASTER_ALERT"]

            # Category filter
            if alert.alert_type not in sub_cats:
                stats["filtered_skipped"] += 1
                continue

            # Severity filter
            if not is_severity_eligible(alert.severity, sub.min_severity):
                stats["filtered_skipped"] += 1
                continue

            # Geographic match
            geo_match, dist = is_geographic_match(
                sub.country_code,
                sub.latitude,
                sub.longitude,
                sub.radius_km,
                alert,
            )
            if not geo_match:
                stats["filtered_skipped"] += 1
                continue

            # Check Idempotency / Deduplication
            idempotency_key = f"{sub.id}:{alert.id}"
            deliv_stmt = select(NotificationDelivery).where(
                NotificationDelivery.idempotency_key == idempotency_key
            )
            deliv_res = await db.execute(deliv_stmt)
            if deliv_res.scalars().first():
                stats["duplicates_skipped"] += 1
                continue

            # Prepare real alert payload
            push_payload = {
                "id": alert.id,
                "title": f"🚨 {alert.event} — {alert.severity}",
                "body": f"{alert.headline} ({alert.affected_area})",
                "url": f"/alerts/{alert.id}",
                "severity": alert.severity,
                "provider": alert.source_provider,
                "retrieved_at": datetime.now(timezone.utc).isoformat(),
                "tag": f"alert-{alert.id}",
            }

            # Send push
            success, code, err = send_web_push(
                endpoint=sub.endpoint,
                p256dh=sub.p256dh,
                auth=sub.auth,
                payload=push_payload,
            )

            # Record delivery
            delivery = NotificationDelivery(
                subscription_id=sub.id,
                alert_id=alert.id,
                idempotency_key=idempotency_key,
                status="SUCCESS" if success else "FAILED",
                http_status=code,
                error_message=err,
            )
            db.add(delivery)

            # If client endpoint is expired or unregistered, deactivate subscription
            if code in (404, 410):
                sub.is_active = False

            stats["notifications_dispatched"] += 1

    await db.commit()
    return stats
