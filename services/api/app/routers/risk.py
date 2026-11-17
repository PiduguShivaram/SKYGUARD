"""Derived risk assessment router."""
from fastapi import APIRouter
from services.api.app.schemas.risk import RiskEvaluationRequest, RiskEvaluationResponse
from services.api.app.services.risk_engine import evaluate_forecast_risks

router = APIRouter(prefix="/api/v1/risk", tags=["Risk Engine"])


@router.post("/evaluate", response_model=RiskEvaluationResponse)
async def evaluate_risk(payload: RiskEvaluationRequest):
    return evaluate_forecast_risks(payload.daily_forecast)
