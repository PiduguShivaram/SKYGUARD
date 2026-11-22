"""Comprehensive Regression Test Suite for Forensic Audit P0 Remediation.

Verifies:
1. SG-001: Zero fabricated 0.0 fallbacks in Open-Meteo client (honest HTTP 502 on missing parameters).
2. SG-004: CAP alert cancellation lifecycle and reference deactivation.
3. SG-005: Exclusion of Test/Exercise/Restricted alerts from public dispatch.
4. SG-008: Provider-aware alert reconciliation (no deactivation during provider outages).
5. SG-009: Spatial segregation of local verified warnings vs country-wide advisories.
6. SG-013: Web Push delivery persistence of authentic gateway receipts.
7. SG-015: Diagnostic notification idempotency and uniqueness constraint handling.
"""
from datetime import datetime, timedelta, timezone
import json
import pytest
from fastapi import HTTPException
from httpx import Response
from sqlalchemy import select

from services.api.app.db.base import AsyncSessionLocal
from services.api.app.clients.open_meteo import OpenMeteoClient
from services.api.app.db.models import AlertRecord, NotificationDelivery, PushSubscription
from services.api.app.schemas.common import Provenance
from services.api.app.schemas.global_alerts import (
    AlertCategoryEnum,
    AlertSeverityLevel,
    GlobalAlertItem,
    GlobalAlertsResponse,
    ProviderHealth,
    ProviderHealthStatus,
)
from services.api.app.schemas.weather import DailyForecastPoint
from services.api.app.services.alert_matcher import (
    process_and_dispatch_active_alerts,
    sync_upstream_alerts_to_db,
)
from services.api.app.services.push_service import send_diagnostic_test
from services.api.app.services.risk_engine import evaluate_forecast_risks


@pytest.mark.asyncio
async def test_no_zero_fallbacks_in_open_meteo_client(monkeypatch):
    """SG-001: Truncated or missing weather parameters must raise 502, never fabricate 0.0."""
    client = OpenMeteoClient()

    # 1. Missing mandatory field in current weather (e.g. temperature_2m missing)
    fake_truncated_response = {
        "latitude": 17.97,
        "longitude": 79.60,
        "current": {
            "time": "2026-11-21T18:00",
            # "temperature_2m" missing
            "relative_humidity_2m": 60.0,
            "apparent_temperature": 28.0,
            "is_day": 1,
            "precipitation": 0.0,
            "weather_code": 0,
            "wind_speed_10m": 12.0,
        },
        "daily": {
            "time": ["2026-11-21"],
            "weather_code": [0],
            "temperature_2m_max": [30.0],
            "temperature_2m_min": [20.0],
            "precipitation_sum": [0.0],
            "wind_gusts_10m_max": [25.0],
        },
    }

    async def mock_get(*args, **kwargs):
        import httpx
        return Response(200, json=fake_truncated_response, request=httpx.Request("GET", "https://api.open-meteo.com/v1/forecast"))

    import httpx
    monkeypatch.setattr(httpx.AsyncClient, "get", mock_get)

    with pytest.raises(HTTPException) as exc_info:
        await client.get_forecast(latitude=17.97, longitude=79.60)
    assert exc_info.value.status_code == 502
    assert "missing mandatory" in exc_info.value.detail.lower()


