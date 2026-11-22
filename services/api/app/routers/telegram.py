"""Telegram Mobile Alert Router."""
import secrets
import time
from collections import defaultdict
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends, Header, HTTPException, Request, status
from pydantic import BaseModel, Field
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from services.api.app.config import settings
from services.api.app.db.base import get_db
from services.api.app.db.models import AlertRecord, TelegramSubscription
from services.api.app.services.telegram_service import (
    format_emergency_telegram_card,
    send_telegram_message,
    sync_telegram_bot_updates,
)

router = APIRouter(prefix="/api/v1/telegram", tags=["Telegram Mobile Alerts"])

# In-memory sliding-window rate limiter per chat_id for test alerts (max 3 tests per 5 min)
_test_alert_rate_limits: Dict[str, List[float]] = defaultdict(list)


def check_telegram_rate_limit(chat_id: str, limit: int = 5, window_seconds: int = 300) -> None:
    now = time.time()
    history = _test_alert_rate_limits[chat_id]
    _test_alert_rate_limits[chat_id] = [t for t in history if now - t < window_seconds]
    if len(_test_alert_rate_limits[chat_id]) >= limit:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Rate limit exceeded. Maximum {limit} test alerts per {window_seconds // 60} minutes per chat.",
        )
    _test_alert_rate_limits[chat_id].append(now)


class TelegramTestAlertRequest(BaseModel):
    chat_id: str = Field(..., description="Target Telegram Chat ID (user or channel)")
    location: Optional[str] = Field("Verified Coordinates", description="Location name for diagnostic confirmation")
    auth_token: Optional[str] = Field(None, description="Subscription possession auth token")


class TelegramManualSubscribeRequest(BaseModel):
    chat_id: str = Field(..., description="Telegram chat ID")
    city_name: Optional[str] = Field("Global Alerts", description="Selected city")
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    existing_token: Optional[str] = Field(None, description="Existing possession token if modifying subscription")


class TelegramVerificationRequest(BaseModel):
    chat_id: str = Field(..., description="Target Telegram Chat ID")
    city_name: Optional[str] = Field("My Location", description="Selected city/sector")
    latitude: Optional[float] = None
    longitude: Optional[float] = None


class TelegramVerifyCodeRequest(BaseModel):
    chat_id: str = Field(..., description="Target Telegram Chat ID")
    code: str = Field(..., description="6-digit challenge code received in Telegram")
    city_name: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None


@router.get("/bot-info")
async def get_telegram_bot_info() -> Dict[str, Any]:
    """Returns Telegram alert bot public profile and connection link."""
    username = settings.TELEGRAM_BOT_USERNAME or "skyguard_alerts_bot"
    is_configured = bool(settings.TELEGRAM_BOT_TOKEN)
    return {
        "bot_username": username,
        "bot_url": f"https://t.me/{username}",
        "is_configured": is_configured,
        "instructions": (
            f"1. Open https://t.me/{username} on your mobile phone.\n"
            "2. Tap 'Start' to link your mobile device.\n"
            "3. Emergency weather warnings will be pushed directly to your phone."
        ),
    }


@router.post("/sync-updates")
async def trigger_telegram_updates_sync(
    db: AsyncSession = Depends(get_db),
) -> Dict[str, Any]:
    """Polls Telegram updates to register new subscribers who launched the bot."""
    stats = await sync_telegram_bot_updates(db)
    return stats


@router.post("/request-verification")
async def request_telegram_verification(
    req: TelegramVerificationRequest,
    db: AsyncSession = Depends(get_db),
) -> Dict[str, Any]:
    """Issues a cryptographic 6-digit challenge code sent via Telegram to prove mobile device ownership.
    
    Prevents unauthorized third parties from registering chat IDs they do not control.
    """
    check_telegram_rate_limit(req.chat_id, limit=5, window_seconds=300)

    # Generate 6-digit secure numeric verification challenge
    code = f"{secrets.randbelow(900000) + 100000}"
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=10)

    stmt = select(TelegramSubscription).where(TelegramSubscription.chat_id == req.chat_id)
    res = await db.execute(stmt)
    sub = res.scalars().first()

    if sub:
        sub.verification_code = code
        sub.verification_code_expires_at = expires_at
        sub.verification_attempts = 0
        # If the subscription is already verified, preserve its active verified status (P0-DoS defense)
        # Prevents an attacker from un-verifying a victim's active subscription by requesting a verification code
        if not sub.is_verified:
            if req.city_name:
                sub.city_name = req.city_name
            if req.latitude is not None:
                sub.latitude = req.latitude
            if req.longitude is not None:
                sub.longitude = req.longitude
    else:
        sub = TelegramSubscription(
            chat_id=req.chat_id,
            city_name=req.city_name or "My Location",
            latitude=req.latitude,
            longitude=req.longitude,
            verification_code=code,
            verification_code_expires_at=expires_at,
            verification_attempts=0,
            is_verified=False,
            is_active=False,
        )
        db.add(sub)

    await db.commit()

    # Deliver challenge to the actual Telegram mobile device
    challenge_text = (
        f"🔐 *SkyGuard Subscription Verification Code*\n\n"
        f"Your 6-digit verification code is: `{code}`\n\n"
        f"Enter this code on the SkyGuard web platform to prove ownership of this mobile device.\n"
        f"⏱ _Code expires in 10 minutes._"
    )
    success, status_code, err = await send_telegram_message(req.chat_id, challenge_text)
    if not success:
        raise HTTPException(
            status_code=status_code if status_code in (400, 403, 404) else 500,
            detail=f"Unable to dispatch verification code to Telegram chat {req.chat_id}: {err}",
        )

    return {
        "status": "CHALLENGE_DISPATCHED",
        "chat_id": req.chat_id,
        "expires_in_seconds": 600,
        "message": f"6-digit challenge code dispatched to Telegram chat {req.chat_id}. Please confirm on the web interface.",
    }


