"""Push notification router for subscription management, preferences, and diagnostic testing."""
import json
import time
from collections import defaultdict
from datetime import datetime, timezone
from typing import Dict, List, Optional

from fastapi import APIRouter, Depends, Header, HTTPException, Query, Request, status
from sqlalchemy.ext.asyncio import AsyncSession

from services.api.app.config import settings
from services.api.app.db.base import get_db
from services.api.app.db.models import PushSubscription
from services.api.app.schemas.push import (
    DiagnosticPushTestResponse,
    PushPreferencesResponse,
    PushPreferencesUpdateRequest,
    PushSubscribeRequest,
    PushSubscribeResponse,
    PushUnsubscribeResponse,
    VapidPublicKeyResponse,
)
from services.api.app.services.alert_matcher import process_and_dispatch_active_alerts
from services.api.app.services.push_service import (
    get_subscription_by_token,
    register_subscription,
    send_diagnostic_test,
    unsubscribe_by_id,
)
from services.api.app.services.vapid_service import get_vapid_public_key

router = APIRouter(prefix="/api/v1/push", tags=["Push Notifications"])

# In-memory sliding window rate limiter to prevent push endpoint registration spam
_rate_limit_store: Dict[str, List[float]] = defaultdict(list)


def check_rate_limit(key: str, limit: int = 10, window_seconds: int = 60) -> None:
    """Sliding-window in-memory rate limiter per IP or endpoint key."""
    now = time.time()
    cutoff = now - window_seconds
    timestamps = [t for t in _rate_limit_store[key] if t > cutoff]
    if len(timestamps) >= limit:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Rate limit exceeded ({limit} requests per {window_seconds}s). Please try again shortly.",
        )
    timestamps.append(now)
    _rate_limit_store[key] = timestamps


async def require_subscription_token(
    x_subscription_token: Optional[str] = Header(None, alias="X-Subscription-Token"),
    db: AsyncSession = Depends(get_db),
) -> PushSubscription:
    """Dependency that authenticates client possession token and resolves the active subscription."""
    if not x_subscription_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing X-Subscription-Token header. Subscriptions are securely possession-bound.",
        )
    sub = await get_subscription_by_token(db, x_subscription_token)
    if not sub:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Invalid or expired subscription token. Access denied.",
        )
    return sub


async def require_internal_worker_key(
    x_worker_key: Optional[str] = Header(None, alias="X-Worker-Key"),
) -> str:
    """Enforce internal authorization for worker sync dispatches."""
    if not x_worker_key or x_worker_key != settings.INTERNAL_WORKER_KEY:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Forbidden: Invalid or missing X-Worker-Key authorization header.",
        )
    return x_worker_key


@router.get("/vapid-public-key", response_model=VapidPublicKeyResponse)
async def get_public_key():
    """Retrieve VAPID applicationServerKey in URL-safe base64 format for browser PushManager.subscribe."""
    key = get_vapid_public_key()
    return VapidPublicKeyResponse(public_key=key)


@router.post("/subscribe", response_model=PushSubscribeResponse, status_code=status.HTTP_201_CREATED)
async def subscribe_push(
    payload: PushSubscribeRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """Register browser push subscription and obtain secret client possession token."""
    client_ip = request.client.host if request.client else "unknown"
    check_rate_limit(f"subscribe:{client_ip}", limit=10, window_seconds=60)

    try:
        sub, token = await register_subscription(db, payload)
        categories = json.loads(sub.categories) if isinstance(sub.categories, str) else sub.categories
        return PushSubscribeResponse(
            subscription_id=sub.id,
            possession_token=token,
            endpoint=sub.endpoint,
            categories=categories,
            min_severity=sub.min_severity,
            country_code=sub.country_code,
            latitude=sub.latitude,
            longitude=sub.longitude,
            radius_km=sub.radius_km,
            wants_country_wide=bool(sub.wants_country_wide),
            created_at=sub.created_at,
        )
    except PermissionError as perm_err:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(perm_err))
    except ValueError as val_err:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(val_err))
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Subscription registration failed: {type(exc).__name__}",
        )


