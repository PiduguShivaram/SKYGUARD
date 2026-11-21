"""Alert matching engine, background syncing, and push dispatcher."""
import json
from datetime import datetime, timedelta, timezone
from typing import Dict, List, Optional, Tuple

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from services.api.app.adapters.aggregator import global_alert_aggregator
from services.api.app.adapters.geo_utils import haversine_distance_km
from services.api.app.config import settings
from services.api.app.db.models import AlertRecord, NotificationDelivery, PushSubscription
from services.api.app.schemas.global_alerts import GlobalAlertItem
from services.api.app.services.geo_matcher import evaluate_alert_spatial_match
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
    """Determine geographic eligibility strictly from documented coverage."""
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

        poly_json = json.dumps(item.polygons) if item.polygons else None

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
            existing.polygons_json = poly_json
            existing.is_country_wide = item.is_country_wide
            existing.geographic_status = item.geographic_status
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
                polygons_json=poly_json,
                is_country_wide=item.is_country_wide,
                geographic_status=item.geographic_status,
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

            # Verified Geographic Matching (Strict Point-in-Polygon & Category Delineation)
            geo_match, match_reason, dist = evaluate_alert_spatial_match(
                sub_country=sub.country_code,
                sub_lat=sub.latitude,
                sub_lon=sub.longitude,
                sub_radius_km=sub.radius_km,
                wants_country_wide=bool(sub.wants_country_wide),
                alert_country_code=alert.country_code,
                alert_area_desc=alert.affected_area,
                alert_headline=alert.headline,
                alert_lat=alert.latitude,
                alert_lon=alert.longitude,
                alert_polygons_str=alert.polygons,
                alert_circle_str=None,
                alert_is_country_wide=alert.is_country_wide,
                alert_geographic_status=alert.geographic_status,
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
            push_res = send_web_push(
                endpoint=sub.endpoint,
                p256dh=sub.p256dh,
                auth=sub.auth,
                payload=push_payload,
            )
            success = push_res[0]
            code = push_res[1]
            err = push_res[2]
            receipt = push_res[3] if len(push_res) > 3 else f"GATEWAY_HTTP_{code}"
            gateway_status = push_res[4] if len(push_res) > 4 else ("GATEWAY_ACCEPTED" if success else "TRANSIENT_FAILURE")

            # Determine delivery status and retry backoff
            if success:
                delivery_status = "GATEWAY_ACCEPTED"
                retry_count = 0
                next_retry = None
            elif code in (404, 410):
                delivery_status = "PERMANENT_FAILURE"
                retry_count = 0
                next_retry = None
                sub.is_active = False  # Deactivate permanently dead subscription
            else:
                delivery_status = "TRANSIENT_FAILURE"
                retry_count = 1
                backoff_sec = settings.RETRY_BACKOFF_BASE_SECONDS
                next_retry = datetime.now(timezone.utc) + timedelta(seconds=backoff_sec)

            # Record delivery
            delivery = NotificationDelivery(
                subscription_id=sub.id,
                alert_id=alert.id,
                idempotency_key=idempotency_key,
                status=delivery_status,
                http_status=code,
                error_message=err,
                gateway_receipt=f"HTTP_{code}" if code else None,
                retry_count=retry_count,
                next_retry_at=next_retry,
            )
            db.add(delivery)
            stats["notifications_dispatched"] += 1

    await db.commit()
    return stats


async def retry_transient_deliveries(db: AsyncSession) -> Dict[str, int]:
    """Retry deliveries that previously experienced transient network or rate-limit failures."""
    now = datetime.now(timezone.utc)
    stmt = (
        select(NotificationDelivery)
        .where(
            NotificationDelivery.status == "TRANSIENT_FAILURE",
            NotificationDelivery.retry_count < settings.MAX_DELIVERY_RETRIES,
            NotificationDelivery.next_retry_at <= now,
        )
    )
    res = await db.execute(stmt)
    pending_deliveries = res.scalars().all()

    stats = {
        "transient_scanned": len(pending_deliveries),
        "retry_succeeded": 0,
        "retry_failed": 0,
        "deactivated": 0,
    }

    for delivery in pending_deliveries:
        # Resolve subscription and alert
        sub_stmt = select(PushSubscription).where(PushSubscription.id == delivery.subscription_id)
        sub_res = await db.execute(sub_stmt)
        sub = sub_res.scalars().first()

        alert_stmt = select(AlertRecord).where(AlertRecord.id == delivery.alert_id)
        alert_res = await db.execute(alert_stmt)
        alert = alert_res.scalars().first()

        if not sub or not sub.is_active:
            delivery.status = "PERMANENT_FAILURE"
            delivery.error_message = "Subscription inactive or missing"
            stats["deactivated"] += 1
            continue

        if not alert or not alert.is_active or is_alert_expired(alert.expires_time):
            delivery.status = "PERMANENT_FAILURE"
            delivery.error_message = "Alert expired or inactive"
            stats["retry_failed"] += 1
            continue

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

        # Re-verify geographic and severity eligibility before retrying in case subscription preferences/location changed
        categories = json.loads(sub.categories) if isinstance(sub.categories, str) else (sub.categories or [])
        if alert.alert_type not in categories:
            delivery.status = "FILTERED_OUT"
            delivery.error_message = f"Alert type {alert.alert_type} not in subscription categories"
            continue

        if not is_severity_eligible(alert.severity, sub.min_severity):
            delivery.status = "FILTERED_OUT"
            delivery.error_message = f"Alert severity {alert.severity} below minimum {sub.min_severity}"
            continue

        geo_match = evaluate_alert_spatial_match(
            sub_country=sub.country_code,
            sub_lat=sub.latitude,
            sub_lon=sub.longitude,
            sub_radius_km=sub.radius_km,
            wants_country_wide=bool(sub.wants_country_wide),
            alert_country_code=alert.country_code,
            alert_area_desc=alert.affected_area,
            alert_headline=alert.headline,
            alert_lat=alert.latitude,
            alert_lon=alert.longitude,
            alert_polygons_str=getattr(alert, "polygons_json", None) or getattr(alert, "polygons", None),
            alert_circle_str=None,
            alert_is_country_wide=getattr(alert, "is_country_wide", False),
            alert_geographic_status=getattr(alert, "geographic_status", "LOCATION_VERIFIED"),
        )
        if not geo_match:
            delivery.status = "FILTERED_OUT"
            delivery.error_message = "Subscription location or preferences no longer match alert"
            continue

        push_res = send_web_push(
            endpoint=sub.endpoint,
            p256dh=sub.p256dh,
            auth=sub.auth,
            payload=push_payload,
        )
        success = push_res[0]
        code = push_res[1]
        err = push_res[2]
        receipt = push_res[3] if len(push_res) > 3 else f"RETRY_HTTP_{code}"
        gateway_status = push_res[4] if len(push_res) > 4 else ("GATEWAY_ACCEPTED" if success else "TRANSIENT_FAILURE")

        delivery.http_status = code
        delivery.gateway_receipt = receipt

        if success:
            delivery.status = "GATEWAY_ACCEPTED"
            delivery.error_message = None
            stats["retry_succeeded"] += 1
        elif code in (404, 410):
            delivery.status = "PERMANENT_FAILURE"
            delivery.error_message = err
            sub.is_active = False
            stats["deactivated"] += 1
        else:
            delivery.retry_count += 1
            delivery.error_message = err
            if delivery.retry_count >= settings.MAX_DELIVERY_RETRIES:
                delivery.status = "PERMANENT_FAILURE"
            else:
                backoff_sec = settings.RETRY_BACKOFF_BASE_SECONDS * (2 ** delivery.retry_count)
                delivery.next_retry_at = datetime.now(timezone.utc) + timedelta(seconds=backoff_sec)
            stats["retry_failed"] += 1

    await db.commit()
    return stats
