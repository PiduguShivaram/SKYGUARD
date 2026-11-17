"""Farmer Mode agronomic router."""
from fastapi import APIRouter
from services.api.app.schemas.farmer import FarmerWatchRequest, FarmerWatchResponse
from services.api.app.services.farmer_engine import evaluate_farmer_watches

router = APIRouter(prefix="/api/v1/farmer", tags=["Farmer Mode"])


@router.post("/watch", response_model=FarmerWatchResponse)
async def get_farmer_watches(payload: FarmerWatchRequest):
    return evaluate_farmer_watches(
        crop=payload.crop,
        daily_points=payload.daily_forecast,
        sowing_date_str=payload.sowing_date,
    )
