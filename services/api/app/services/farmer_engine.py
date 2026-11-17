"""Farmer Mode Agronomic Engine.

Computes transparent agronomic weather watches based on physical forecast values.
Strictly gates soil telemetry, satellite indices, and yield loss claims.
"""
from datetime import date, datetime
from typing import List, Optional
from services.api.app.schemas.common import Provenance
from services.api.app.schemas.farmer import (
    CropTypeEnum,
    FarmerWatchResponse,
    FarmerWatchSignal,
    HardwareGatingStatus,
    SensorStatusEnum,
)
from services.api.app.schemas.weather import DailyForecastPoint


def evaluate_farmer_watches(
    crop: CropTypeEnum,
    daily_points: List[DailyForecastPoint],
    sowing_date_str: Optional[str] = None,
) -> FarmerWatchResponse:
    watches: List[FarmerWatchSignal] = []

    days_since_sowing: Optional[int] = None
    if sowing_date_str:
        try:
            s_date = datetime.strptime(sowing_date_str, "%Y-%m-%d").date()
            days_since_sowing = max(0, (date.today() - s_date).days)
        except ValueError:
            pass

    if daily_points:
        total_rain = sum(d.precipitation_sum for d in daily_points)
        hottest_day = max(daily_points, key=lambda d: d.temperature_2m_max)
        ref_date = daily_points[0].date

        # 1. Extended Dry Spell Watch
        if total_rain < 5.0 and hottest_day.temperature_2m_max >= 34.0:
            watches.append(
                FarmerWatchSignal(
                    category="Dry Spell & Irrigation Watch",
                    severity="Moderate",
                    crop=crop.value,
                    date=ref_date,
                    observation=f"7-day cumulative rainfall is {total_rain:.1f} mm; maximum projected temperature reaches {hottest_day.temperature_2m_max:.1f}°C.",
                    action=f"For {crop.value}, verify physical soil moisture depth before scheduling irrigation cycles. Ensure furrow/drip lines are cleared.",
                    scientific_rationale="ICAR Agrometeorological Advisory Guidelines: Sustained dry spells combined with high evaporative demand trigger root moisture stress.",
                )
            )

        # 2. Field Waterlogging / Inundation Watch
        heavy_rain_days = [d for d in daily_points if d.precipitation_sum >= 35.0]
        if heavy_rain_days:
            dates_list = ", ".join(d.date for d in heavy_rain_days)
            max_day_rain = max(d.precipitation_sum for d in heavy_rain_days)
            watches.append(
                FarmerWatchSignal(
                    category="Field Waterlogging & Drainage Watch",
                    severity="High" if max_day_rain >= 50.0 else "Moderate",
                    crop=crop.value,
                    date=heavy_rain_days[0].date,
                    observation=f"Heavy rainfall predicted on ({dates_list}) reaching up to {max_day_rain:.1f} mm in 24 hours.",
                    action=f"Clear farm field bund drainage outlets to prevent standing water in {crop.value} fields. Postpone top-dressing of fertilizers or foliar pesticide sprays.",
                    scientific_rationale="Standing water causes root hypoxia in upland crops (cotton, maize, pulses) and leaches soluble nitrogenous fertilizers.",
                )
            )

        # 3. Crop Thermal Stress Watch
        if hottest_day.temperature_2m_max >= 39.0:
            watches.append(
                FarmerWatchSignal(
                    category="Crop Canopy Thermal Stress Watch",
                    severity="Moderate",
                    crop=crop.value,
                    date=hottest_day.date,
                    observation=f"Peak ambient temperature of {hottest_day.temperature_2m_max:.1f}°C forecasted on {hottest_day.date}.",
                    action=f"Provide light evening or early morning irrigation to maintain microclimate humidity. Inspect for moisture stress or flower drop in {crop.value}.",
                    scientific_rationale="Temperatures exceeding 38-39°C accelerate pollen sterility and increase vapor pressure deficit (VPD).",
                )
            )

    gating = HardwareGatingStatus(
        soil_moisture_sensor=SensorStatusEnum.DISCONNECTED,
        satellite_ndvi_index=SensorStatusEnum.GATED,
        field_yield_model=SensorStatusEnum.GATED,
        explanation=(
            "Direct in-situ soil moisture telemetry, Sentinel-2 10m NDVI anomalies, and plot-level yield loss predictions "
            "require authenticated IoT nodes, Earth Engine credentials, and calibrated local agronomic validation. "
            "They are strictly disabled to prevent speculative or ungrounded farm decisions."
        ),
    )

    provenance = Provenance(
        provider="SkyGuard Agrometeorological Intelligence Engine",
        attribution_url="https://icar.org.in / https://imdagrimet.gov.in",
        disclaimer="Agronomic watches are heuristic operational suggestions based on forecast parameters. Always cross-reference with your local Krishi Vigyan Kendra (KVK) and State Agriculture University advisories.",
    )

    return FarmerWatchResponse(
        crop=crop.value,
        days_since_sowing=days_since_sowing,
        watches=watches,
        hardware_gating=gating,
        provenance=provenance,
    )
