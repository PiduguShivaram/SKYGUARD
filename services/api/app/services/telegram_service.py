"""Telegram Mobile Alert Dispatch Service.

Directly delivers verified emergency warnings and severe weather bulletins to mobile devices
via the official Telegram Bot API (https://t.me/skyguard_alerts_bot).
Operates without browser notification dependencies, providing instantaneous push to iOS & Android.
"""
import logging
import secrets
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Tuple

import httpx
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from services.api.app.config import settings
from services.api.app.db.models import AlertRecord, TelegramDelivery, TelegramSubscription
from services.api.app.services.geo_matcher import evaluate_alert_spatial_match

logger = logging.getLogger("SkyGuardTelegramService")


def get_telegram_api_url(method: str) -> str:
    token = settings.TELEGRAM_BOT_TOKEN
    return f"https://api.telegram.org/bot{token}/{method}"


async def send_telegram_message(
    chat_id: str | int,
    text: str,
    parse_mode: str = "Markdown",
    http_client: Optional[httpx.AsyncClient] = None,
) -> Tuple[bool, int, str]:
    """Sends a Telegram message to a user, channel, or group chat ID."""
    if not settings.TELEGRAM_BOT_TOKEN:
        return False, 400, "TELEGRAM_BOT_TOKEN not configured"

    url = get_telegram_api_url("sendMessage")
    payload = {
        "chat_id": chat_id,
        "text": text,
        "parse_mode": parse_mode,
        "disable_web_page_preview": True,
    }

    try:
        if http_client:
            resp = await http_client.post(url, json=payload, timeout=15.0)
        else:
            async with httpx.AsyncClient(timeout=15.0) as client:
                resp = await client.post(url, json=payload)

        data = resp.json()
        if resp.status_code == 200 and data.get("ok"):
            msg_id = str(data.get("result", {}).get("message_id", "OK"))
            return True, 200, msg_id
        else:
            err_desc = data.get("description", resp.text)
            logger.warning(f"Telegram API delivery error to {chat_id}: {err_desc}")
            return False, resp.status_code, err_desc
    except Exception as exc:
        logger.error(f"Telegram dispatch connection failed: {exc}", exc_info=True)
        return False, 500, str(exc)


def format_emergency_telegram_card(alert: Dict[str, Any] | AlertRecord) -> str:
    """Formats an official emergency warning for mobile Telegram display."""
    alert_id = getattr(alert, "id", None) or (alert.get("id") if isinstance(alert, dict) else "")
    event = getattr(alert, "event", None) or (alert.get("event") if isinstance(alert, dict) else "Weather Emergency")
    severity = getattr(alert, "severity", None) or (alert.get("severity") if isinstance(alert, dict) else "Severe")
    headline = getattr(alert, "headline", None) or (alert.get("headline") if isinstance(alert, dict) else "")
    area = getattr(alert, "affected_area", None) or (alert.get("affected_area") if isinstance(alert, dict) else "Your Location")
    issuer = getattr(alert, "issuer", None) or (alert.get("issuer") if isinstance(alert, dict) else "Meteorological Authority")
    color_code = getattr(alert, "local_color_code", None) or (alert.get("local_color_code") if isinstance(alert, dict) else None)
    instruction = getattr(alert, "instruction", None) or (alert.get("instruction") if isinstance(alert, dict) else None)

    sev_emoji = "🚨" if severity == "Extreme" else ("ℹ️" if severity.lower() == "informational" else "⚠️")
    color_badge = f" [{color_code}]" if color_code else ""

    action_text = instruction or (
        "• Secure loose outdoor items and stay sheltered indoors.\n"
        "• Avoid low-lying underpasses and waterlogged roadways.\n"
        "• Monitor official local emergency management channels."
    )

    alert_link = f"http://localhost:3000/alerts/{alert_id}" if alert_id and not alert_id.startswith("diag") else "http://localhost:3000"

    text = (
        f"{sev_emoji} *SKYGUARD EMERGENCY WEATHER ALERT*\n"
        f"━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n"
        f"🌪 *Hazard:* `{event}`\n"
        f"🛑 *Severity:* *{severity}*{color_badge}\n"
        f"📍 *Affected Area:* {area}\n"
        f"🏛 *Authority:* {issuer}\n\n"
        f"📋 *Official Statement:*\n"
        f"{headline}\n\n"
        f"🛡 *Action / Instructions:*\n"
        f"{action_text}\n\n"
        f"━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n"
        f"🌐 [View Alert Details & Live Radar]({alert_link})\n"
        f"⏱ _Dispatched: {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M UTC')}_"
    )
    return text


