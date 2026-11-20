"""Tests for Worldwide Weather and Disaster Alert Adapters (GDACS, WMO SWIC, Alert-Hub)."""
import pytest
from httpx import AsyncClient, ASGITransport
from services.api.app.adapters.gdacs import gdacs_adapter
from services.api.app.adapters.wmo import wmo_adapter
from services.api.app.adapters.alert_hub import alert_hub_adapter
from services.api.app.adapters.aggregator import global_alert_aggregator
from services.api.app.main import app
from services.api.app.schemas.global_alerts import AlertCategoryEnum, ProviderHealthStatus


@pytest.mark.live
@pytest.mark.asyncio
async def test_live_gdacs_adapter():
    alerts, health, total = await gdacs_adapter.fetch_alerts()
    assert health.status == ProviderHealthStatus.CONNECTED
    assert health.total_alerts_fetched > 0
    assert len(alerts) > 0
    first = alerts[0]
    assert first.source_provider == "GDACS"
    assert first.alert_type == AlertCategoryEnum.GDACS_DISASTER_ALERT
    assert first.headline is not None
    assert first.source_url.startswith("https://")


@pytest.mark.live
@pytest.mark.asyncio
async def test_live_wmo_adapter():
    alerts, health, total = await wmo_adapter.fetch_alerts()
    assert health.status == ProviderHealthStatus.CONNECTED
    assert health.total_alerts_fetched > 0
    assert len(alerts) > 0
    first = alerts[0]
    assert first.source_provider == "WMO SWIC"
    assert first.alert_type == AlertCategoryEnum.OFFICIAL_CAP_WARNING
    assert first.severity is not None
    assert first.headline is not None


@pytest.mark.live
@pytest.mark.asyncio
async def test_live_alerthub_adapter():
    alerts, health, total = await alert_hub_adapter.fetch_alerts()
    assert health.status == ProviderHealthStatus.CONNECTED
    assert health.total_alerts_fetched > 0
    assert len(alerts) > 0
    first = alerts[0]
    assert first.source_provider == "Alert-Hub.org"
    assert first.alert_type == AlertCategoryEnum.OFFICIAL_CAP_WARNING


@pytest.mark.live
@pytest.mark.asyncio
async def test_live_global_alert_endpoint():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Query global alerts near India coordinates
        response = await client.get("/api/v1/alerts/global?country_code=IN&latitude=17.9784&longitude=79.6005&radius_km=1500")
        assert response.status_code == 200
        data = response.json()
        assert "official_cap_warnings" in data
        assert "gdacs_disaster_alerts" in data
        assert "providers_health" in data
        assert "gdacs" in data["providers_health"]
        assert "wmo_swic" in data["providers_health"]
        assert "alert_hub" in data["providers_health"]
        assert data["provenance"]["provider"] is not None
