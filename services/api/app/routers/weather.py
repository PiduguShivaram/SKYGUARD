"""Weather forecast router."""
from fastapi import APIRouter, HTTPException, Query
from services.api.app.clients.open_meteo import open_meteo_client
from services.api.app.schemas.weather import WeatherForecastResponse

router = APIRouter(prefix="/api/v1/weather", tags=["Weather"])


@router.get("/forecast", response_model=WeatherForecastResponse)
async def get_forecast(
    latitude: float = Query(..., ge=-90.0, le=90.0, description="Latitude coordinate"),
    longitude: float = Query(..., ge=-180.0, le=180.0, description="Longitude coordinate"),
):
    return await open_meteo_client.get_forecast(latitude=latitude, longitude=longitude)
