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


CROP_PHENOLOGY = {
    CropTypeEnum.PADDY: [
        (25, "Seedling & Nursery Stage"),
        (55, "Tillering & Vegetative Stage"),
        (85, "Panicle Initiation & Flowering"),
        (125, "Grain Filling & Ripening"),
    ],
    CropTypeEnum.COTTON: [
        (30, "Seedling & Early Vegetative"),
        (60, "Squaring & Pre-Flowering"),
        (110, "Peak Flowering & Boll Development"),
        (160, "Boll Opening & Maturity"),
    ],
    CropTypeEnum.MAIZE: [
        (20, "Emergence & Early Vegetative"),
        (45, "Knee-High Rapid Growth"),
        (65, "Critical Tasseling & Silking"),
        (100, "Grain Filling & Dough Stage"),
    ],
    CropTypeEnum.WHEAT: [
        (25, "Crown Root Initiation (CRI)"),
        (60, "Tillering & Jointing"),
        (85, "Heading & Anthesis"),
        (120, "Terminal Grain Filling"),
    ],
    CropTypeEnum.SOYBEAN: [
        (15, "Emergence & Seedling"),
        (35, "Vegetative Branching"),
        (70, "Flowering & Pod Initiation"),
        (105, "Pod Fill & Maturity"),
    ],
    CropTypeEnum.TOMATO: [
        (25, "Transplant & Root Establishment"),
        (45, "Vegetative Vine Growth"),
        (75, "Flowering & Fruit Development"),
        (120, "Fruit Ripening & Harvest"),
    ],
}


