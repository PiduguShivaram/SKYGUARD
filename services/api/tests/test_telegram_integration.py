"""Unit and integration tests for Telegram Mobile Alert Service."""
import uuid
from unittest.mock import AsyncMock, patch
import pytest
from fastapi.testclient import TestClient
from services.api.app.main import app
from services.api.app.services.telegram_service import (
    format_emergency_telegram_card,
    send_telegram_message,
)

client = TestClient(app)


def test_telegram_bot_info_endpoint():
    """Verify Telegram bot public profile and link."""
    resp = client.get("/api/v1/telegram/bot-info")
    assert resp.status_code == 200
    data = resp.json()
    assert data["bot_username"] == "skyguard_alerts_bot"
    assert "https://t.me/skyguard_alerts_bot" in data["bot_url"]
    assert data["is_configured"] is True


def test_format_emergency_telegram_card():
    """Verify emergency alert formatting for mobile Telegram display."""
    alert = {
        "event": "Tropical Cyclone Warning",
        "severity": "Extreme",
        "headline": "Severe cyclonic storm approaching coastline with wind gusts up to 130 km/h.",
        "affected_area": "Odisha Coastal Districts",
        "issuer": "India Meteorological Department (IMD)",
        "local_color_code": "Red Warning",
    }
    card = format_emergency_telegram_card(alert)
    assert "SKYGUARD EMERGENCY WEATHER ALERT" in card
    assert "Tropical Cyclone Warning" in card
    assert "Extreme" in card
    assert "[Red Warning]" in card
    assert "Odisha Coastal Districts" in card
    assert "India Meteorological Department" in card
    assert "action" in card.lower() or "sheltered" in card.lower()


@pytest.mark.asyncio
async def test_telegram_manual_subscribe_and_count():
    """Verify that direct unverified subscription is blocked (P0-1) and only verified subscriptions are counted."""
    unique_chat = f"test_mobile_chat_{uuid.uuid4().hex[:8]}"
    sub_payload = {
        "chat_id": unique_chat,
        "city_name": "New Delhi",
        "latitude": 28.6139,
        "longitude": 77.2090,
    }

    with patch("services.api.app.routers.telegram.send_telegram_message", new_callable=AsyncMock) as mock_send:
        mock_send.return_value = (True, 200, "mock_msg_123")

        # Direct unverified registration must be blocked with 403 Forbidden (P0-1)
        resp_direct = client.post("/api/v1/telegram/subscribe", json=sub_payload)
        assert resp_direct.status_code == 403
        assert "ownership verification required" in resp_direct.json()["detail"].lower()

        # 1. Initiate verification challenge
        req_resp = client.post(
            "/api/v1/telegram/request-verification",
            json={"chat_id": unique_chat, "city_name": "New Delhi"},
        )
        assert req_resp.status_code == 200

        # Capture generated code from sent message
        called_args, called_kwargs = mock_send.call_args
        sent_challenge_text = called_kwargs.get("text") or called_args[1]
        import re
        code_match = re.search(r"`(\d{6})`", sent_challenge_text)
        assert code_match is not None
        code = code_match.group(1)

        # 2. Confirm verification code
        verify_resp = client.post(
            "/api/v1/telegram/verify-code",
            json={"chat_id": unique_chat, "code": code, "city_name": "New Delhi"},
        )
        assert verify_resp.status_code == 200
        auth_token = verify_resp.json()["auth_token"]
        assert verify_resp.json()["is_verified"] is True

        # 3. Authorized subscription update with possession token succeeds
        update_payload = {**sub_payload, "existing_token": auth_token, "city_name": "Delhi NCR"}
        resp_update = client.post("/api/v1/telegram/subscribe", json=update_payload)
        assert resp_update.status_code == 200
        assert resp_update.json()["status"] == "SUBSCRIBED"
        assert resp_update.json()["city"] == "Delhi NCR"

        # Count check
        count_resp = client.get("/api/v1/telegram/subscribers/count")
        assert count_resp.status_code == 200
        count_data = count_resp.json()
        assert count_data["active_telegram_subscribers"] >= 1


