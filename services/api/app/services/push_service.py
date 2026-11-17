"""Web Push delivery and subscription management service."""
import hashlib
import json
import secrets
import urllib.parse
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Tuple

import pywebpush
from pywebpush import WebPushException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from services.api.app.db.models import NotificationDelivery, PushSubscription
from services.api.app.schemas.push import PushSubscribeRequest
from services.api.app.services.vapid_service import get_vapid_claims, get_vapid_private_pem

ALLOWED_PUSH_GATEWAYS = [
    "fcm.googleapis.com",
    "push.services.mozilla.com",
    "updates.push.services.mozilla.com",
    "push.apple.com",
    "notify.windows.com",
]


def validate_push_endpoint(endpoint: str) -> bool:
    """Validate push endpoint against allowed browser push gateways to prevent SSRF attacks."""
    try:
        parsed = urllib.parse.urlparse(endpoint)
        if parsed.scheme != "https":
            return False
        hostname = (parsed.hostname or "").lower()
        if not hostname:
            return False

        # Reject private/internal IP ranges and localhosts
        if hostname in ("localhost", "127.0.0.1", "::1", "169.254.169.254"):
            return False
        if hostname.startswith("10.") or hostname.startswith("192.168.") or hostname.startswith("172."):
            return False

        # Verify host matches permitted gateway or subdomain
        return any(
            hostname == gateway or hostname.endswith("." + gateway)
            for gateway in ALLOWED_PUSH_GATEWAYS
        )
    except Exception:
        return False


def hash_token(token: str) -> str:
    """Compute SHA-256 hash of subscription possession token."""
    return hashlib.sha256(token.strip().encode("utf-8")).hexdigest()


async def register_subscription(
    db: AsyncSession,
    req: PushSubscribeRequest,
) -> Tuple[PushSubscription, str]:
    """Register or update a browser push subscription and return a secret possession token."""
    if not validate_push_endpoint(req.endpoint):
        raise ValueError(
            "Invalid push subscription endpoint. Only genuine browser push service gateways "
            "(Google FCM, Mozilla, Apple, Microsoft) over HTTPS are allowed."
        )

    # Generate a cryptographically secure possession token
    raw_token = f"sub_tok_{secrets.token_urlsafe(32)}"
    token_hash = hash_token(raw_token)

    # Check if subscription already exists for this endpoint
    stmt = select(PushSubscription).where(PushSubscription.endpoint == req.endpoint)
    result = await db.execute(stmt)
    existing: Optional[PushSubscription] = result.scalars().first()

    categories_json = json.dumps(req.categories or ["OFFICIAL_CAP_WARNING", "GDACS_DISASTER_ALERT"])

    if existing:
        existing.possession_token_hash = token_hash
        existing.p256dh = req.keys.p256dh
        existing.auth = req.keys.auth
        existing.country_code = req.country_code
        existing.latitude = req.latitude
        existing.longitude = req.longitude
        existing.radius_km = req.radius_km or 500.0
        existing.categories = categories_json
        existing.min_severity = req.min_severity or "Moderate"
        existing.is_active = True
        existing.updated_at = datetime.now(timezone.utc)
        await db.commit()
        await db.refresh(existing)
        return existing, raw_token

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
        categories=categories_json,
        min_severity=req.min_severity or "Moderate",
        is_active=True,
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
) -> Tuple[bool, int, Optional[str]]:
    """Deliver an encrypted Web Push message using pywebpush.
    
    Returns:
        (success: bool, http_status: int, error_message: str | None)
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
        return True, response.status_code, None
    except WebPushException as exc:
        status_code = getattr(exc.response, "status_code", 500) if exc.response is not None else 500
        error_msg = f"{type(exc).__name__}: {str(exc)}"
        return False, status_code, error_msg
    except Exception as exc:
        return False, 500, f"DispatchError: {str(exc)}"


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

    success, code, err = send_web_push(
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
        status="SUCCESS" if success else "FAILED",
        http_status=code,
        error_message=err,
    )
    db.add(delivery)
    await db.commit()

    return success, code, err
