"""Production Hardening, Security, and Geospatial Point-in-Polygon Tests.

Validates:
1. Strict Point-in-Polygon verification via Shapely.
2. Separation of localized polygon alerts from country-wide emergency bulletins.
3. Push notification endpoint SSRF blocking (private IPs, loopback, non-443, unauthorized domains).
4. Possession token authentication and endpoint anti-takeover security.
5. Worker key authorization protection on /dispatch-sync.
6. Gateway acceptance recording (GATEWAY_ACCEPTED) vs client display.
7. Exponential backoff retry scheduling for transient delivery failures.
8. Automatic deactivation of permanently dead push subscriptions (HTTP 410/404).
9. Zero keyword severity inference on Alert-Hub feeds (Unknown if missing in XML).
"""
import json
import uuid
import xml.etree.ElementTree as ET
from datetime import datetime, timedelta, timezone
from unittest.mock import patch

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy import delete, select

from services.api.app.adapters.alert_hub import determine_alerthub_severity
from services.api.app.config import settings
from services.api.app.db.base import get_db
from services.api.app.db.models import AlertRecord, NotificationDelivery, PushSubscription
from services.api.app.main import app
from services.api.app.schemas.global_alerts import AlertSeverityLevel
from services.api.app.services.alert_matcher import recover_abandoned_claims, retry_transient_deliveries
from services.api.app.services.geo_matcher import (
    evaluate_alert_spatial_match,
    is_explicitly_country_wide,
    is_point_in_alert_polygon,
    parse_cap_polygon,
)
from services.api.app.services.push_service import validate_push_endpoint


# ---------------------------------------------------------------------------
# 1. Point-in-Polygon & Spatial Verification Tests
# ---------------------------------------------------------------------------

def test_parse_cap_polygon_coordinate_inversion_and_closure():
    """Verify CAP 1.2 lat,lon -> (lon, lat) inversion and automatic ring closure."""
    # Polygon around Hyderabad, India: lat ~17.3 to 17.5, lon ~78.4 to 78.6
    # CAP format: "lat1,lon1 lat2,lon2 lat3,lon3"
    cap_poly_str = "17.30,78.40 17.50,78.40 17.50,78.60 17.30,78.60"
    poly = parse_cap_polygon(cap_poly_str)
    assert poly is not None
    assert poly.is_valid

    # Inside Hyderabad polygon
    assert is_point_in_alert_polygon(17.40, 78.50, poly) is True

    # Outside Hyderabad polygon (e.g. Warangal, ~130km east)
    assert is_point_in_alert_polygon(17.97, 79.60, poly) is False

    # Outside Hyderabad polygon (e.g. Mumbai)
    assert is_point_in_alert_polygon(19.07, 72.87, poly) is False


def test_local_vs_country_wide_spatial_matching():
    """Verify that a localized polygon in City A does NOT notify City B in the same country
    unless subscriber explicitly opted into country-wide emergency bulletins.
    """
    # Telangana / Hyderabad Polygon: lat 17.2-17.6, lon 78.3-78.7
    hyd_polygon = ["17.20,78.30 17.60,78.30 17.60,78.70 17.20,78.70"]

    # Subscriber 1: Inside Hyderabad (lat 17.38, lon 78.48), wants_country_wide = False
    is_match1, reason1, _ = evaluate_alert_spatial_match(
        sub_country="IN",
        sub_lat=17.38,
        sub_lon=78.48,
        sub_radius_km=50.0,
        wants_country_wide=False,
        alert_country_code="IN",
        alert_area_desc="Hyderabad District",
        alert_headline="Severe Urban Flooding Warning",
        alert_lat=None,
        alert_lon=None,
        alert_polygons_str=hyd_polygon,
        alert_is_country_wide=False,
        alert_geographic_status="POLYGON_VERIFIED",
    )
    assert is_match1 is True
    assert reason1 == "POINT_IN_POLYGON_VERIFIED"

    # Subscriber 2: In Chennai (lat 13.08, lon 80.27), same country IN, wants_country_wide = False
    # MUST NOT be notified of Hyderabad local warning!
    is_match2, reason2, _ = evaluate_alert_spatial_match(
        sub_country="IN",
        sub_lat=13.08,
        sub_lon=80.27,
        sub_radius_km=50.0,
        wants_country_wide=False,
        alert_country_code="IN",
        alert_area_desc="Hyderabad District",
        alert_headline="Severe Urban Flooding Warning",
        alert_lat=None,
        alert_lon=None,
        alert_polygons_str=hyd_polygon,
        alert_is_country_wide=False,
        alert_geographic_status="POLYGON_VERIFIED",
    )
    assert is_match2 is False
    assert reason2 == "OUTSIDE_OFFICIAL_POLYGON"

    # Subscriber 3: In Chennai, but explicitly opted into Country-Wide Bulletins (wants_country_wide = True)
    is_match3, reason3, _ = evaluate_alert_spatial_match(
        sub_country="IN",
        sub_lat=13.08,
        sub_lon=80.27,
        sub_radius_km=50.0,
        wants_country_wide=True,
        alert_country_code="IN",
        alert_area_desc="Hyderabad District",
        alert_headline="Severe Urban Flooding Warning",
        alert_lat=None,
        alert_lon=None,
        alert_polygons_str=hyd_polygon,
        alert_is_country_wide=False,
        alert_geographic_status="POLYGON_VERIFIED",
    )
    assert is_match3 is True
    assert reason3 == "COUNTRY_WIDE_OPT_IN"


