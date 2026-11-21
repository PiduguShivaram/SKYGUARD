"""Tests for Web Push subscription management, VAPID security, SSRF defenses, and alert matching."""
import uuid
import pytest
from httpx import ASGITransport, AsyncClient

from services.api.app.main import app
from services.api.app.schemas.global_alerts import AlertCategoryEnum, GlobalAlertItem
from services.api.app.services.alert_matcher import is_geographic_match, is_severity_eligible
from services.api.app.services.push_service import validate_push_endpoint


def test_validate_push_endpoint_ssrf_defenses():
    """Verify that only authorized browser push service gateways over HTTPS are permitted."""
    # Valid browser push gateways
    assert validate_push_endpoint("https://fcm.googleapis.com/fcm/send/token123") is True
    assert validate_push_endpoint("https://updates.push.services.mozilla.com/wpush/v2/token456") is True
    assert validate_push_endpoint("https://web.push.apple.com/token789") is True
    assert validate_push_endpoint("https://wns2-sn1p.notify.windows.com/w/?token=abc") is True

    # Malicious or internal endpoints must be blocked
    assert validate_push_endpoint("http://fcm.googleapis.com/fcm/send/token123") is False  # Plain HTTP
    assert validate_push_endpoint("https://localhost:8000/api/v1") is False
    assert validate_push_endpoint("https://127.0.0.1:8000/admin") is False
    assert validate_push_endpoint("https://169.254.169.254/latest/meta-data") is False  # AWS metadata
    assert validate_push_endpoint("https://10.0.0.1/internal") is False
    assert validate_push_endpoint("https://192.168.1.1/router") is False
    assert validate_push_endpoint("https://evil-attacker.com/sinkhole") is False


def test_severity_and_geographic_matching_logic():
    """Verify deterministic matching rules without assuming proximity implies warning relevance."""
    # Severity thresholds
    assert is_severity_eligible("Extreme", "Moderate") is True
    assert is_severity_eligible("Severe", "Moderate") is True
    assert is_severity_eligible("Moderate", "Moderate") is True
    assert is_severity_eligible("Minor", "Moderate") is False
    assert is_severity_eligible("Moderate", "Severe") is False
    assert is_severity_eligible("Severe", "Severe") is True

    # Geographic matching
    alert_india = GlobalAlertItem(
        id="wmo-in-001",
        source_provider="WMO SWIC",
        alert_type=AlertCategoryEnum.OFFICIAL_CAP_WARNING,
        event="Heavy Rain Warning",
        headline="Heavy Rain in Telangana",
        severity="Severe",
        issuer="IMD",
        country_code="IN",
        affected_area="Telangana",
        latitude=17.97,
        longitude=79.60,
        description="Heavy rain expected",
        source_url="https://severeweather.wmo.int",
    )

    # 1. Matching country code
    is_match, dist = is_geographic_match("IN", None, None, 500.0, alert_india)
    assert is_match is True

    # 2. Mismatched country code
    is_match, dist = is_geographic_match("US", None, None, 500.0, alert_india)
    assert is_match is False

    # 3. Proximity within radius
    is_match, dist = is_geographic_match(None, 17.96, 79.59, 50.0, alert_india)
    assert is_match is True
    assert dist is not None and dist < 10.0

    # 4. Proximity beyond radius
    is_match, dist = is_geographic_match(None, 13.08, 80.27, 50.0, alert_india)  # Chennai ~500km away
    assert is_match is False
    assert dist is not None and dist > 400.0


@pytest.mark.asyncio
async def test_push_subscription_api_lifecycle():
    """Verify VAPID public key, subscription registration, preferences, and deletion."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. Get VAPID public key
        key_resp = await client.get("/api/v1/push/vapid-public-key")
        assert key_resp.status_code == 200
        data = key_resp.json()
        assert "public_key" in data
        assert len(data["public_key"]) > 50

        # 2. Reject SSRF endpoint
        ssrf_payload = {
            "endpoint": "https://127.0.0.1:8000/internal",
            "keys": {"p256dh": "dummy_p256", "auth": "dummy_auth"},
        }
        bad_resp = await client.post("/api/v1/push/subscribe", json=ssrf_payload)
        assert bad_resp.status_code == 400
        assert "Invalid push subscription endpoint" in bad_resp.json()["detail"]

        # 3. Register valid subscription
        unique_token = uuid.uuid4().hex[:8]
        valid_payload = {
            "endpoint": f"https://fcm.googleapis.com/fcm/send/pytest_device_{unique_token}",
            "keys": {"p256dh": "test_p256dh_key", "auth": "test_auth_secret"},
            "country_code": "IN",
            "latitude": 17.9784,
            "longitude": 79.6005,
            "radius_km": 300.0,
            "categories": ["OFFICIAL_CAP_WARNING", "GDACS_DISASTER_ALERT"],
            "min_severity": "Moderate",
        }
        sub_resp = await client.post("/api/v1/push/subscribe", json=valid_payload)
        assert sub_resp.status_code == 201
        sub_data = sub_resp.json()
        sub_id = sub_data["subscription_id"]
        token = sub_data["possession_token"]
        assert token.startswith("sub_tok_")
        assert sub_data["country_code"] == "IN"

        # 4. Unauthorized preference access without possession token
        unauth_resp = await client.get("/api/v1/push/preferences")
        assert unauth_resp.status_code == 401

        # 5. Authorized preference access with token header
        headers = {"X-Subscription-Token": token}
        pref_resp = await client.get("/api/v1/push/preferences", headers=headers)
        assert pref_resp.status_code == 200
        assert pref_resp.json()["country_code"] == "IN"
        assert pref_resp.json()["min_severity"] == "Moderate"

        # 6. Update preferences
        update_payload = {"min_severity": "Severe", "radius_km": 600.0}
        put_resp = await client.put("/api/v1/push/preferences", json=update_payload, headers=headers)
        assert put_resp.status_code == 200
        assert put_resp.json()["min_severity"] == "Severe"
        assert put_resp.json()["radius_km"] == 600.0

        # 7. Unsubscribe
        del_resp = await client.delete(f"/api/v1/push/subscriptions/{sub_id}", headers=headers)
        assert del_resp.status_code == 200
        assert del_resp.json()["status"] == "UNSUBSCRIBED"

        # 8. Verifying preferences after unsubscription fails (deactivated)
        post_del = await client.get("/api/v1/push/preferences", headers=headers)
        assert post_del.status_code == 403


@pytest.mark.asyncio
async def test_alert_query_and_detail_endpoints():
    """Verify that alerts list and alert detail endpoints return valid schema structures."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Query alert list
        list_resp = await client.get("/api/v1/alerts?limit=5")
        assert list_resp.status_code == 200
        data = list_resp.json()
        assert "total" in data
        assert "alerts" in data
        assert isinstance(data["alerts"], list)

        if data["alerts"]:
            first_alert = data["alerts"][0]
            alert_id = first_alert["id"]

            # Detail query
            detail_resp = await client.get(f"/api/v1/alerts/{alert_id}")
            assert detail_resp.status_code == 200
            detail = detail_resp.json()
            assert detail["id"] == alert_id
            assert "headline" in detail
            assert "severity" in detail
            assert "source_provider" in detail

        # Non-existent alert returns 404
        not_found = await client.get("/api/v1/alerts/non_existent_alert_id_99999")
        assert not_found.status_code == 404
