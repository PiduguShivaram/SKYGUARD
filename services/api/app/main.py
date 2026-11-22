"""FastAPI application entry point for SkyGuard API."""
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from typing import Optional
from fastapi import FastAPI, Query, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from services.api.app.clients.open_meteo import open_meteo_client
from services.api.app.config import settings
from services.api.app.db.base import init_db
from services.api.app.routers import alerts, farmer, geo, health, push, risk, weather, prediction, telegram
from services.api.app.schemas.common import Provenance
from services.api.app.schemas.geo import GeocodingResponse
from services.api.app.schemas.weather import WeatherForecastResponse
from services.api.app.services.vapid_service import get_or_create_vapid


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize database tables and persistent VAPID keypair
    try:
        await init_db()
    except Exception as exc:
        print(f"[Lifespan Notice] Database init deferred: {exc}")
    try:
        get_or_create_vapid()
    except Exception as exc:
        print(f"[Lifespan Notice] VAPID init deferred: {exc}")
    yield


app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="SkyGuard API — Real-time Weather, Worldwide Disaster Alerts & Web Push System",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Core Endpoints matching API Contract
@app.get("/health", tags=["Health"])
async def get_health():
    """Server health only."""
    return {
        "status": "HEALTHY",
        "service": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "server_utc_time": datetime.now(timezone.utc).isoformat(),
    }


@app.get("/api/v1/locations", response_model=GeocodingResponse, tags=["Locations"])
async def get_locations(
    q: str = Query(..., min_length=2, description="Place or city search query"),
    count: int = Query(5, ge=1, le=20, description="Max results"),
    country_code: Optional[str] = Query(None, description="ISO-3166 country code (e.g. IN)"),
):
    """Search locations using Open-Meteo Geocoding API."""
    results = await open_meteo_client.search_locations(query=q, count=count, country_code=country_code)
    provenance = Provenance(
        provider="Open-Meteo Geocoding API",
        attribution_url="https://open-meteo.com/en/docs/geocoding-api",
        disclaimer="Geocoding data provided by Open-Meteo via OpenStreetMap and GeoNames data.",
    )
    return GeocodingResponse(
        query=q,
        count=len(results),
        results=results,
        provenance=provenance,
    )


@app.get("/api/v1/weather", response_model=WeatherForecastResponse, tags=["Weather"])
async def get_weather(
    latitude: float = Query(..., ge=-90.0, le=90.0, description="Latitude coordinate"),
    longitude: float = Query(..., ge=-180.0, le=180.0, description="Longitude coordinate"),
):
    """Retrieve 7-day forecast from Open-Meteo NWP model."""
    return await open_meteo_client.get_forecast(latitude=latitude, longitude=longitude)


# Include Additional Modular Routers
app.include_router(health.router)
app.include_router(geo.router)
app.include_router(weather.router)
app.include_router(alerts.router)
app.include_router(push.router)
app.include_router(risk.router)
app.include_router(farmer.router)
app.include_router(prediction.router)
app.include_router(telegram.router)


@app.get("/")
async def root():
    return {
        "service": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "docs": "/docs",
        "health": "/health",
        "data_integrity_policy": "Strict zero-fabrication. Real Open-Meteo & WMO/GDACS provider data.",
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("services.api.app.main:app", host=settings.HOST, port=settings.PORT, reload=True)
