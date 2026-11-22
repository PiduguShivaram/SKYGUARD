"""Alert matching engine, background syncing, and push dispatcher."""
import json
import secrets
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional, Tuple

from sqlalchemy import or_, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from services.api.app.adapters.aggregator import global_alert_aggregator
from services.api.app.adapters.geo_utils import haversine_distance_km
from services.api.app.config import settings
from services.api.app.db.models import AlertRecord, NotificationDelivery, PushSubscription
from services.api.app.schemas.global_alerts import GlobalAlertItem
from services.api.app.services.geo_matcher import evaluate_alert_spatial_match
from services.api.app.services.push_service import send_web_push
from services.api.app.services.supabase_sync import sync_alert_to_supabase

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

    now = datetime.now(timezone.utc)
    incoming_ids_by_provider: Dict[str, set] = {}

    for item in all_alerts:
        prov = item.source_provider
        if prov not in incoming_ids_by_provider:
            incoming_ids_by_provider[prov] = set()
        incoming_ids_by_provider[prov].add(item.id)

        # Deactivate referenced superseded alerts if this is an Update or Cancel or has references
        if item.references:
            ref_tokens = item.references.replace(",", " ").split()
            for token in ref_tokens:
                ref_id_candidates = [token, f"WMO-{token}", f"AlertHub-{token}"]
                for rc in ref_id_candidates:
                    ref_stmt = select(AlertRecord).where(AlertRecord.id == rc)
                    ref_res = await db.execute(ref_stmt)
                    ref_rec = ref_res.scalars().first()
                    if ref_rec:
                        ref_rec.is_active = False

        # Expiry and cancellation checks
        is_expired = is_alert_expired(item.expires_time)
        is_cancel = (item.msg_type == "Cancel")
        active_status = (not is_expired) and (not is_cancel)

        stmt = select(AlertRecord).where(AlertRecord.id == item.id)
        res = await db.execute(stmt)
        existing = res.scalars().first()

        poly_json = json.dumps(item.polygons) if item.polygons else None
        circle_json = json.dumps(item.circles) if getattr(item, "circles", None) else None

        if existing:
            existing.headline = item.headline
            existing.severity = item.severity
            existing.urgency = item.urgency
            existing.certainty = item.certainty
            existing.local_color_code = item.local_color_code
            existing.language = item.language
            existing.msg_type = item.msg_type
            existing.status = getattr(item, "status", "Actual")
            existing.scope = getattr(item, "scope", "Public")
            existing.references = getattr(item, "references", None)
            existing.description = item.description
            existing.effective_time = item.effective_time
            existing.expires_time = item.expires_time
            existing.affected_area = item.affected_area
            existing.latitude = item.latitude
            existing.longitude = item.longitude
            existing.polygons_json = poly_json
            existing.circles_json = circle_json
            existing.is_country_wide = item.is_country_wide
            existing.geographic_status = item.geographic_status
            existing.is_active = active_status
            existing.retrieved_at = now
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
                status=getattr(item, "status", "Actual"),
                scope=getattr(item, "scope", "Public"),
                references=getattr(item, "references", None),
                issuer=item.issuer,
                country_code=item.country_code,
                affected_area=item.affected_area,
                latitude=item.latitude,
                longitude=item.longitude,
                polygons_json=poly_json,
                circles_json=circle_json,
                is_country_wide=item.is_country_wide,
                geographic_status=item.geographic_status,
                effective_time=item.effective_time,
                expires_time=item.expires_time,
                description=item.description,
                source_url=item.source_url,
                raw_json=json.dumps(item.model_dump()),
                retrieved_at=now,
                is_active=active_status,
            )
            db.add(rec)

    # Provider-Aware Reconciliation:
    # ONLY reconcile providers whose health status is CONNECTED. If a provider is UNAVAILABLE, preserve active alerts.
    for prov_key, p_health in response.providers_health.items():
        if p_health.status.value == "CONNECTED":
            prov_name = p_health.provider_name
            seen_for_prov = incoming_ids_by_provider.get(prov_name, set())
            db_stmt = select(AlertRecord).where(
                AlertRecord.source_provider == prov_name,
                AlertRecord.is_active.is_(True),
            )
            db_res = await db.execute(db_stmt)
            for db_rec in db_res.scalars().all():
                if db_rec.id not in seen_for_prov:
                    # Dropped upstream or expired (ensure timezone-aware comparison)
                    r_at = db_rec.retrieved_at
                    if r_at and getattr(r_at, "tzinfo", None) is None:
                        r_at = r_at.replace(tzinfo=timezone.utc)
                    if is_alert_expired(db_rec.expires_time) or (r_at and r_at < now - timedelta(hours=2)):
                        db_rec.is_active = False

    await db.commit()

    # Mirror active authoritative alerts to Supabase for real-time WebSocket distribution
    for alert_item in all_alerts[:25]:
        if alert_item.severity in ("Extreme", "Severe", "Moderate"):
            try:
                await sync_alert_to_supabase({
                    "id": alert_item.id,
                    "event": alert_item.event,
                    "headline": alert_item.headline,
                    "severity": alert_item.severity,
                    "urgency": alert_item.urgency,
                    "certainty": alert_item.certainty,
                    "sender": alert_item.issuer,
                    "area_desc": alert_item.affected_area,
                    "effective": alert_item.effective_time,
                    "expires": alert_item.expires_time,
                    "polygons_json": json.dumps(alert_item.polygons) if alert_item.polygons else None,
                    "circles_json": json.dumps(getattr(alert_item, "circles", None)) if getattr(alert_item, "circles", None) else None,
                    "status": getattr(alert_item, "status", "Actual"),
                })
            except Exception:
                pass

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

        # Exclude test, exercise, cancelled, or non-public alerts from public emergency dispatch
        status_val = getattr(alert, "status", "Actual")
        scope_val = getattr(alert, "scope", "Public")
        if (
            alert.msg_type not in ("Alert", "Update")
            or status_val != "Actual"
            or scope_val != "Public"
        ):
            stats["filtered_skipped"] += 1
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

            # Extract official CAP circles if present (SG-14: evaluate all circles)
            circles_list = alert.circles if getattr(alert, "circles", None) else None

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
                alert_circles_str=circles_list,
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
            existing = deliv_res.scalars().first()
            if existing:
                # Automatic recovery of stale abandoned claims
                if (
                    existing.status == "CLAIMED"
                    and existing.locked_at
                    and existing.locked_at < (datetime.now(timezone.utc) - timedelta(minutes=5))
                ):
                    existing.status = "TRANSIENT_FAILURE"
                    existing.locked_by = None
                    existing.locked_at = None
                    existing.error_message = "Recovered stale worker reservation during active dispatch cycle"
                    await db.commit()
                stats["duplicates_skipped"] += 1
                continue

            # Automatic Emergency Dispatch Safety Gate
            if not settings.ENABLE_AUTOMATIC_EMERGENCY_DISPATCH:
                # Emergency dispatch is disabled until production verification sign-off
                stats["filtered_skipped"] += 1
                continue

            # 1. Transactional reservation before network dispatch (SG-06 / P0-6)
            # Create and commit a locked claim in database first
            worker_token = f"worker_{secrets.token_hex(6)}"
            claim_time = datetime.now(timezone.utc)
            reservation = NotificationDelivery(
                subscription_id=sub.id,
                alert_id=alert.id,
                idempotency_key=idempotency_key,
                status="CLAIMED",
                http_status=0,
                locked_by=worker_token,
                locked_at=claim_time,
                retry_count=0,
            )
            db.add(reservation)
            try:
                await db.commit()
            except Exception:
                await db.rollback()
                stats["duplicates_skipped"] += 1
                continue

            # 2. Prepare real alert payload
            push_payload = {
                "id": alert.id,
                "title": f"🚨 {alert.event} — {alert.severity}",
                "body": f"{alert.headline} ({alert.affected_area})",
                "url": f"/alerts/{alert.id}",
                "severity": alert.severity,
                "provider": alert.source_provider,
                "retrieved_at": claim_time.isoformat(),
                "tag": f"alert-{alert.id}",
            }

            # 3. Send push over network (guaranteed only once across distributed workers)
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

            # 4. Update reservation with confirmed outcome
            reservation.status = delivery_status
            reservation.http_status = code
            reservation.error_message = err
            reservation.gateway_receipt = receipt
            reservation.retry_count = retry_count
            reservation.next_retry_at = next_retry
            reservation.locked_by = None
            reservation.locked_at = None
            await db.commit()
            stats["notifications_dispatched"] += 1

    return stats