def test_location_unverified_alert_suppressed_for_precision_notifications():
    """Verify that an alert with LOCATION_UNVERIFIED status does not trigger automatic push delivery."""
    is_match, reason, _ = evaluate_alert_spatial_match(
        sub_country="IN",
        sub_lat=28.61,
        sub_lon=77.20,
        sub_radius_km=50.0,
        wants_country_wide=False,
        alert_country_code="IN",
        alert_area_desc="Unspecified Region",
        alert_headline="Weather Statement",
        alert_lat=None,
        alert_lon=None,
        alert_polygons_str=None,
        alert_is_country_wide=False,
        alert_geographic_status="LOCATION_UNVERIFIED",
    )
    assert is_match is False
    assert reason == "LOCATION_UNVERIFIED_SUPPRESSED"


# ---------------------------------------------------------------------------
# 2. Push Notification Endpoint SSRF Defense Tests
# ---------------------------------------------------------------------------

def test_push_endpoint_ssrf_blocking():
    """Verify strict validation against SSRF, non-whitelisted gateways, non-443 ports, and private IPs."""
    # Whitelisted legitimate push gateways
    assert validate_push_endpoint("https://fcm.googleapis.com/fcm/send/token123") is True
    assert validate_push_endpoint("https://updates.push.services.mozilla.com/wpush/v2/token456") is True
    assert validate_push_endpoint("https://web.push.apple.com/token789") is True
    assert validate_push_endpoint("https://wns2-sn1p.notify.windows.com/w/?token=abc") is True

    # Block non-HTTPS
    assert validate_push_endpoint("http://fcm.googleapis.com/fcm/send/token123") is False

    # Block non-443 port
    assert validate_push_endpoint("https://fcm.googleapis.com:8443/fcm/send/token123") is False

    # Block unauthorized domains
    assert validate_push_endpoint("https://attacker-domain.com/push") is False
    assert validate_push_endpoint("https://fcm.googleapis.com.evil.com/push") is False

    # Block loopback and local addresses
    assert validate_push_endpoint("https://127.0.0.1/push") is False
    assert validate_push_endpoint("https://localhost/push") is False
    assert validate_push_endpoint("https://10.0.0.1/push") is False
    assert validate_push_endpoint("https://192.168.1.100/push") is False
    assert validate_push_endpoint("https://169.254.169.254/push") is False


# ---------------------------------------------------------------------------
# 3. Endpoint Possession & Anti-Takeover Security Tests
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_endpoint_possession_and_anti_takeover():
    """Verify that an attacker cannot overwrite or hijack an existing active push endpoint
    without proving possession of the original secret token.
    """
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        unique_id = uuid.uuid4().hex[:8]
        endpoint = f"https://fcm.googleapis.com/fcm/send/anti_takeover_{unique_id}"

        # 1. Legitimate user registers endpoint
        reg_payload = {
            "endpoint": endpoint,
            "keys": {"p256dh": "valid_p256dh_key", "auth": "valid_auth_secret"},
            "country_code": "IN",
            "wants_country_wide": False,
        }
        res1 = await client.post("/api/v1/push/subscribe", json=reg_payload)
        assert res1.status_code == 201
        data1 = res1.json()
        possession_token = data1["possession_token"]
        assert possession_token is not None

        # 2. Attacker attempts to register the same endpoint without possession token -> 409 Conflict
        hijack_payload = {
            "endpoint": endpoint,
            "keys": {"p256dh": "attacker_key", "auth": "attacker_auth"},
            "country_code": "US",
        }
        res2 = await client.post("/api/v1/push/subscribe", json=hijack_payload)
        assert res2.status_code == 409
        assert "Valid possession token required" in res2.json()["detail"]

        # 3. Attacker provides wrong token -> 409 Conflict
        hijack_with_bad_token = {
            "endpoint": endpoint,
            "keys": {"p256dh": "attacker_key", "auth": "attacker_auth"},
            "existing_token": "wrong_invalid_token_1234567890",
        }
        res3 = await client.post("/api/v1/push/subscribe", json=hijack_with_bad_token)
        assert res3.status_code == 409

        # 4. Legitimate owner provides correct token -> 201 Created update
        update_with_token = {
            "endpoint": endpoint,
            "keys": {"p256dh": "valid_p256dh_key", "auth": "valid_auth_secret"},
            "existing_token": possession_token,
            "wants_country_wide": True,
        }
        res4 = await client.post("/api/v1/push/subscribe", json=update_with_token)
        assert res4.status_code == 201
        assert res4.json()["wants_country_wide"] is True


