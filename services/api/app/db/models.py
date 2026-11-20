"""SQLAlchemy database models for subscriptions, alerts, and delivery audit logs."""
import uuid
from datetime import datetime, timezone
from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    Float,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
    UniqueConstraint,
)
from services.api.app.db.base import Base


def utc_now():
    return datetime.now(timezone.utc)


class PushSubscription(Base):
    """User browser push subscription securely bound by a cryptographic possession token."""

    __tablename__ = "push_subscriptions"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    possession_token_hash = Column(String(64), nullable=False, index=True)
    endpoint = Column(Text, nullable=False, unique=True, index=True)
    p256dh = Column(Text, nullable=False)
    auth = Column(Text, nullable=False)

    # Location preferences (optional country code or coordinate bounding)
    country_code = Column(String(8), nullable=True, index=True)
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    radius_km = Column(Float, nullable=False, default=500.0)
    wants_country_wide = Column(Boolean, nullable=False, default=False)

    # Filtering preferences
    categories = Column(Text, nullable=False, default='["OFFICIAL_CAP_WARNING", "GDACS_DISASTER_ALERT"]')
    min_severity = Column(String(16), nullable=False, default="Moderate")

    is_active = Column(Boolean, nullable=False, default=True, index=True)
    last_seen_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=False, default=utc_now)
    updated_at = Column(DateTime(timezone=True), nullable=False, default=utc_now, onupdate=utc_now)

    __table_args__ = (
        Index("idx_active_country", "is_active", "country_code"),
    )


class NotificationDelivery(Base):
    """Delivery attempt log with idempotency keys and retry scheduling."""

    __tablename__ = "notification_deliveries"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    subscription_id = Column(
        String(36),
        ForeignKey("push_subscriptions.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    alert_id = Column(String(128), nullable=False, index=True)
    idempotency_key = Column(String(192), nullable=False, unique=True, index=True)

    delivered_at = Column(DateTime(timezone=True), nullable=False, default=utc_now)
    # GATEWAY_ACCEPTED, TRANSIENT_FAILURE, PERMANENT_FAILURE, FILTERED_OUT
    status = Column(String(32), nullable=False)
    http_status = Column(Integer, nullable=True)
    retry_count = Column(Integer, nullable=False, default=0)
    next_retry_at = Column(DateTime(timezone=True), nullable=True)
    gateway_receipt = Column(String(128), nullable=True)
    error_message = Column(Text, nullable=True)

    __table_args__ = (
        UniqueConstraint("subscription_id", "alert_id", name="uq_subscription_alert"),
        Index("idx_delivery_retry", "status", "next_retry_at"),
    )


class AlertRecord(Base):
    """Authoritative alert cache with timestamps for fast matching and detail inspection."""

    __tablename__ = "alert_records"

    id = Column(String(128), primary_key=True)
    source_provider = Column(String(64), nullable=False, index=True)
    alert_type = Column(String(64), nullable=False, index=True)
    event = Column(String(128), nullable=False)
    headline = Column(Text, nullable=False)
    severity = Column(String(32), nullable=False, index=True)
    urgency = Column(String(32), nullable=True)
    certainty = Column(String(32), nullable=True)
    local_color_code = Column(String(64), nullable=True)
    language = Column(String(16), nullable=True)
    msg_type = Column(String(32), nullable=True)
    issuer = Column(String(128), nullable=False)
    country_code = Column(String(8), nullable=True, index=True)
    affected_area = Column(Text, nullable=False)
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    polygons_json = Column(Text, nullable=True)
    geocodes_json = Column(Text, nullable=True)
    is_country_wide = Column(Boolean, nullable=False, default=False)
    geographic_status = Column(String(32), nullable=False, default="LOCATION_VERIFIED")
    effective_time = Column(String(64), nullable=True)
    expires_time = Column(String(64), nullable=True)
    description = Column(Text, nullable=False)
    source_url = Column(Text, nullable=False)
    raw_json = Column(Text, nullable=True)
    retrieved_at = Column(DateTime(timezone=True), nullable=False, default=utc_now)
    is_active = Column(Boolean, nullable=False, default=True, index=True)

    __table_args__ = (
        Index("idx_alert_active_type", "is_active", "alert_type"),
        Index("idx_alert_country_active", "country_code", "is_active"),
    )
