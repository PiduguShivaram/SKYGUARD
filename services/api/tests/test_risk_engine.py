"""Test deterministic risk engine calculations using pure test fixtures."""
import pytest
from services.api.app.schemas.risk import RiskSeverityEnum
from services.api.app.schemas.weather import DailyForecastPoint
from services.api.app.services.risk_engine import evaluate_forecast_risks


def test_heavy_rainfall_threshold():
    test_points = [
        DailyForecastPoint(
            date="2026-11-18",
            weather_code=65,
            weather_description="Heavy rain",
            weather_icon="heavy-rain",
            temperature_2m_max=29.0,
            temperature_2m_min=22.0,
            precipitation_sum=65.0,  # >= 64.5mm triggers IMD Official Heavy Rain
            precipitation_probability_max=95.0,
            wind_gusts_10m_max=35.0,
        )
    ]
    res = evaluate_forecast_risks(test_points)
    assert res.evaluated_days == 1
    assert len(res.signals) == 1
    sig = res.signals[0]
    assert sig.category == "Heavy Rainfall Indicator"
    assert sig.severity == RiskSeverityEnum.HIGH
    assert "65.0 mm" in sig.evidence


def test_extreme_heat_threshold():
    test_points = [
        DailyForecastPoint(
            date="2026-05-20",
            weather_code=0,
            weather_description="Clear sky",
            weather_icon="clear",
            temperature_2m_max=45.5,  # >= 45C triggers IMD Extreme Heatwave in plains
            temperature_2m_min=30.0,
            precipitation_sum=0.0,
            precipitation_probability_max=0.0,
            wind_gusts_10m_max=20.0,
        )
    ]
    res = evaluate_forecast_risks(test_points)
    assert len(res.signals) == 1
    sig = res.signals[0]
    assert sig.category == "Extreme Heatwave Indicator"
    assert sig.severity == RiskSeverityEnum.HIGH
    assert "45.5°C" in sig.evidence


def test_strong_wind_threshold():
    test_points = [
        DailyForecastPoint(
            date="2026-11-19",
            weather_code=95,
            weather_description="Thunderstorm",
            weather_icon="thunderstorm",
            temperature_2m_max=30.0,
            temperature_2m_min=24.0,
            precipitation_sum=15.0,
            precipitation_probability_max=60.0,
            wind_gusts_10m_max=75.0,  # >= 70 km/h triggers High
        )
    ]
    res = evaluate_forecast_risks(test_points)
    assert len(res.signals) == 1
    sig = res.signals[0]
    assert sig.category == "High Wind Squall Indicator"
    assert sig.severity == RiskSeverityEnum.HIGH


def test_benign_weather_no_unwarranted_risk():
    test_points = [
        DailyForecastPoint(
            date="2026-11-20",
            weather_code=1,
            weather_description="Mainly clear",
            weather_icon="mostly-clear",
            temperature_2m_max=28.0,
            temperature_2m_min=18.0,
            precipitation_sum=2.0,
            precipitation_probability_max=10.0,
            wind_gusts_10m_max=15.0,
        )
    ]
    res = evaluate_forecast_risks(test_points)
    assert len(res.signals) == 0