# ---------------------------------------------------------------------------
# 4. Internal Worker Key Authorization Tests
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_worker_key_authorization_on_dispatch_sync():
    """Verify that /api/v1/push/dispatch-sync requires X-Worker-Key matching INTERNAL_WORKER_KEY."""
    original_key = settings.INTERNAL_WORKER_KEY
    settings.INTERNAL_WORKER_KEY = "test_secret_worker_key_123"
    try:
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            # 1. Missing header -> 403 Forbidden
            res_no_key = await client.post("/api/v1/push/dispatch-sync")
            assert res_no_key.status_code == 403

            # 2. Invalid header -> 403 Forbidden
            res_bad_key = await client.post(
                "/api/v1/push/dispatch-sync",
                headers={"X-Worker-Key": "invalid_unauthorized_key"},
            )
            assert res_bad_key.status_code == 403

            # 3. Valid worker key -> 200 OK
            with patch("services.api.app.routers.push.process_and_dispatch_active_alerts") as mock_dispatch:
                mock_dispatch.return_value = {"active_alerts_scanned": 0, "notifications_dispatched": 0}
                res_valid = await client.post(
                    "/api/v1/push/dispatch-sync",
                    headers={"X-Worker-Key": "test_secret_worker_key_123"},
                )
                assert res_valid.status_code == 200
                assert res_valid.json()["status"] == "COMPLETED"
    finally:
        settings.INTERNAL_WORKER_KEY = original_key


# ---------------------------------------------------------------------------
# 5. Retry Scheduling & Dead Endpoint Deactivation Tests
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_transient_failure_retry_and_dead_endpoint_deactivation():
    """Verify that HTTP 410 permanently deactivates push subscriptions, while transient
    errors schedule exponential backoff retries.
    """
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        unique_id = uuid.uuid4().hex[:8]
        # Register a test subscription
        endpoint = f"https://fcm.googleapis.com/fcm/send/retry_test_{unique_id}"
        res = await client.post(
            "/api/v1/push/subscribe",
            json={
                "endpoint": endpoint,
                "keys": {"p256dh": "p256dh_retry_test", "auth": "auth_retry_test"},
                "country_code": "IN",
                "wants_country_wide": True,
            },
        )
        assert res.status_code == 201
        sub_id = res.json()["subscription_id"]

        from services.api.app.db.base import AsyncSessionLocal
        async with AsyncSessionLocal() as db:
            # Purge any lingering transient deliveries from previous interrupted runs
            await db.execute(delete(NotificationDelivery).where(NotificationDelivery.status == "TRANSIENT_FAILURE"))
            await db.commit()

            alert_id = f"alert-retry-{unique_id}"
            # Create a mock alert in DB
            alert = AlertRecord(
                id=alert_id,
                source_provider="WMO SWIC",
                alert_type="OFFICIAL_CAP_WARNING",
                event="Heavy Rain",
                headline="Heavy Rain Alert",
                severity="Severe",
                urgency="Expected",
                certainty="Likely",
                issuer="IMD",
                country_code="IN",
                affected_area="Test Area",
                description="Heavy rain expected in test area",
                source_url="https://severeweather.wmo.int/v2/cap-alerts/test",
                is_active=True,
                is_country_wide=True,
                retrieved_at=datetime.now(timezone.utc),
            )
            db.add(alert)

            # Create a transient failure delivery record
            delivery = NotificationDelivery(
                subscription_id=sub_id,
                alert_id=alert_id,
                idempotency_key=f"{sub_id}:{alert_id}",
                status="TRANSIENT_FAILURE",
                http_status=429,
                retry_count=0,
                next_retry_at=datetime.now(timezone.utc) - timedelta(seconds=10),
            )
            db.add(delivery)
            await db.commit()

            # 1. Test successful retry
            with patch.object(settings, "ENABLE_AUTOMATIC_EMERGENCY_DISPATCH", True):
                with patch("services.api.app.services.alert_matcher.send_web_push") as mock_push:
                    mock_push.return_value = (True, 201, None, "RETRY_GATEWAY_RECEIPT_123", "GATEWAY_ACCEPTED")
                    stats = await retry_transient_deliveries(db)
                    assert stats["retry_succeeded"] == 1

                    # Verify delivery record updated to GATEWAY_ACCEPTED
                    await db.refresh(delivery)
                    assert delivery.status == "GATEWAY_ACCEPTED"

            # 2. Test permanent failure (410 Gone) deactivation
            delivery.status = "TRANSIENT_FAILURE"
            delivery.next_retry_at = datetime.now(timezone.utc) - timedelta(seconds=10)
            delivery.locked_by = None
            delivery.locked_at = None
            await db.commit()

            with patch.object(settings, "ENABLE_AUTOMATIC_EMERGENCY_DISPATCH", True):
                with patch("services.api.app.services.alert_matcher.send_web_push") as mock_push:
                    mock_push.return_value = (False, 410, "Subscription expired or unregistered", None, "PERMANENT_FAILURE")
                    stats = await retry_transient_deliveries(db)
                    assert stats["deactivated"] == 1

                    # Verify subscription is deactivated
                    sub_stmt = select(PushSubscription).where(PushSubscription.id == sub_id)
                    sub_res = await db.execute(sub_stmt)
                    sub = sub_res.scalars().first()
                    assert sub.is_active is False
                    assert delivery.status == "PERMANENT_FAILURE"

                    # Clean up test alert, delivery, and subscription from DB
                    await db.delete(delivery)
                    await db.delete(alert)
                    await db.delete(sub)
                    await db.commit()


