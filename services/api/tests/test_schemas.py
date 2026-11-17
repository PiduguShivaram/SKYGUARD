"""Test Pydantic v2 schema validations and provenance requirements."""
from datetime import datetime, timezone
import pytest
from services.api.app.schemas.common import Provenance, ErrorResponse
from services.api.app.schemas.geo import LocationSearchResult
from services.api.app.schemas.weather import CurrentWeather


def test_provenance_schema():
    prov = Provenance(
        provider="Open-Meteo",
        attribution_url="https://open-meteo.com",
        disclaimer="Numerical model forecast.",
    )
    assert prov.provider == "Open-Meteo"
    assert prov.retrieved_at.tzinfo == timezone.utc


def test_location_search_result_formatting():
    loc = LocationSearchResult(
        id=123,
        name="Hyderabad",
        latitude=17.3850,
        longitude=78.4867,
        country="India",
        admin1="Telangana",
        formatted_label="Hyderabad, Telangana, India",
    )
    assert loc.name == "Hyderabad"
    assert "Telangana" in loc.formatted_label


def test_current_weather_schema():
    cw = CurrentWeather(
        time="2026-11-17T12:00:00Z",
        temperature_2m=28.5,
        relative_humidity_2m=55.0,
        apparent_temperature=30.1,
        is_day=1,
        precipitation=0.0,
        weather_code=1,
        weather_description="Mainly clear",
        weather_icon="mostly-clear",
        wind_speed_10m=12.4,
    )
    assert cw.temperature_2m == 28.5
    assert cw.weather_icon == "mostly-clear"