def estimate_crop_stage(crop: CropTypeEnum, days_since_sowing: Optional[int]) -> str:
    if days_since_sowing is None:
        return "Unspecified Growth Stage (Sowing date not set)"
    stages = CROP_PHENOLOGY.get(crop, [])
    for threshold_days, stage_name in stages:
        if days_since_sowing <= threshold_days:
            return f"{stage_name} (Day {days_since_sowing})"
    return f"Late Season / Harvest Window (Day {days_since_sowing})"


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

    current_stage = estimate_crop_stage(crop, days_since_sowing)

    if daily_points:
        total_rain = sum(d.precipitation_sum for d in daily_points)
        hottest_day = max(daily_points, key=lambda d: d.temperature_2m_max)
        ref_date = daily_points[0].date

        # 1. Crop-Specific Dry Spell & Soil Moisture Stress Watch
        # Thresholds calibrated to crop physiological root depth and evaporative demand (FAO-56)
        dry_spell_rain_threshold = 15.0 if crop == CropTypeEnum.PADDY else 5.0
        dry_spell_temp_threshold = 32.0 if crop == CropTypeEnum.WHEAT else 34.0
        if total_rain < dry_spell_rain_threshold and hottest_day.temperature_2m_max >= dry_spell_temp_threshold:
            watches.append(
                FarmerWatchSignal(
                    category="Dry Spell & Irrigation Watch",
                    severity="High" if (crop in (CropTypeEnum.PADDY, CropTypeEnum.TOMATO) or total_rain < 2.0) else "Moderate",
                    crop=crop.value,
                    date=ref_date,
                    observation=(
                        f"7-day cumulative rainfall is {total_rain:.1f} mm; maximum projected temperature reaches {hottest_day.temperature_2m_max:.1f}°C. "
                        f"Target crop stage: {current_stage}."
                    ),
                    action=(
                        f"For {crop.value} during {current_stage}, monitor field root-zone moisture depth. "
                        f"Schedule micro-irrigation or furrow wetting before moisture stress causes flower/pod drop."
                    ),
                    scientific_rationale="ICAR-AICRPAM Guidelines: Sustained dry spells combined with high evaporative demand trigger root moisture stress.",
                )
            )

        # 2. Crop-Specific Waterlogging & Drainage Emergency Watch
        # Different crops have distinct root hypoxia thresholds (Cotton/Tomato are extremely sensitive)
        drainage_threshold = {
            CropTypeEnum.TOMATO: 25.0,
            CropTypeEnum.COTTON: 30.0,
            CropTypeEnum.SOYBEAN: 35.0,
            CropTypeEnum.MAIZE: 35.0,
            CropTypeEnum.WHEAT: 30.0,
            CropTypeEnum.PADDY: 65.0,  # Paddy tolerates standing water except during nursery/flowering submergence
        }.get(crop, 35.0)

        heavy_rain_days = [d for d in daily_points if d.precipitation_sum >= drainage_threshold]
        if heavy_rain_days:
            dates_list = ", ".join(d.date for d in heavy_rain_days)
            max_day_rain = max(d.precipitation_sum for d in heavy_rain_days)
            watches.append(
                FarmerWatchSignal(
                    category="Field Waterlogging & Drainage Watch",
                    severity="High" if (crop in (CropTypeEnum.COTTON, CropTypeEnum.TOMATO) or max_day_rain >= 50.0) else "Moderate",
                    crop=crop.value,
                    date=heavy_rain_days[0].date,
                    observation=f"Heavy rainfall predicted on ({dates_list}) reaching up to {max_day_rain:.1f} mm in 24 hours against {crop.value} tolerance of {drainage_threshold:.0f} mm.",
                    action=f"Clear farm field bund drainage outlets to prevent standing water in {crop.value} fields during {current_stage}. Postpone top-dressing of nitrogen fertilizers or foliar chemical sprays.",
                    scientific_rationale="Standing water causes root hypoxia in upland crops and accelerates fungal collar rot; leaches soluble nitrogenous fertilizers.",
                )
            )

        # 3. Crop-Specific Thermal Stress & Canopy Comfort Watch
        # Wheat: Terminal heat > 30°C; Cotton: Square drop > 38°C; Paddy: Spikelet sterility > 35°C; Tomato: Blossom drop > 35°C
        heat_threshold = {
            CropTypeEnum.WHEAT: 30.0,
            CropTypeEnum.PADDY: 35.0,
            CropTypeEnum.TOMATO: 35.0,
            CropTypeEnum.MAIZE: 36.0,
            CropTypeEnum.SOYBEAN: 36.0,
            CropTypeEnum.COTTON: 38.5,
        }.get(crop, 38.0)

        if hottest_day.temperature_2m_max >= heat_threshold:
            watches.append(
                FarmerWatchSignal(
                    category="Crop Canopy Thermal Stress Watch",
                    severity="High" if hottest_day.temperature_2m_max >= (heat_threshold + 3.0) else "Moderate",
                    crop=crop.value,
                    date=hottest_day.date,
                    observation=f"Peak ambient temperature of {hottest_day.temperature_2m_max:.1f}°C forecasted on {hottest_day.date}, exceeding {crop.value} physiological comfort threshold ({heat_threshold:.1f}°C).",
                    action=f"Provide light evening or early morning irrigation to maintain microclimate humidity. Inspect for moisture stress or flower/fruit drop in {crop.value} ({current_stage}).",
                    scientific_rationale=f"ICAR-AICRPAM & FAO Agronomy: Ambient temperatures exceeding {heat_threshold:.1f}°C impair pollen viability and accelerate vapor pressure deficit (VPD).",
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
        provider="SkyGuard Agrometeorological Advisory Framework (ICAR-AICRPAM / FAO Guidelines)",
        attribution_url="https://icar.org.in / https://www.fao.org/land-water/agronomy",
        disclaimer="Agronomic watches are heuristic forecast-derived operational suggestions based on published ICAR-AICRPAM guidelines. Applicability is restricted to tropical and subtropical field conditions. Always cross-reference with your local agricultural university or district Krishi Vigyan Kendra (KVK).",
    )

    return FarmerWatchResponse(
        crop=crop.value,
        days_since_sowing=days_since_sowing,
        watches=watches,
        hardware_gating=gating,
        applicability_notice=(
            "Agronomic heuristics are derived from ICAR-AICRPAM guidelines calibrated for tropical and subtropical agroclimatic regions. "
            "Soil moisture holding capacity, drainage slopes, and cultivar heat tolerances vary. Forecast-derived rules provide operational "
            "awareness but do not replace on-field soil testing or local agricultural extension advisories."
        ),
        provenance=provenance,
    )
