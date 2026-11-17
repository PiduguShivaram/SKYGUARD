"""Live upstream smoke tests against real Open-Meteo providers.

Verifies live geocoding and forecast queries with genuine data payloads.
"""
import pytest
from services.api.app.clients.open_meteo import open_meteo_client


@pytest.mark.asyncio
async def test_live_open_meteo_geocoding():
    # Real live geocoding query for "Warangal"
    results = await open_meteo_client.search_locations(query="Warangal", count=5)
    assert len(results) > 0
    top = results[0]
    assert "Warangal" in top.name
    assert abs(top.latitude - 17.97) < 0.5
    assert abs(top.longitude - 79.60) < 0.5
    assert top.country == "India"


@pytest.mark.asyncio
async def test_live_open_meteo_forecast():
    # Real live forecast for Warangal coordinates (17.9784, 79.6005)
    forecast = await open_meteo_client.get_forecast(latitude=17.9784, longitude=79.6005)
    assert forecast.latitude is not None
    assert forecast.longitude is not None
    assert forecast.current is not None
    assert forecast.current.temperature_2m is not None
    assert forecast.current.weather_description is not None
    assert len(forecast.daily) == 7
    assert len(forecast.hourly) >= 24
    assert forecast.provenance.provider == "Open-Meteo"
