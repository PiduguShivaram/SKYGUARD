"""Pydantic v2 schemas for push notification subscriptions, preferences, and diagnostics."""
from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, Field


class SubscriptionKeys(BaseModel):
    p256dh: str = Field(..., description="Client public encryption key in base64url")
    auth: str = Field(..., description="Client authentication secret in base64url")


class PushSubscribeRequest(BaseModel):
    endpoint: str = Field(..., description="Browser push service HTTPS endpoint")
    keys: SubscriptionKeys
    country_code: Optional[str] = Field(None, description="Optional ISO-3166 2-letter country code (e.g. IN, US)")
    latitude: Optional[float] = Field(None, ge=-90.0, le=90.0, description="Optional latitude for proximity matching")
    longitude: Optional[float] = Field(None, ge=-180.0, le=180.0, description="Optional longitude for proximity matching")
    radius_km: Optional[float] = Field(500.0, ge=10.0, le=20000.0, description="Geographic matching radius in km")
    categories: Optional[List[str]] = Field(
        default=["OFFICIAL_CAP_WARNING", "GDACS_DISASTER_ALERT"],
        description="Subscribed alert types",
    )
    min_severity: Optional[str] = Field(
        default="Moderate",
        description="Minimum severity threshold: Moderate, Severe, or Extreme",
    )


class PushSubscribeResponse(BaseModel):
    subscription_id: str
    possession_token: str = Field(
        ...,
        description="Secret client possession token required to view, update, or delete this subscription",
    )
    endpoint: str
    categories: List[str]
    min_severity: str
    country_code: Optional[str]
    latitude: Optional[float]
    longitude: Optional[float]
    radius_km: float
    created_at: datetime


class PushPreferencesResponse(BaseModel):
    subscription_id: str
    endpoint: str
    categories: List[str]
    min_severity: str
    country_code: Optional[str]
    latitude: Optional[float]
    longitude: Optional[float]
    radius_km: float
    is_active: bool
    created_at: datetime
    updated_at: datetime


class PushPreferencesUpdateRequest(BaseModel):
    categories: Optional[List[str]] = None
    min_severity: Optional[str] = None
    country_code: Optional[str] = None
    latitude: Optional[float] = Field(None, ge=-90.0, le=90.0)
    longitude: Optional[float] = Field(None, ge=-180.0, le=180.0)
    radius_km: Optional[float] = Field(None, ge=10.0, le=20000.0)
    is_active: Optional[bool] = None


class PushUnsubscribeResponse(BaseModel):
    status: str = "UNSUBSCRIBED"
    subscription_id: str


class VapidPublicKeyResponse(BaseModel):
    public_key: str = Field(..., description="VAPID applicationServerKey for PushManager.subscribe")


class DiagnosticPushTestResponse(BaseModel):
    status: str
    message: str
    tag: str
    delivered_at: str
    note: str = "Technical diagnostic notification. Contains zero weather or disaster claims."