@pytest.mark.asyncio
async def test_cap_cancellation_and_reference_lifecycle(monkeypatch):
    """SG-004: CAP cancellation or updated message deactivates referenced active alerts in DB."""
    import uuid
    uid = uuid.uuid4().hex[:8]
    old_id = f"WMO-ALERT-{uid}"
    cancel_id = f"WMO-CANCEL-{uid}"

    async with AsyncSessionLocal() as db_session:
        # Seed an active alert
        old_alert = AlertRecord(
            id=old_id,
            source_provider="WMO SWIC",
            alert_type="OFFICIAL_CAP_WARNING",
            event="Severe Gale",
            headline="Old Severe Gale Warning",
            severity="Severe",
            issuer="IMD",
            affected_area="Coastal Andhra",
            description="Gale warning in effect",
            source_url="https://wmo.int/test",
            is_active=True,
        )
        db_session.add(old_alert)
        await db_session.commit()

        # Mock an incoming cancellation alert referencing the old alert
        cancel_item = GlobalAlertItem(
            id=cancel_id,
            source_provider="WMO SWIC",
            alert_type=AlertCategoryEnum.OFFICIAL_CAP_WARNING,
            event="Cancellation",
            headline="Cancellation of Severe Gale Warning",
            severity=AlertSeverityLevel.MINOR,
            msg_type="Cancel",
            references=old_id,
            issuer="IMD",
            affected_area="Coastal Andhra",
            description="Gale warning cancelled",
            source_url="https://wmo.int/cancel",
        )

        from services.api.app.adapters.aggregator import global_alert_aggregator

        async def mock_get_all_alerts(*args, **kwargs):
            prov_health = {
                "wmo_swic": ProviderHealth(
                    provider_name="WMO SWIC",
                    status=ProviderHealthStatus.CONNECTED,
                    total_alerts_fetched=1,
                    retrieved_at=datetime.now(timezone.utc).isoformat(),
                    latency_ms=10.0,
                    attribution="WMO",
                )
            }
            return GlobalAlertsResponse(
                total_official_warnings=1,
                total_disaster_alerts=0,
                official_cap_warnings=[cancel_item],
                gdacs_disaster_alerts=[],
                providers_health=prov_health,
                provenance=Provenance(provider="Test", attribution_url="https://test", disclaimer="Test disclaimer"),
            )

        monkeypatch.setattr(global_alert_aggregator, "get_all_alerts", mock_get_all_alerts)

        await sync_upstream_alerts_to_db(db_session)

        # Verify old alert was deactivated by the cancellation reference
        res = await db_session.execute(select(AlertRecord).where(AlertRecord.id == old_id))
        updated_old = res.scalars().first()
        assert updated_old is not None
        assert updated_old.is_active is False

        # Verify cancellation alert itself is not marked active for public dispatch
        res_cancel = await db_session.execute(select(AlertRecord).where(AlertRecord.id == cancel_id))
        cancel_rec = res_cancel.scalars().first()
        assert cancel_rec is not None
        assert cancel_rec.is_active is False


@pytest.mark.asyncio
async def test_test_and_exercise_alerts_excluded_from_dispatch(monkeypatch):
    """SG-005: Non-actual CAP alerts (Test, Exercise, Draft) are excluded from push dispatch."""
    import uuid
    uid = uuid.uuid4().hex[:8]
    async with AsyncSessionLocal() as db_session:
        sub = PushSubscription(
            id=f"sub-test-exclude-{uid}",
            possession_token_hash="a" * 64,
            endpoint=f"https://fcm.googleapis.com/fcm/send/test-endpoint-exclude-{uid}",
            p256dh="test_p256",
            auth="test_auth",
            country_code="IN",
            wants_country_wide=True,
            is_active=True,
        )
        db_session.add(sub)
        await db_session.commit()

        test_exercise_alert = GlobalAlertItem(
            id="AlertHub-TEST-DRILL-001",
            source_provider="Alert-Hub.org",
            alert_type=AlertCategoryEnum.OFFICIAL_CAP_WARNING,
            event="Tsunami Drill",
            headline="Tsunami Exercise Bulletin",
            severity=AlertSeverityLevel.EXTREME,
            status="Exercise",  # Not Actual!
            scope="Public",
            issuer="NDMA",
        country_code="IN",
        affected_area="Coastline",
        description="National disaster simulation exercise",
        source_url="https://alert-hub.org/drill",
    )

    from services.api.app.adapters.aggregator import global_alert_aggregator

    async def mock_get_alerts(*args, **kwargs):
        return GlobalAlertsResponse(
            total_official_warnings=1,
            total_disaster_alerts=0,
            official_cap_warnings=[test_exercise_alert],
            gdacs_disaster_alerts=[],
            providers_health={},
            provenance=Provenance(provider="Test", attribution_url="https://test", disclaimer="Test disclaimer"),
        )

    monkeypatch.setattr(global_alert_aggregator, "get_all_alerts", mock_get_alerts)

    stats = await process_and_dispatch_active_alerts(db_session)
    assert stats["notifications_dispatched"] == 0
    assert stats["filtered_skipped"] >= 1