@router.post("/verify-code")
async def verify_telegram_code(
    req: TelegramVerifyCodeRequest,
    db: AsyncSession = Depends(get_db),
) -> Dict[str, Any]:
    """Confirms mobile device ownership using the 6-digit challenge code and returns an authenticated possession token."""
    stmt = select(TelegramSubscription).where(TelegramSubscription.chat_id == req.chat_id)
    res = await db.execute(stmt)
    sub = res.scalars().first()

    if not sub:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No pending verification found for this chat ID. Please request a verification code first.",
        )

    now = datetime.now(timezone.utc)
    if not sub.verification_code or not sub.verification_code_expires_at:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No active verification code pending. Please request a new code.",
        )

    exp = sub.verification_code_expires_at
    if exp.tzinfo is None:
        exp = exp.replace(tzinfo=timezone.utc)

    if now > exp:
        sub.verification_code = None
        sub.verification_code_expires_at = None
        sub.verification_attempts = 0
        await db.commit()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Verification code has expired. Please request a new 6-digit code.",
        )

    # Brute-force challenge defense: enforce maximum 3 verification attempts per challenge (P0)
    attempts = getattr(sub, "verification_attempts", 0) or 0
    if attempts >= 3:
        sub.verification_code = None
        sub.verification_code_expires_at = None
        sub.verification_attempts = 0
        await db.commit()
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Maximum verification attempts exceeded. Verification code has been revoked. Please request a new code.",
        )

    if secrets.compare_digest(sub.verification_code.strip(), req.code.strip()) is False:
        sub.verification_attempts = attempts + 1
        await db.commit()
        remaining = 3 - sub.verification_attempts
        if remaining <= 0:
            sub.verification_code = None
            sub.verification_code_expires_at = None
            sub.verification_attempts = 0
            await db.commit()
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Maximum verification attempts exceeded. Verification code has been revoked. Please request a new code.",
            )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid verification code. {remaining} attempt(s) remaining.",
        )

    # Code matches: activate subscription and issue possession auth token
    auth_token = secrets.token_urlsafe(24)
    sub.is_verified = True
    sub.is_active = True
    sub.auth_token = auth_token
    sub.verification_code = None
    sub.verification_code_expires_at = None
    sub.verification_attempts = 0
    if req.city_name:
        sub.city_name = req.city_name
    if req.latitude is not None:
        sub.latitude = req.latitude
    if req.longitude is not None:
        sub.longitude = req.longitude

    await db.commit()

    # Deliver confirmed welcome message
    confirmed_text = (
        f"✅ *Mobile Alert Device Confirmed!*\n\n"
        f"📍 *Sector:* `{sub.city_name or 'Global Alerts'}`\n"
        f"Your device ownership has been verified. You will receive verified emergency bulletins for this area."
    )
    await send_telegram_message(req.chat_id, confirmed_text)

    return {
        "status": "VERIFIED_AND_SUBSCRIBED",
        "chat_id": req.chat_id,
        "city": sub.city_name,
        "auth_token": auth_token,
        "is_verified": True,
    }


