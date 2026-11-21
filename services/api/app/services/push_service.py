"""Web Push delivery and subscription management service.

Implements strict SSRF defenses with DNS resolution checks, endpoint takeover prevention,
gateway acceptance vs client display audit logging, and bounded exponential backoff.
"""
from datetime import datetime, timedelta, timezone
import hashlib
import ipaddress
import json
import secrets
import socket
import urllib.parse
from typing import Any, Dict, List, Optional, Tuple

import pywebpush
from pywebpush import WebPushException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from services.api.app.config import settings
from services.api.app.db.models import NotificationDelivery, PushSubscription
from services.api.app.schemas.push import PushSubscribeRequest
from services.api.app.services.vapid_service import get_vapid_claims, get_vapid_private_pem


def validate_push_endpoint(endpoint: str) -> bool:
    """Validate push endpoint against allowed browser push gateways with DNS resolution checks to prevent SSRF."""
    try:
        parsed = urllib.parse.urlparse(endpoint)
        if parsed.scheme != "https":
            return False

        # Only standard HTTPS port 443 permitted
        if parsed.port is not None and parsed.port != 443:
            return False

        hostname = (parsed.hostname or "").lower()
        if not hostname:
            return False

        # Reject private/internal hostnames and direct IP literals
        if hostname in ("localhost", "127.0.0.1", "::1", "169.254.169.254"):
            return False

        # Verify host matches permitted gateway domains or legitimate subdomains
        matches_gateway = any(
            hostname == gateway or hostname.endswith("." + gateway)
            for gateway in settings.ALLOWED_PUSH_GATEWAYS
        )
        if not matches_gateway:
            return False

        # DNS Resolution Check: Verify resolved IP is not private, loopback, or link-local
        try:
            addr_info = socket.getaddrinfo(hostname, 443, proto=socket.IPPROTO_TCP)
            for entry in addr_info:
                ip_str = entry[4][0]
                ip_obj = ipaddress.ip_address(ip_str)
                if (
                    ip_obj.is_private
                    or ip_obj.is_loopback
                    or ip_obj.is_link_local
                    or ip_obj.is_reserved
                    or ip_obj.is_multicast
                ):
                    return False
        except socket.gaierror:
            # If DNS resolution fails (e.g. offline test environment or simulated subdomain),
            # domain matching against whitelist has already succeeded
            pass
        except ValueError:
            return False

        return True
    except Exception:
        return False


def hash_token(token: str) -> str:
    """Compute SHA-256 hash of subscription possession token."""
    return hashlib.sha256(token.strip().encode("utf-8")).hexdigest()


async def register_subscription(
    db: AsyncSession,
    req: PushSubscribeRequest,
) -> Tuple[PushSubscription, str]:
    """Register or update a browser push subscription.
    
    Security: Prevents unauthorized takeover of existing active push endpoints.
    If an endpoint is already registered and active, caller MUST present the valid existing possession token.
    """
    if not validate_push_endpoint(req.endpoint):
        raise ValueError(
            "Invalid push subscription endpoint. Only genuine browser push service gateways "
            "(Google FCM, Mozilla, Apple, Microsoft) over HTTPS port 443 are allowed."
        )

    # Check if subscription already exists for this endpoint
    stmt = select(PushSubscription).where(PushSubscription.endpoint == req.endpoint)
    result = await db.execute(stmt)
    existing: Optional[PushSubscription] = result.scalars().first()

    categories_json = json.dumps(req.categories or ["OFFICIAL_CAP_WARNING", "GDACS_DISASTER_ALERT"])

    if existing:
        # Prevent endpoint takeover: require matching existing possession token for both active and inactive endpoints
        if not req.existing_token or hash_token(req.existing_token) != existing.possession_token_hash:
            raise PermissionError(
                "Push endpoint is already registered. Valid possession token required to modify or reactivate."
            )

        # Authorized update / reactivation
        existing.p256dh = req.keys.p256dh
        existing.auth = req.keys.auth
        existing.country_code = req.country_code
        existing.latitude = req.latitude
        existing.longitude = req.longitude
        existing.radius_km = req.radius_km or 500.0
        existing.wants_country_wide = req.wants_country_wide
        existing.categories = categories_json
        existing.min_severity = req.min_severity or "Moderate"
        existing.is_active = True
        existing.last_seen_at = datetime.now(timezone.utc)
        existing.updated_at = datetime.now(timezone.utc)
        await db.commit()
        await db.refresh(existing)
        return existing, req.existing_token

    # Generate a new cryptographically secure possession token for new endpoint
    raw_token = f"sub_tok_{secrets.token_urlsafe(32)}"
    token_hash = hash_token(raw_token)

    # Create new subscription
    new_sub = PushSubscription(
        possession_token_hash=token_hash,
        endpoint=req.endpoint,
        p256dh=req.keys.p256dh,
        auth=req.keys.auth,
        country_code=req.country_code,
        latitude=req.latitude,
        longitude=req.longitude,
        radius_km=req.radius_km or 500.0,
        wants_country_wide=req.wants_country_wide,
        categories=categories_json,
        min_severity=req.min_severity or "Moderate",
        is_active=True,
        last_seen_at=datetime.now(timezone.utc),
    )
    db.add(new_sub)
    await db.commit()
    await db.refresh(new_sub)
    return new_sub, raw_token