@pytest.mark.asyncio
async def test_provider_aware_reconciliation_preserves_alerts_on_outage(monkeypatch):
    """SG-008: If a provider is UNAVAILABLE, existing valid active alerts are preserved."""
    import uuid
    saved_id = f"AlertHub-SAVED-{uuid.uuid4().hex[:8]}"
    async with AsyncSessionLocal() as db_session:
        # Seed active alert
        existing_alert = AlertRecord(
            id=saved_id,
            source_provider="Alert-Hub.org",
            alert_type="OFFICIAL_CAP_WARNING",
            event="Cyclone",
            headline="Cyclone Alert",
            severity="Severe",
            issuer="IMD",
            affected_area="Odisha",
            description="Active cyclone",
            source_url="https://alert-hub.org",
            is_active=True,
            expires_time=(datetime.now(timezone.utc) + timedelta(days=1)).isoformat(),
        )
        db_session.add(existing_alert)
        await db_session.commit()

        # Simulate provider outage: Alert-Hub is UNAVAILABLE and returns 0 items
        from services.api.app.adapters.aggregator import global_alert_aggregator

        async def mock_outage(*args, **kwargs):
            prov_health = {
                "alert_hub": ProviderHealth(
                    provider_name="Alert-Hub.org",
                    status=ProviderHealthStatus.UNAVAILABLE,
                    total_alerts_fetched=0,
                    retrieved_at=datetime.now(timezone.utc).isoformat(),
                    latency_ms=5000.0,
                    error_message="Gateway timeout",
                    attribution="Alert-Hub",
                )
            }
            return GlobalAlertsResponse(
                total_official_warnings=0,
                total_disaster_alerts=0,
                official_cap_warnings=[],
                gdacs_disaster_alerts=[],
                providers_health=prov_health,
                provenance=Provenance(provider="Test", attribution_url="https://test", disclaimer="Test disclaimer"),
            )

        monkeypatch.setattr(global_alert_aggregator, "get_all_alerts", mock_outage)

        await sync_upstream_alerts_to_db(db_session)

        # Assert active alert was NOT dropped because provider was UNAVAILABLE
        res = await db_session.execute(select(AlertRecord).where(AlertRecord.id == saved_id))
        rec = res.scalars().first()
        assert rec is not None
        assert rec.is_active is True