async def recover_abandoned_claims(
    db: AsyncSession, stale_minutes: int = 5
) -> Dict[str, int]:
    """
    Recover notification deliveries stuck in CLAIMED status due to worker crash, timeout, or SIGTERM (SG-06/P0-6 recovery).
    Resets abandoned claims to TRANSIENT_FAILURE so they can be retried safely.
    """
    now = datetime.now(timezone.utc)
    stale_cutoff = now - timedelta(minutes=stale_minutes)

    stmt = (
        select(NotificationDelivery)
        .where(
            NotificationDelivery.status == "CLAIMED",
            NotificationDelivery.locked_at < stale_cutoff,
        )
    )
    res = await db.execute(stmt)
    abandoned_records = res.scalars().all()

    recovered_count = 0
    permanently_failed_count = 0

    for deliv in abandoned_records:
        if deliv.retry_count < settings.MAX_DELIVERY_RETRIES:
            deliv.status = "TRANSIENT_FAILURE"
            deliv.error_message = (
                f"Recovered from abandoned worker reservation (locked at {deliv.locked_at}). "
                "Notice: Ambiguous delivery state; retrying with at-least-once delivery semantics."
            )
            deliv.next_retry_at = now
            deliv.locked_by = None
            deliv.locked_at = None
            deliv.retry_count += 1
            recovered_count += 1
        else:
            deliv.status = "PERMANENT_FAILURE"
            deliv.error_message = f"Abandoned worker claim exceeded max retries ({deliv.retry_count})"
            deliv.locked_by = None
            deliv.locked_at = None
            permanently_failed_count += 1

    if abandoned_records:
        await db.commit()

    return {
        "abandoned_scanned": len(abandoned_records),
        "recovered_for_retry": recovered_count,
        "permanently_failed": permanently_failed_count,
    }