@router.delete("/subscriptions/{subscription_id}", response_model=PushUnsubscribeResponse)
async def unsubscribe_push(
    subscription_id: str,
    x_subscription_token: Optional[str] = Header(None, alias="X-Subscription-Token"),
    db: AsyncSession = Depends(get_db),
):
    """Unsubscribe and deactivate push subscription using possession token verification."""
    if not x_subscription_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing X-Subscription-Token header.",
        )
    success = await unsubscribe_by_id(db, subscription_id, x_subscription_token)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Subscription not found or possession token does not match.",
        )
    return PushUnsubscribeResponse(status="UNSUBSCRIBED", subscription_id=subscription_id)


@router.get("/preferences", response_model=PushPreferencesResponse)
async def get_preferences(
    sub: PushSubscription = Depends(require_subscription_token),
):
    """View current push notification preferences for authenticated subscription."""
    categories = json.loads(sub.categories) if isinstance(sub.categories, str) else sub.categories
    return PushPreferencesResponse(
        subscription_id=sub.id,
        endpoint=sub.endpoint,
        categories=categories,
        min_severity=sub.min_severity,
        country_code=sub.country_code,
        latitude=sub.latitude,
        longitude=sub.longitude,
        radius_km=sub.radius_km,
        wants_country_wide=bool(sub.wants_country_wide),
        is_active=sub.is_active,
        created_at=sub.created_at,
        updated_at=sub.updated_at,
    )


@router.put("/preferences", response_model=PushPreferencesResponse)
async def update_preferences(
    payload: PushPreferencesUpdateRequest,
    sub: PushSubscription = Depends(require_subscription_token),
    db: AsyncSession = Depends(get_db),
):
    """Update geographic, category, or severity preferences for authenticated subscription."""
    if payload.categories is not None:
        sub.categories = json.dumps(payload.categories)
    if payload.min_severity is not None:
        sub.min_severity = payload.min_severity
    if payload.country_code is not None:
        sub.country_code = payload.country_code.upper() if payload.country_code else None
    if payload.latitude is not None:
        sub.latitude = payload.latitude
    if payload.longitude is not None:
        sub.longitude = payload.longitude
    if payload.radius_km is not None:
        sub.radius_km = payload.radius_km
    if payload.wants_country_wide is not None:
        sub.wants_country_wide = payload.wants_country_wide
    if payload.is_active is not None:
        sub.is_active = payload.is_active

    sub.updated_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(sub)

    categories = json.loads(sub.categories) if isinstance(sub.categories, str) else sub.categories
    return PushPreferencesResponse(
        subscription_id=sub.id,
        endpoint=sub.endpoint,
        categories=categories,
        min_severity=sub.min_severity,
        country_code=sub.country_code,
        latitude=sub.latitude,
        longitude=sub.longitude,
        radius_km=sub.radius_km,
        wants_country_wide=bool(sub.wants_country_wide),
        is_active=sub.is_active,
        created_at=sub.created_at,
        updated_at=sub.updated_at,
    )


@router.post("/test", response_model=DiagnosticPushTestResponse)
async def send_test_push(
    sub: PushSubscription = Depends(require_subscription_token),
    db: AsyncSession = Depends(get_db),
):
    """Send an explicitly labeled diagnostic push notification containing zero weather claims."""
    check_rate_limit(f"test:{sub.id}", limit=5, window_seconds=60)
    success, code, err = await send_diagnostic_test(db, sub)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Diagnostic push delivery failed (HTTP {code}): {err}",
        )
    return DiagnosticPushTestResponse(
        status="DELIVERED",
        message="Diagnostic Web Push test dispatched successfully.",
        tag="skyguard-diagnostic-test",
        delivered_at=datetime.now(timezone.utc).isoformat(),
    )


@router.post("/dispatch-sync")
async def trigger_dispatch_sync(
    _worker_key: str = Depends(require_internal_worker_key),
    db: AsyncSession = Depends(get_db),
):
    """Trigger an on-demand synchronization and dispatch pass across active genuine alerts."""
    stats = await process_and_dispatch_active_alerts(db)
    return {
        "status": "COMPLETED",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "stats": stats,
    }