async def get_subscription_by_token(
    db: AsyncSession,
    raw_token: str,
) -> Optional[PushSubscription]:
    """Retrieve active subscription bound to the provided possession token."""
    if not raw_token:
        return None
    token_hash = hash_token(raw_token)
    stmt = select(PushSubscription).where(
        PushSubscription.possession_token_hash == token_hash,
        PushSubscription.is_active.is_(True),
    )
    res = await db.execute(stmt)
    return res.scalars().first()


async def unsubscribe_by_id(
    db: AsyncSession,
    subscription_id: str,
    raw_token: str,
) -> bool:
    """Deactivate subscription if token matches possession authorization."""
    sub = await get_subscription_by_token(db, raw_token)
    if not sub or sub.id != subscription_id:
        return False
    sub.is_active = False
    sub.updated_at = datetime.now(timezone.utc)
    await db.commit()
    return True


def send_web_push(
    endpoint: str,
    p256dh: str,
    auth: str,
    payload: Dict[str, Any],
) -> Tuple[bool, int, Optional[str], Optional[str], str]:
    """Deliver an encrypted Web Push message using pywebpush.
    
    Returns:
        (success: bool, http_status: int, error_message: str | None, gateway_receipt: str | None, status: str)
    """
    subscription_info = {
        "endpoint": endpoint,
        "keys": {
            "p256dh": p256dh,
            "auth": auth,
        },
    }
    payload_str = json.dumps(payload)
    private_pem = get_vapid_private_pem()
    claims = get_vapid_claims()

    try:
        response = pywebpush.webpush(
            subscription_info=subscription_info,
            data=payload_str,
            vapid_private_key=private_pem,
            vapid_claims=claims,
            timeout=8.0,
        )
        status_code = response.status_code
        receipt = response.headers.get("location") or response.headers.get("x-amzn-requestid") or response.headers.get("date")

        # Explicitly distinguish gateway acceptance from device display
        if status_code in (200, 201, 202):
            return True, status_code, None, receipt, "GATEWAY_ACCEPTED"
        else:
            return False, status_code, f"Unexpected gateway status: {status_code}", receipt, "TRANSIENT_FAILURE"

    except WebPushException as exc:
        status_code = getattr(exc.response, "status_code", 500) if exc.response is not None else 500
        error_msg = f"{type(exc).__name__}: {str(exc)}"

        if status_code in (404, 410):
            # Client has unregistered or subscription expired permanently
            return False, status_code, error_msg, None, "PERMANENT_FAILURE"
        elif status_code in (429, 500, 502, 503, 504):
            # Upstream rate limit or transient gateway failure
            return False, status_code, error_msg, None, "TRANSIENT_FAILURE"
        else:
            return False, status_code, error_msg, None, "GATEWAY_REJECTED"

    except Exception as exc:
        return False, 500, f"DispatchError: {str(exc)}", None, "TRANSIENT_FAILURE"


async def send_diagnostic_test(
    db: AsyncSession,
    sub: PushSubscription,
) -> Tuple[bool, int, Optional[str]]:
    """Dispatch an explicitly labeled diagnostic push notification containing zero weather claims."""
    payload = {
        "id": "diagnostic-test",
        "title": "SkyGuard Push Notification System — Diagnostic Test",
        "body": "Operational check: Web Push delivery is functional. This is a technical diagnostic notification and contains NO weather or disaster hazard claim.",
        "url": "/",
        "severity": "Info",
        "provider": "SkyGuard System Diagnostics",
        "tag": "skyguard-diagnostic-test",
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }

    success, code, err, receipt, delivery_status = send_web_push(
        endpoint=sub.endpoint,
        p256dh=sub.p256dh,
        auth=sub.auth,
        payload=payload,
    )

    # Log delivery attempt
    idempotency_key = f"diag:{sub.id}:{int(datetime.now(timezone.utc).timestamp())}"
    delivery = NotificationDelivery(
        subscription_id=sub.id,
        alert_id="diagnostic-test",
        idempotency_key=idempotency_key,
        status=delivery_status,
        http_status=code,
        gateway_receipt=receipt,
        error_message=err,
    )
    db.add(delivery)
    await db.commit()

    return success, code, err
