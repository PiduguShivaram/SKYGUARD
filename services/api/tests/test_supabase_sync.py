"""Unit tests for Supabase Cloud Persistence & Mirroring Service."""
import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from services.api.app.services.supabase_sync import sync_alert_to_supabase, fetch_supabase_saved_locations


@pytest.mark.asyncio
async def test_supabase_graceful_fallback_when_unconfigured():
    with patch("services.api.app.services.supabase_sync.settings") as mock_settings:
        mock_settings.SUPABASE_URL = ""
        mock_settings.SUPABASE_KEY = ""
        
        # Should return False without raising
        result = await sync_alert_to_supabase({"id": "alert_123", "event": "Flood"})
        assert result is False
        
        # Should return empty list without raising
        locs = await fetch_supabase_saved_locations("user_test")
        assert locs == []


@pytest.mark.asyncio
async def test_sync_alert_to_supabase_mocked_success():
    with patch("services.api.app.services.supabase_sync.settings") as mock_settings:
        mock_settings.SUPABASE_URL = "https://mock.supabase.co"
        mock_settings.SUPABASE_KEY = "mock_secret_key"
        
        mock_resp = MagicMock()
        mock_resp.status_code = 201
        
        with patch("httpx.AsyncClient.post", new_callable=AsyncMock, return_value=mock_resp):
            success = await sync_alert_to_supabase({
                "id": "alert_imd_999",
                "event": "Cyclonic Storm",
                "headline": "Severe Cyclone Warning",
                "severity": "Extreme",
                "urgency": "Immediate",
                "certainty": "Observed",
                "sender": "IMD",
                "area_desc": "Odisha Coast",
            })
            assert success is True


@pytest.mark.asyncio
async def test_fetch_saved_locations_mocked_success():
    with patch("services.api.app.services.supabase_sync.settings") as mock_settings:
        mock_settings.SUPABASE_URL = "https://mock.supabase.co"
        mock_settings.SUPABASE_KEY = "mock_secret_key"
        
        mock_resp = MagicMock()
        mock_resp.status_code = 200
        mock_resp.json.return_value = [
            {"id": "loc_1", "name": "Sydney", "latitude": -33.8688, "longitude": 151.2093}
        ]
        
        with patch("httpx.AsyncClient.get", new_callable=AsyncMock, return_value=mock_resp):
            locs = await fetch_supabase_saved_locations("user_dev_1")
            assert len(locs) == 1
            assert locs[0]["name"] == "Sydney"
