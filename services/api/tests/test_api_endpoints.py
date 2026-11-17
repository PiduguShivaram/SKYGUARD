"""Integration tests for FastAPI router endpoints."""
import pytest
from httpx import AsyncClient, ASGITransport
from services.api.app.main import app


@pytest.mark.asyncio
async def test_health_endpoint():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get("/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "HEALTHY"
        assert "open_meteo" in data["upstream_providers"]


@pytest.mark.asyncio
async def test_imd_alerts_unauthenticated_status():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get("/api/v1/alerts/imd?district=Warangal&state=Telangana")
        assert response.status_code == 200
        data = response.json()
        assert data["provider_status"] == "NOT_CONFIGURED"
        assert "unavailability_reason" in data
        assert "setup_instructions" in data