@pytest.mark.asyncio
async def test_telegram_test_alert_endpoint():
    """Verify test diagnostic warning dispatch endpoint with hazard-neutral text and strict auth (P0-2, P0-7)."""
    unique_chat = f"test_mobile_chat_{uuid.uuid4().hex[:8]}"

    with patch("services.api.app.routers.telegram.send_telegram_message", new_callable=AsyncMock) as mock_send:
        mock_send.return_value = (True, 200, "telegram_msg_777")

        # 1. Establish verified subscription
        client.post(
            "/api/v1/telegram/request-verification",
            json={"chat_id": unique_chat, "city_name": "Mumbai"},
        )
        called_args, called_kwargs = mock_send.call_args
        sent_challenge_text = called_kwargs.get("text") or called_args[1]
        import re
        code = re.search(r"`(\d{6})`", sent_challenge_text).group(1)
        v_res = client.post("/api/v1/telegram/verify-code", json={"chat_id": unique_chat, "code": code})
        auth_token = v_res.json()["auth_token"]

        # 2. Dispatch diagnostic test without token should be 403 Forbidden
        unauth_payload = {"chat_id": unique_chat, "location": "Mumbai"}
        resp_unauth = client.post("/api/v1/telegram/test-alert", json=unauth_payload)
        assert resp_unauth.status_code == 403

        # 3. Dispatch diagnostic test with unset/empty worker key should also be 403 (P0-2)
        resp_unset_key = client.post(
            "/api/v1/telegram/test-alert",
            json=unauth_payload,
            headers={"X-Worker-Key": ""},
        )
        assert resp_unset_key.status_code == 403

        # 4. Dispatch with valid possession auth_token succeeds
        auth_payload = {"chat_id": unique_chat, "location": "Mumbai", "auth_token": auth_token}
        resp = client.post("/api/v1/telegram/test-alert", json=auth_payload)
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "DELIVERED"
        assert data["telegram_message_id"] == "telegram_msg_777"
        
        # Verify the message passed to send_telegram_message was purely hazard-neutral diagnostic (P0-7)
        called_args, called_kwargs = mock_send.call_args
        sent_text = called_kwargs.get("text") or called_args[1]
        assert "Diagnostic" in sent_text
        assert "hazard-neutral" in sent_text.lower()


@pytest.mark.asyncio
async def test_telegram_device_ownership_challenge_response_verification():
    """Verify 2-step challenge-response flow to prove Telegram device ownership."""
    chat_id = f"test_verified_chat_{uuid.uuid4().hex[:8]}"

    with patch("services.api.app.routers.telegram.send_telegram_message", new_callable=AsyncMock) as mock_send:
        mock_send.return_value = (True, 200, "telegram_msg_challenge_001")

        # Step 1: Request verification code
        req_res = client.post(
            "/api/v1/telegram/request-verification",
            json={"chat_id": chat_id, "city_name": "Hyderabad"},
        )
        assert req_res.status_code == 200
        assert req_res.json()["status"] == "CHALLENGE_DISPATCHED"

        # Capture challenge code sent
        called_args, called_kwargs = mock_send.call_args
        sent_text = called_kwargs.get("text") or called_args[1]
        import re
        match = re.search(r"`(\d{6})`", sent_text)
        assert match is not None
        code = match.group(1)

        # Step 2: Confirm code
        verify_res = client.post(
            "/api/v1/telegram/verify-code",
            json={"chat_id": chat_id, "code": code, "city_name": "Hyderabad"},
        )
        assert verify_res.status_code == 200
        v_data = verify_res.json()
        assert v_data["status"] == "VERIFIED_AND_SUBSCRIBED"
        assert v_data["is_verified"] is True
        assert len(v_data["auth_token"]) > 16