@router.post("/subscribe")
async def register_telegram_subscription(
    req: TelegramManualSubscribeRequest,
    db: AsyncSession = Depends(get_db),
) -> Dict[str, Any]:
    """Updates an existing verified Telegram subscription with proof of ownership (possession token).
    Direct unverified subscription registration for arbitrary chat IDs is strictly prohibited (P0-1).
    All new subscribers must complete the challenge-response verification flow via /request-verification and /verify-code.
    """
    stmt = select(TelegramSubscription).where(TelegramSubscription.chat_id == req.chat_id)
    res = await db.execute(stmt)
    sub = res.scalars().first()

    if not sub or not sub.is_verified or not sub.auth_token:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Forbidden: Mobile device ownership verification required. Please use /api/v1/telegram/request-verification to initiate challenge-response verification.",
        )

    # Existing verified subscription requires possession token matching
    if not req.existing_token or not secrets.compare_digest(req.existing_token.strip(), sub.auth_token.strip()):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Forbidden: Invalid or missing possession auth_token for this Telegram subscription.",
        )

    sub.city_name = req.city_name or sub.city_name
    sub.latitude = req.latitude if req.latitude is not None else sub.latitude
    sub.longitude = req.longitude if req.longitude is not None else sub.longitude
    sub.is_active = True
    await db.commit()

    # Send confirmation message
    welcome_text = (
        f"✅ *SkyGuard Alert Subscription Updated!*\n\n"
        f"📍 *Target Location:* `{req.city_name}`\n"
        f"Your mobile device preferences have been updated for this sector."
    )
    await send_telegram_message(req.chat_id, welcome_text)

    return {
        "status": "SUBSCRIBED",
        "chat_id": req.chat_id,
        "city": req.city_name,
        "auth_token": sub.auth_token,
        "is_verified": True,
    }


@router.post("/test-alert")
async def send_test_telegram_alert(
    req: TelegramTestAlertRequest,
    x_worker_key: Optional[str] = Header(None, alias="X-Worker-Key"),
    db: AsyncSession = Depends(get_db),
) -> Dict[str, Any]:
    """Dispatches a purely hazard-neutral diagnostic verification card to a mobile Telegram device.
    
    Security & Scientific Integrity (P0-2, P0-7):
    1. Zero unsupported local warning-status claims: uses purely hazard-neutral diagnostic text.
    2. Strict authentication: treats absent worker keys as unauthorized (no None == None bypass).
    3. Requires valid possession auth_token or securely configured X-Worker-Key.
    4. Rate limited to prevent mobile spam.
    """
    check_telegram_rate_limit(req.chat_id)

    # Verify authorization if chat is registered in database
    stmt = select(TelegramSubscription).where(TelegramSubscription.chat_id == req.chat_id)
    res = await db.execute(stmt)
    sub = res.scalars().first()

    if sub:
        if not sub.is_verified:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Forbidden: Mobile device ownership is not verified. Please complete challenge-response verification first.",
            )

        is_worker = False
        if x_worker_key and settings.INTERNAL_WORKER_KEY:
            is_worker = secrets.compare_digest(x_worker_key.strip(), settings.INTERNAL_WORKER_KEY.strip())

        has_valid_token = False
        if req.auth_token and sub.auth_token:
            has_valid_token = secrets.compare_digest(req.auth_token.strip(), sub.auth_token.strip())

        if not is_worker and not has_valid_token:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Forbidden: Valid subscription auth_token or configured X-Worker-Key required to dispatch test alerts to registered chat.",
            )
    else:
        # P0 Audit Defense: Unregistered destination chat IDs require administrative worker key
        # Prevents arbitrary anonymous users from dispatching diagnostic cards to arbitrary third-party chat IDs
        is_worker = False
        if x_worker_key and settings.INTERNAL_WORKER_KEY:
            is_worker = secrets.compare_digest(x_worker_key.strip(), settings.INTERNAL_WORKER_KEY.strip())

        if not is_worker:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Forbidden: Target Telegram chat is not registered or verified. Test dispatch to unregistered destinations requires administrative worker authorization.",
            )

    # Purely hazard-neutral diagnostic verification payload (P0-7)
    diagnostic_card = {
        "event": "Diagnostic Connectivity Verification",
        "severity": "Informational",
        "headline": f"SkyGuard Diagnostic Verification: Telegram mobile delivery channel operational for '{req.location}'.",
        "affected_area": req.location or "Verified Location",
        "issuer": "SkyGuard System Diagnostics",
        "local_color_code": "Diagnostic Test",
        "instruction": (
            "Technical diagnostic check: Web-to-mobile dispatch is operational. "
            "This is an automated technical verification test and is purely hazard-neutral. "
            "It does not indicate active weather conditions or emergency hazard status."
        ),
    }
    card_text = format_emergency_telegram_card(diagnostic_card)

    success, code, result = await send_telegram_message(
        chat_id=req.chat_id,
        text=card_text,
    )
    if not success:
        raise HTTPException(
            status_code=code if code in (400, 403, 404) else 500,
            detail=f"Telegram delivery failed: {result}",
        )

    return {
        "status": "DELIVERED",
        "chat_id": req.chat_id,
        "telegram_message_id": result,
        "message": f"Diagnostic test alert delivered to Telegram chat {req.chat_id} successfully.",
    }


@router.get("/subscribers/count")
async def get_telegram_subscriber_count(
    db: AsyncSession = Depends(get_db),
) -> Dict[str, Any]:
    """Returns the count of active mobile Telegram subscribers."""
    stmt = select(func.count(TelegramSubscription.id)).where(TelegramSubscription.is_active.is_(True))
    res = await db.execute(stmt)
    count = res.scalar() or 0
    return {"active_telegram_subscribers": count}
