"""Integration tests for FastAPI router endpoints."""
import pytest
from httpx import AsyncClient, ASGITransport
from services.api.app.main import app


@pytest.mark.asyncio
async def test_server_health_only_endpoint():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get("/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "HEALTHY"
        assert "SkyGuard" in data["service"]


@pytest.mark.live
@pytest.mark.asyncio
async def test_health_with_providers():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get("/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] in ("HEALTHY", "DEGRADED", "UNAVAILABLE")
        assert "open_meteo" in data["upstream_providers"]


@pytest.mark.live
@pytest.mark.asyncio
async def test_api_v1_locations_endpoint():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get("/api/v1/locations?q=Warangal&count=5&country_code=IN")
        assert response.status_code == 200
        data = response.json()
        assert data["count"] > 0
        assert data["provenance"]["provider"] == "Open-Meteo Geocoding API"


@pytest.mark.live
@pytest.mark.asyncio
async def test_api_v1_weather_endpoint():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get("/api/v1/weather?latitude=17.9784&longitude=79.6005")
        assert response.status_code == 200
        data = response.json()
        assert data["requested_latitude"] == 17.9784
        assert data["requested_longitude"] == 79.6005
        assert len(data["daily"]) == 7
        assert "temperature" in data["units"]
        assert data["provenance"]["provider"] == "Open-Meteo"