@pytest.mark.asyncio
async def test_telegram_verification_request_preserves_verified_status():
    """Verify that requesting a verification code on an already verified subscription does not revoke is_verified (P0-DoS defense)."""
    chat_id = f"test_dos_chat_{uuid.uuid4().hex[:8]}"

    with patch("services.api.app.routers.telegram.send_telegram_message", new_callable=AsyncMock) as mock_send:
        mock_send.return_value = (True, 200, "telegram_msg_dos_001")

        # 1. Establish verified subscription
        client.post("/api/v1/telegram/request-verification", json={"chat_id": chat_id, "city_name": "Bengaluru"})
        called_args, called_kwargs = mock_send.call_args
        sent_text = called_kwargs.get("text") or called_args[1]
        import re
        code1 = re.search(r"`(\d{6})`", sent_text).group(1)
        v_res = client.post("/api/v1/telegram/verify-code", json={"chat_id": chat_id, "code": code1})
        assert v_res.status_code == 200
        auth_token = v_res.json()["auth_token"]

        # 2. Malicious third party attempts to un-verify subscriber by requesting a new verification code
        req_res2 = client.post("/api/v1/telegram/request-verification", json={"chat_id": chat_id, "city_name": "Attacker City"})
        assert req_res2.status_code == 200

        # 3. Subscriber's existing verified status and token MUST remain active and usable
        test_res = client.post(
            "/api/v1/telegram/test-alert",
            json={"chat_id": chat_id, "location": "Bengaluru", "auth_token": auth_token},
        )
        assert test_res.status_code == 200
        assert test_res.json()["status"] == "DELIVERED"


@pytest.mark.asyncio
async def test_telegram_verification_code_attempt_limiting():
    """Verify that 3 incorrect verification attempts revokes the verification challenge with 429 Too Many Requests (P0)."""
    chat_id = f"test_brute_chat_{uuid.uuid4().hex[:8]}"

    with patch("services.api.app.routers.telegram.send_telegram_message", new_callable=AsyncMock) as mock_send:
        mock_send.return_value = (True, 200, "telegram_msg_brute_001")

        client.post("/api/v1/telegram/request-verification", json={"chat_id": chat_id})

        # Attempt 1: wrong code -> 400 Bad Request, 2 attempts remaining
        res1 = client.post("/api/v1/telegram/verify-code", json={"chat_id": chat_id, "code": "000000"})
        assert res1.status_code == 400
        assert "2 attempt(s) remaining" in res1.json()["detail"]

        # Attempt 2: wrong code -> 400 Bad Request, 1 attempt remaining
        res2 = client.post("/api/v1/telegram/verify-code", json={"chat_id": chat_id, "code": "111111"})
        assert res2.status_code == 400
        assert "1 attempt(s) remaining" in res2.json()["detail"]

        # Attempt 3: wrong code -> 429 Too Many Requests, code revoked
        res3 = client.post("/api/v1/telegram/verify-code", json={"chat_id": chat_id, "code": "222222"})
        assert res3.status_code == 429
        assert "maximum verification attempts exceeded" in res3.json()["detail"].lower()

        # Attempt 4: code is now wiped/revoked -> 400 Bad Request (no active code pending)
        res4 = client.post("/api/v1/telegram/verify-code", json={"chat_id": chat_id, "code": "333333"})
        assert res4.status_code == 400
        assert "no active verification code pending" in res4.json()["detail"].lower()


@pytest.mark.asyncio
async def test_telegram_test_alert_unregistered_chat_requires_admin_key():
    """Verify that dispatching a test alert to an unregistered chat requires administrative X-Worker-Key (P0-Unauthorized Diagnostic)."""
    unregistered_chat = f"test_unreg_{uuid.uuid4().hex[:8]}"

    # No auth / worker key -> 403 Forbidden
    resp = client.post(
        "/api/v1/telegram/test-alert",
        json={"chat_id": unregistered_chat, "location": "Nowhere"},
    )
    assert resp.status_code == 403
    assert "not registered or verified" in resp.json()["detail"]