async def retry_transient_deliveries(db: AsyncSession) -> Dict[str, Any]:
    """Retry deliveries that previously experienced transient network or rate-limit failures (SG-12)."""
    # 1. Automatic Reaper: Recover any abandoned worker claims first
    abandoned_stats = await recover_abandoned_claims(db)

    # Enforce Universal Safety Gate: If emergency dispatch is disabled, retries must NOT send live messages
    if not settings.ENABLE_AUTOMATIC_EMERGENCY_DISPATCH:
        return {
            "abandoned_recovered": abandoned_stats.get("recovered_for_retry", 0),
            "transient_scanned": 0,
            "retry_succeeded": 0,
            "retry_failed": 0,
            "deactivated": 0,
            "safety_gate": "AUTOMATIC_DISPATCH_DISABLED",
        }

    now = datetime.now(timezone.utc)
    stale_cutoff = now - timedelta(minutes=5)
    worker_id = f"worker-{secrets.token_hex(6)}"

    # Atomic Worker Claim (Concurrency-Safe Distributed Worker Gate):
    # Lock pending transient delivery tasks so competing workers cannot claim the same record
    claim_stmt = (
        update(NotificationDelivery)
        .where(
            NotificationDelivery.status == "TRANSIENT_FAILURE",
            NotificationDelivery.retry_count < settings.MAX_DELIVERY_RETRIES,
            NotificationDelivery.next_retry_at <= now,
            or_(
                NotificationDelivery.locked_at.is_(None),
                NotificationDelivery.locked_at < stale_cutoff,
            ),
        )
        .values(
            locked_by=worker_id,
            locked_at=now,
        )
    )
    await db.execute(claim_stmt)
    await db.commit()

    # Query only deliveries atomically claimed by this worker
    stmt = (
        select(NotificationDelivery)
        .where(NotificationDelivery.locked_by == worker_id)
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
            delivery.locked_by = None
            delivery.locked_at = None
            stats["deactivated"] += 1
            await db.commit()
            continue

        if not alert or not alert.is_active or is_alert_expired(alert.expires_time):
            delivery.status = "PERMANENT_FAILURE"
            delivery.error_message = "Alert expired or inactive"
            delivery.locked_by = None
            delivery.locked_at = None
            stats["retry_failed"] += 1
            await db.commit()
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
            delivery.locked_by = None
            delivery.locked_at = None
            await db.commit()
            continue

        if not is_severity_eligible(alert.severity, sub.min_severity):
            delivery.status = "FILTERED_OUT"
            delivery.error_message = f"Alert severity {alert.severity} below minimum {sub.min_severity}"
            delivery.locked_by = None
            delivery.locked_at = None
            await db.commit()
            continue

        # Decode alert.polygons_json before assigning alert_polygons_str
        polygons_list = None
        raw_polygons = getattr(alert, "polygons_json", None)
        if raw_polygons:
            if isinstance(raw_polygons, list):
                polygons_list = raw_polygons
            elif isinstance(raw_polygons, str):
                try:
                    loaded = json.loads(raw_polygons)
                    polygons_list = loaded if isinstance(loaded, list) else None
                except Exception:
                    polygons_list = None
        elif hasattr(alert, "polygons") and getattr(alert, "polygons", None):
            polygons_list = getattr(alert, "polygons")

        # Decode alert.circles_json before assigning circles_list (SG-14: evaluate all circles)
        circles_list = None
        raw_circles = getattr(alert, "circles_json", None)
        if raw_circles:
            if isinstance(raw_circles, list):
                circles_list = raw_circles
            elif isinstance(raw_circles, str):
                try:
                    loaded_c = json.loads(raw_circles)
                    circles_list = loaded_c if isinstance(loaded_c, list) else None
                except Exception:
                    circles_list = None
        elif hasattr(alert, "circles") and getattr(alert, "circles", None):
            circles_list = getattr(alert, "circles")

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
            alert_polygons_str=polygons_list,
            alert_circles_str=circles_list,
            alert_is_country_wide=getattr(alert, "is_country_wide", False),
            alert_geographic_status=getattr(alert, "geographic_status", "LOCATION_VERIFIED"),
        )
        if not geo_match:
            delivery.status = "FILTERED_OUT"
            delivery.error_message = f"Subscription location or preferences no longer match alert: {match_reason}"
            delivery.locked_by = None
            delivery.locked_at = None
            await db.commit()
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
        delivery.locked_by = None
        delivery.locked_at = None

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
                delivery.status = "TRANSIENT_FAILURE"
            stats["retry_failed"] += 1

        await db.commit()

    return stats
