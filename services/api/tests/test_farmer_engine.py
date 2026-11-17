"""Test Farmer Mode agronomic logic and telemetry gating."""
import pytest
from services.api.app.schemas.farmer import CropTypeEnum, SensorStatusEnum
from services.api.app.schemas.weather import DailyForecastPoint
from services.api.app.services.farmer_engine import evaluate_farmer_watches


def test_dry_spell_watch_generation():
    points = [
        DailyForecastPoint(
            date="2026-11-18",
            weather_code=0,
            weather_description="Clear",
            weather_icon="clear",
            temperature_2m_max=36.0,
            temperature_2m_min=22.0,
            precipitation_sum=0.0,
            wind_gusts_10m_max=15.0,
        )
    ]
    res = evaluate_farmer_watches(crop=CropTypeEnum.COTTON, daily_points=points)
    assert len(res.watches) >= 1
    watch = res.watches[0]
    assert "Dry Spell" in watch.category
    assert "Cotton" in watch.crop


def test_hardware_gating_status_enforced():
    points = []
    res = evaluate_farmer_watches(crop=CropTypeEnum.PADDY, daily_points=points)
    assert res.hardware_gating.soil_moisture_sensor == SensorStatusEnum.DISCONNECTED
    assert res.hardware_gating.satellite_ndvi_index == SensorStatusEnum.GATED
    assert res.hardware_gating.field_yield_model == SensorStatusEnum.GATED
    assert "strictly disabled" in res.hardware_gating.explanation