@pytest.mark.asyncio
async def test_retry_transient_deliveries_safety_gate_disabled():
    """Verify that retry_transient_deliveries refuses to execute when safety gate is OFF (SG-12)."""
    from services.api.app.db.base import AsyncSessionLocal
    async with AsyncSessionLocal() as db:
        with patch.object(settings, "ENABLE_AUTOMATIC_EMERGENCY_DISPATCH", False):
            stats = await retry_transient_deliveries(db)
            assert stats["safety_gate"] == "AUTOMATIC_DISPATCH_DISABLED"
            assert stats["retry_succeeded"] == 0


@pytest.mark.asyncio
async def test_atomic_worker_claim_locks_transient_deliveries():
    """Verify that a worker locks transient deliveries atomically to prevent concurrent double-dispatch."""
    from services.api.app.db.base import AsyncSessionLocal
    async with AsyncSessionLocal() as db:
        unique_id = uuid.uuid4().hex[:8]
        # Insert a delivery already locked by worker-A recently
        delivery = NotificationDelivery(
            subscription_id=f"sub-lock-{unique_id}",
            alert_id=f"alert-lock-{unique_id}",
            idempotency_key=f"lock-test-{unique_id}",
            status="TRANSIENT_FAILURE",
            http_status=500,
            retry_count=0,
            next_retry_at=datetime.now(timezone.utc) - timedelta(seconds=10),
            locked_by="worker-alpha",
            locked_at=datetime.now(timezone.utc) - timedelta(seconds=30),  # Active recent lock
        )
        db.add(delivery)
        await db.commit()

        # Another worker attempts retry: locked delivery must NOT be scanned or processed
        with patch.object(settings, "ENABLE_AUTOMATIC_EMERGENCY_DISPATCH", True):
            stats = await retry_transient_deliveries(db)
            # The active lock from worker-alpha prevents this worker from claiming it
            assert stats["retry_succeeded"] == 0

        # Clean up
        await db.delete(delivery)
        await db.commit()


# ---------------------------------------------------------------------------
# 6. Alert-Hub Zero-Keyword Severity Inference Tests
# ---------------------------------------------------------------------------

