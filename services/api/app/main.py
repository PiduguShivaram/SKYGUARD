"""FastAPI application entry point for SkyGuard API."""
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from services.api.app.config import settings
from services.api.app.routers import alerts, farmer, geo, health, risk, weather

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="SkyGuard API — Real-time Weather, Official Warnings, and Climate Intelligence",
    docs_url="/docs",
    redoc_url="/redoc",
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Routers
app.include_router(health.router)
app.include_router(geo.router)
app.include_router(weather.router)
app.include_router(alerts.router)
app.include_router(risk.router)
app.include_router(farmer.router)


@app.get("/")
async def root():
    return {
        "service": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "docs": "/docs",
        "health": "/api/health",
        "data_integrity_policy": "Strict zero-fabrication. Official warnings separated from numerical forecasts.",
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("services.api.app.main:app", host=settings.HOST, port=settings.PORT, reload=True)
