"""Stress, concurrency, boundary condition, and security hardening test suite for SkyGuard."""
import asyncio
import json
import math
import random
from datetime import datetime, timezone
from typing import List

import pytest
from httpx import ASGITransport, AsyncClient
from shapely.geometry import Polygon

from services.api.app.adapters.geo_utils import haversine_distance_km
from services.api.app.adapters.source_registry import strictly_matches_country
from services.api.app.config import settings
from services.api.app.main import app
from services.api.app.schemas.farmer import CropTypeEnum
from services.api.app.schemas.global_alerts import GlobalAlertItem
from services.api.app.schemas.weather import DailyForecastPoint
from services.api.app.services.farmer_engine import evaluate_farmer_watches
from services.api.app.services.geo_matcher import (
    evaluate_alert_spatial_match,
    parse_cap_circle,
    parse_cap_polygon,
)
from services.api.app.services.push_service import validate_push_endpoint
from services.api.app.services.risk_engine import evaluate_forecast_risks


@pytest.mark.asyncio
async def test_stress_concurrent_health_and_local_queries():
    """Stress test: 50 concurrent requests against the FastAPI ASGI application."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        tasks = []
        for _ in range(50):
            tasks.append(client.get("/health"))
        responses = await asyncio.gather(*tasks)

        for resp in responses:
            assert resp.status_code == 200
            data = resp.json()
            assert data["status"] == "HEALTHY"


def test_hardening_pathological_polygon_inputs():
    """Hardening: Ensure geo_matcher handles malformed, degenerate, and adversarial polygons without crashing."""
    # 1. None and empty strings
    assert parse_cap_polygon("") is None
    assert parse_cap_polygon("   ") is None
    assert parse_cap_polygon(None) is None

    # 2. Insufficient points
    assert parse_cap_polygon("17.5,78.5") is None
    assert parse_cap_polygon("17.5,78.5 18.0,79.0") is None

    # 3. Corrupt coordinate values
    assert parse_cap_polygon("abc,def ghi,jkl mno,pqr") is None
    assert parse_cap_polygon("17.5,nan 18.0,79.0 17.5,79.5 17.5,nan") is None
    assert parse_cap_polygon("17.5,inf 18.0,79.0 17.5,79.5 17.5,inf") is None

    # 4. Out-of-bounds coordinates
    assert parse_cap_polygon("95.0,78.5 18.0,79.0 17.5,79.5 95.0,78.5") is None
    assert parse_cap_polygon("17.5,190.5 18.0,79.0 17.5,79.5 17.5,190.5") is None

    # 5. Self-intersecting bow-tie polygon (Shapely make_valid hardening)
    bowtie = "10.0,10.0 20.0,20.0 10.0,20.0 20.0,10.0 10.0,10.0"
    poly = parse_cap_polygon(bowtie)
    assert poly is not None
    assert poly.is_valid

    # 6. Large polygon with 360 points (simulating complex river basin or coastal storm surge)
    center_lat, center_lon = 18.0, 79.0
    radius_deg = 0.5
    circle_coords = []
    for deg in range(0, 360, 5):
        rad = math.radians(deg)
        circle_coords.append(f"{center_lat + radius_deg * math.sin(rad):.4f},{center_lon + radius_deg * math.cos(rad):.4f}")
    large_poly_str = " ".join(circle_coords)
    large_poly = parse_cap_polygon(large_poly_str)
    assert large_poly is not None
    assert large_poly.is_valid


def test_hardening_pathological_circle_inputs():
    """Hardening: Ensure CAP circle parser rejects malformed and negative radius values."""
    assert parse_cap_circle("") is None
    assert parse_cap_circle("17.5,78.5") is None
    assert parse_cap_circle("17.5,78.5 -50.0") is None
    assert parse_cap_circle("17.5,78.5 abc") is None
    assert parse_cap_circle("95.0,78.5 25.0") is None

    # Valid circle
    valid = parse_cap_circle("17.5,78.5 50.0")
    assert valid == (17.5, 78.5, 50.0)


def test_hardening_ssrf_malicious_endpoints():
    """Security hardening: Verify push endpoint validation blocks dangerous SSRF injection vectors."""
    blocked_endpoints = [
        "http://fcm.googleapis.com/fcm/send",  # Insecure HTTP
        "https://fcm.googleapis.com:8080/fcm/send",  # Non-standard port
        "https://localhost:443/push",  # Localhost
        "https://127.0.0.1:443/push",  # Loopback
        "https://169.254.169.254:443/latest/meta-data/",  # AWS EC2 metadata
        "https://metadata.google.internal:443/computeMetadata/v1/",  # GCP metadata
        "https://evil-attacker.com:443/fcm",  # Non-whitelisted domain
        "https://fcm.googleapis.com.evil.com:443/fcm",  # Domain spoofing
        "ftp://fcm.googleapis.com/fcm",  # Non-HTTPS protocol
        "",
        None,
    ]
    for ep in blocked_endpoints:
        assert not validate_push_endpoint(ep), f"Endpoint {ep} should have been blocked!"


def test_hardening_farmer_engine_extreme_weather():
    """Stress test: Evaluate farmer engine under 50 randomized extreme boundary scenarios."""
    crops = list(CropTypeEnum)

    for i in range(50):
        selected_crop = crops[i % len(crops)]
        # Generate extreme daily forecast points
        daily_points: List[DailyForecastPoint] = []
        for day_idx in range(7):
            t_max = random.uniform(-20.0, 55.0)
            t_min = t_max - random.uniform(5.0, 15.0)
            rain = random.choice([0.0, 0.2, 5.0, 45.0, 120.0, 300.0])
            daily_points.append(
                DailyForecastPoint(
                    date=f"2026-06-{10 + day_idx:02d}",
                    temperature_2m_max=t_max,
                    temperature_2m_min=t_min,
                    precipitation_sum=rain,
                    precipitation_probability_max=random.uniform(0.0, 100.0),
                    wind_speed_10m_max=random.uniform(5.0, 90.0),
                    wind_gusts_10m_max=random.uniform(10.0, 140.0),
                    weather_code=random.choice([0, 3, 61, 65, 95]),
                    weather_description="Clear sky",
                    weather_icon="clear",
                )
            )

        resp = evaluate_farmer_watches(
            crop=selected_crop,
            daily_points=daily_points,
            sowing_date_str="2026-05-01",
        )
        assert resp is not None
        assert resp.crop == selected_crop.value
        assert "DISCONNECTED" in resp.hardware_gating.soil_moisture_sensor.value
        assert "GATED" in resp.hardware_gating.satellite_ndvi_index.value


def test_hardening_risk_engine_extreme_temperatures():
    """Stress test: Risk engine evaluates extreme physical anomalies without raising exceptions."""
    # Scenario: Deep freeze to extreme heatwave
    points = [
        DailyForecastPoint(
            date="2026-05-01",
            temperature_2m_max=52.0,  # Extreme heatwave
            temperature_2m_min=32.0,
            precipitation_sum=0.0,
            precipitation_probability_max=0.0,
            wind_speed_10m_max=20.0,
            wind_gusts_10m_max=40.0,
            weather_code=0,
            weather_description="Clear sky",
            weather_icon="clear",
        ),
        DailyForecastPoint(
            date="2026-05-02",
            temperature_2m_max=28.0,
            temperature_2m_min=20.0,
            precipitation_sum=150.0,  # Extreme torrential rainfall
            precipitation_probability_max=99.0,
            wind_speed_10m_max=65.0,
            wind_gusts_10m_max=110.0,  # Severe squall / cyclone gusts
            weather_code=95,
            weather_description="Thunderstorm",
            weather_icon="thunderstorm",
        ),
    ]
    resp = evaluate_forecast_risks(points)
    assert resp is not None
    assert len(resp.signals) >= 3

    categories = [s.category for s in resp.signals]
    assert any("Heatwave" in c for c in categories)
    assert any("Rainfall" in c for c in categories)
    assert any("Wind" in c for c in categories)


def test_hardening_strict_country_matching_fuzzy_rejections():
    """Hardening: Ensure strict country matcher never yields false positive substring hits."""
    # Should match
    assert strictly_matches_country("IN", "IN")
    assert strictly_matches_country("IND", "IN")
    assert strictly_matches_country("IN", "IND")
    assert strictly_matches_country("US", "USA")

    # Should NOT match
    assert not strictly_matches_country("IN", "CHINA")
    assert not strictly_matches_country("IN", "ID")  # Indonesia
    assert not strictly_matches_country("US", "AUS")  # Australia
    assert not strictly_matches_country("DE", "DENMARK")
    assert not strictly_matches_country("CA", "CAMBODIA")