@pytest.mark.asyncio
async def test_spatial_segregation_local_vs_country_wide(monkeypatch):
    """SG-009: Strict segregation between polygon-verified local warnings and country-wide advisories."""
    from services.api.app.adapters.aggregator import global_alert_aggregator

    # Alert 1: Contains Warangal (17.9784, 79.5941) inside polygon
    local_alert = GlobalAlertItem(
        id="WMO-LOCAL-001",
        source_provider="WMO SWIC",
        alert_type=AlertCategoryEnum.OFFICIAL_CAP_WARNING,
        event="Severe Thunderstorm",
        headline="Thunderstorm over Warangal District",
        severity=AlertSeverityLevel.SEVERE,
        issuer="IMD",
        country_code="IN",
        affected_area="Warangal Rural and Urban",
        description="Local convective squall",
        source_url="https://wmo.int",
        polygons=["17.5,79.0 17.5,80.0 18.5,80.0 18.5,79.0 17.5,79.0"],
        geographic_status="POLYGON_VERIFIED",
    )

    # Alert 2: National notice for India without Warangal polygon
    national_alert = GlobalAlertItem(
        id="WMO-NATIONAL-002",
        source_provider="WMO SWIC",
        alert_type=AlertCategoryEnum.OFFICIAL_CAP_WARNING,
        event="Cold Wave",
        headline="Country-Wide Cold Wave Advisory",
        severity=AlertSeverityLevel.MODERATE,
        issuer="IMD",
        country_code="IN",
        affected_area="Northern Plains and Central India",
        description="Winter advisory",
        source_url="https://wmo.int",
        is_country_wide=True,
        geographic_status="TERRITORY_NATIONAL",
    )

    from services.api.app.adapters.wmo import wmo_adapter

    async def mock_wmo(*args, **kwargs):
        health = ProviderHealth(
            provider_name="WMO SWIC",
            status=ProviderHealthStatus.CONNECTED,
            total_alerts_fetched=2,
            retrieved_at=datetime.now(timezone.utc).isoformat(),
            latency_ms=10.0,
            attribution="WMO",
        )
        return [local_alert, national_alert], health, 2

    monkeypatch.setattr(wmo_adapter, "fetch_alerts", mock_wmo)

    from services.api.app.adapters.alert_hub import alert_hub_adapter
    async def mock_ah(*args, **kwargs):
        return [], None, 0
    monkeypatch.setattr(alert_hub_adapter, "fetch_alerts", mock_ah)

    res = await global_alert_aggregator.get_all_alerts(
        country_code="IN",
        latitude=17.9784,
        longitude=79.5941,
        radius_km=50.0,
    )

    # Local verified warnings must contain local_alert
    local_ids = [a.id for a in res.local_verified_warnings]
    assert "WMO-LOCAL-001" in local_ids

    # Country-wide advisories must contain national_alert and NOT confuse it with local warning
    advisory_ids = [a.id for a in res.country_wide_advisories]
    assert "WMO-NATIONAL-002" in advisory_ids
    assert "WMO-NATIONAL-002" not in local_ids


@pytest.mark.asyncio
async def test_diagnostic_push_uniqueness_constraint_handled(monkeypatch):
    """SG-015: Repeated diagnostic test dispatches do not fail unique constraint (subscription_id, alert_id)."""
    import uuid
    uid = uuid.uuid4().hex[:8]
    async with AsyncSessionLocal() as db_session:
        sub = PushSubscription(
            id=f"sub-diag-{uid}",
            possession_token_hash="b" * 64,
            endpoint=f"https://fcm.googleapis.com/fcm/send/test-endpoint-diag-{uid}",
            p256dh="test_p256",
            auth="test_auth",
            is_active=True,
        )
        db_session.add(sub)
        await db_session.commit()

        # Mock send_web_push to return success with real receipt
        import services.api.app.services.push_service as ps_mod
        monkeypatch.setattr(
            ps_mod,
            "send_web_push",
            lambda *args, **kwargs: (True, 201, None, "GATEWAY_TXN_ABC123", "GATEWAY_ACCEPTED"),
        )

        # Send diagnostic test 1
        s1, c1, err1 = await send_diagnostic_test(db_session, sub)
        assert s1 is True
        assert c1 == 201

        # Send diagnostic test 2 immediately for same subscription
        s2, c2, err2 = await send_diagnostic_test(db_session, sub)
        assert s2 is True
        assert c2 == 201

        # Assert both delivery records exist in DB
        deliv_stmt = select(NotificationDelivery).where(
            NotificationDelivery.subscription_id == sub.id
        )
        res = await db_session.execute(deliv_stmt)
        records = res.scalars().all()
        assert len(records) == 2
        assert records[0].gateway_receipt == "GATEWAY_TXN_ABC123"
    assert records[1].gateway_receipt == "GATEWAY_TXN_ABC123"