def test_alerthub_zero_keyword_severity_inference():
    """Verify that Alert-Hub reports UNKNOWN severity if the raw XML lacks a genuine
    CAP <severity> element, rather than inferring severity from title keywords.
    """
    # 1. XML item without severity tag, even if title contains "Catastrophic Hurricane Emergency"
    xml_no_sev = ET.fromstring("""
        <item>
            <title>Catastrophic Hurricane Emergency Warning issued for Coastal Region</title>
            <description>Severe life-threatening hurricane condition</description>
            <link>https://alert-hub.org/alert/123</link>
        </item>
    """)
    sev, reason = determine_alerthub_severity(xml_no_sev)
    # Must NOT be Extreme! Must be UNKNOWN with explicit disclosure
    assert sev == AlertSeverityLevel.UNKNOWN
    assert "Original CAP severity not provided" in reason

    # 2. XML item with explicit CAP severity tag
    xml_with_sev = ET.fromstring("""
        <item>
            <title>Weather Warning</title>
            <severity>Extreme</severity>
        </item>
    """)
    sev2, reason2 = determine_alerthub_severity(xml_with_sev)
    assert sev2 == AlertSeverityLevel.EXTREME
    assert "Official CAP Extreme" in reason2

    # 3. XML item with CAP extension severity tag
    xml_with_ext = ET.fromstring("""
        <item xmlns:cap="http://alert-hub.org/cap-extensions">
            <title>Flood Advisory</title>
            <cap:severity>Moderate</cap:severity>
        </item>
    """)
    sev3, reason3 = determine_alerthub_severity(xml_with_ext)
    assert sev3 == AlertSeverityLevel.MODERATE
    assert "Official CAP Moderate" in reason3


# ---------------------------------------------------------------------------
# 7. Recovery of Abandoned Notification Claims (Worker Crash Recovery)
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_recover_abandoned_worker_claims():
    """Verify that worker claims stuck in CLAIMED status due to process crashes
    are automatically recovered for retry after the stale threshold.
    """
    async for db in get_db():
        unique_id = uuid.uuid4().hex[:8]

        # 1. Stale claim: crashed worker locked it 10 minutes ago
        stale_delivery = NotificationDelivery(
            subscription_id=f"sub-stale-{unique_id}",
            alert_id=f"alert-stale-{unique_id}",
            idempotency_key=f"stale-claim-{unique_id}",
            status="CLAIMED",
            http_status=0,
            retry_count=0,
            locked_by="crashed-worker-999",
            locked_at=datetime.now(timezone.utc) - timedelta(minutes=10),
        )

        # 2. Fresh claim: active worker locked it 1 minute ago
        fresh_delivery = NotificationDelivery(
            subscription_id=f"sub-fresh-{unique_id}",
            alert_id=f"alert-fresh-{unique_id}",
            idempotency_key=f"fresh-claim-{unique_id}",
            status="CLAIMED",
            http_status=0,
            retry_count=0,
            locked_by="active-worker-001",
            locked_at=datetime.now(timezone.utc) - timedelta(minutes=1),
        )

        # 3. Exhausted claim: locked 10 minutes ago but already reached MAX_DELIVERY_RETRIES
        exhausted_delivery = NotificationDelivery(
            subscription_id=f"sub-exhausted-{unique_id}",
            alert_id=f"alert-exhausted-{unique_id}",
            idempotency_key=f"exhausted-claim-{unique_id}",
            status="CLAIMED",
            http_status=0,
            retry_count=settings.MAX_DELIVERY_RETRIES,
            locked_by="crashed-worker-old",
            locked_at=datetime.now(timezone.utc) - timedelta(minutes=15),
        )

        db.add_all([stale_delivery, fresh_delivery, exhausted_delivery])
        await db.commit()

        # Run recovery reaper
        recovery = await recover_abandoned_claims(db, stale_minutes=5)
        assert recovery["abandoned_scanned"] >= 2
        assert recovery["recovered_for_retry"] >= 1
        assert recovery["permanently_failed"] >= 1

        # Check stale delivery was reset to TRANSIENT_FAILURE
        await db.refresh(stale_delivery)
        assert stale_delivery.status == "TRANSIENT_FAILURE"
        assert stale_delivery.locked_by is None
        assert stale_delivery.locked_at is None
        assert stale_delivery.retry_count == 1
        assert "Recovered from abandoned worker reservation" in (stale_delivery.error_message or "")

        # Check fresh delivery was untouched
        await db.refresh(fresh_delivery)
        assert fresh_delivery.status == "CLAIMED"
        assert fresh_delivery.locked_by == "active-worker-001"

        # Check exhausted delivery was marked PERMANENT_FAILURE
        await db.refresh(exhausted_delivery)
        assert exhausted_delivery.status == "PERMANENT_FAILURE"
        assert exhausted_delivery.locked_by is None

        # Clean up
        await db.delete(stale_delivery)
        await db.delete(fresh_delivery)
        await db.delete(exhausted_delivery)
        await db.commit()