async def sync_telegram_bot_updates(
    db: AsyncSession,
    http_client: Optional[httpx.AsyncClient] = None,
) -> Dict[str, int]:
    """Polls recent bot updates to register new mobile subscribers who clicked Start."""
    if not settings.TELEGRAM_BOT_TOKEN:
        return {"status": 0, "error": "TELEGRAM_BOT_TOKEN missing"}

    url = get_telegram_api_url("getUpdates")
    params = {"timeout": 5, "allowed_updates": ["message"]}

    try:
        if http_client:
            resp = await http_client.get(url, params=params, timeout=10.0)
        else:
            async with httpx.AsyncClient(timeout=10.0) as client:
                resp = await client.get(url, params=params)

        if resp.status_code != 200:
            return {"updates_processed": 0, "status_code": resp.status_code}

        data = resp.json()
        updates = data.get("result", [])
        new_subs = 0

        for up in updates:
            msg = up.get("message")
            if not msg:
                continue

            chat = msg.get("chat", {})
            chat_id = str(chat.get("id"))
            text = (msg.get("text") or "").strip()
            username = chat.get("username")
            first_name = chat.get("first_name")

            if not chat_id:
                continue

            # Query existing
            stmt = select(TelegramSubscription).where(TelegramSubscription.chat_id == chat_id)
            res = await db.execute(stmt)
            sub = res.scalars().first()

            # Parse optional city/location from deep link /start loc_NewDelhi or lat_lon
            city_name = None
            lat = None
            lon = None
            if "/start" in text:
                parts = text.split()
                if len(parts) > 1:
                    payload = parts[1]
                    if payload.startswith("loc_"):
                        city_name = payload.replace("loc_", "").replace("_", " ")
                    elif payload.startswith("coord_"):
                        coord_parts = payload.replace("coord_", "").split("_")
                        if len(coord_parts) == 2:
                            try:
                                lat = float(coord_parts[0])
                                lon = float(coord_parts[1])
                            except ValueError:
                                pass

            if not sub:
                auth_token = secrets.token_urlsafe(24)
                sub = TelegramSubscription(
                    chat_id=chat_id,
                    username=username,
                    first_name=first_name,
                    city_name=city_name or "Global Alerts",
                    latitude=lat,
                    longitude=lon,
                    auth_token=auth_token,
                    is_verified=True,
                    is_active=True,
                )
                db.add(sub)
                new_subs += 1
                await db.commit()

                # Send welcome message
                welcome_text = (
                    f"✅ *Welcome to SkyGuard Mobile Alerts, {first_name or 'there'}!*\n\n"
                    f"Your mobile device is now securely connected to the **SkyGuard Emergency Weather Network**.\n\n"
                    f"Whenever verified severe weather hazards (cyclones, floods, severe storms, heatwaves) "
                    f"are issued for your area, an emergency notification card will be delivered directly here.\n\n"
                    f"• *Commands:*\n"
                    f"  `/status` — Check alert subscription\n"
                    f"  `/help` — Information & support"
                )
                await send_telegram_message(chat_id, welcome_text, http_client=http_client)
            else:
                # Update location if provided
                if city_name:
                    sub.city_name = city_name
                if lat is not None and lon is not None:
                    sub.latitude = lat
                    sub.longitude = lon
                sub.is_active = True
                await db.commit()

        return {"updates_processed": len(updates), "new_subscribers": new_subs}
    except Exception as exc:
        logger.error(f"Error polling Telegram updates: {exc}", exc_info=True)
        return {"error": str(exc)}
