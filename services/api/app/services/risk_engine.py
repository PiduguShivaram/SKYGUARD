"""Deterministic scientific risk assessment engine.

Calculates derived weather risk indicators based strictly on transparent,
peer-reviewed, and agency-grounded meteorological criteria (IMD, WMO, NDMA).
Never outputs hallucinated probability metrics or claims to be an official warning.
"""
from typing import List
from services.api.app.schemas.common import Provenance
from services.api.app.schemas.risk import (
    RiskEvaluationResponse,
    RiskSeverityEnum,
    RiskSignal,
)
from services.api.app.schemas.weather import DailyForecastPoint


def evaluate_forecast_risks(daily_points: List[DailyForecastPoint]) -> RiskEvaluationResponse:
    signals: List[RiskSignal] = []

    for day in daily_points:
        rain = day.precipitation_sum
        prob = day.precipitation_probability_max or 0.0
        t_max = day.temperature_2m_max
        gust = day.wind_gusts_10m_max
        date_str = day.date

        # 1. Extreme Rain / Flooding Risk
        if rain >= 50.0 or (rain >= 35.0 and prob >= 80.0):
            signals.append(
                RiskSignal(
                    category="Heavy Rainfall Indicator",
                    severity=RiskSeverityEnum.HIGH,
                    date=date_str,
                    threshold_basis="IMD Heavy Rainfall Classification (Daily rain >= 35mm with >= 80% confidence or >= 50mm).",
                    evidence=f"Forecast precipitation: {rain:.1f} mm; peak probability: {prob:.0f}%.",
                    recommended_action="Monitor official IMD district nowcasts; avoid waterlogged underpasses, and prepare for localized runoff.",
                )
            )
        elif rain >= 20.0:
            signals.append(
                RiskSignal(
                    category="Moderate Rainfall Indicator",
                    severity=RiskSeverityEnum.MODERATE,
                    date=date_str,
                    threshold_basis="IMD Moderate Rainfall Classification (20mm - 35mm in 24 hours).",
                    evidence=f"Forecast precipitation: {rain:.1f} mm; peak probability: {prob:.0f}%.",
                    recommended_action="Plan outdoor transit around rain bands; carry waterproof gear and verify local road conditions.",
                )
            )

        # 2. Extreme Heat / Heatwave Risk
        if t_max >= 43.0:
            signals.append(
                RiskSignal(
                    category="Extreme Heatwave Indicator",
                    severity=RiskSeverityEnum.HIGH,
                    date=date_str,
                    threshold_basis="IMD Severe Heatwave Criteria (Max temp >= 43°C in plains).",
                    evidence=f"Forecast maximum temperature: {t_max:.1f}°C.",
                    recommended_action="Avoid direct sun exposure between 11:00 and 15:30; maintain oral rehydration and heed NDMA heatwave advisories.",
                )
            )
        elif t_max >= 38.0:
            signals.append(
                RiskSignal(
                    category="Elevated Heat Indicator",
                    severity=RiskSeverityEnum.MODERATE,
                    date=date_str,
                    threshold_basis="WMO & NDMA Elevated Thermal Stress Threshold (Max temp >= 38°C).",
                    evidence=f"Forecast maximum temperature: {t_max:.1f}°C.",
                    recommended_action="Ensure adequate ventilation, hydrate frequently, and reschedule strenuous outdoor tasks to early morning.",
                )
            )

        # 3. High Wind Gusts / Squall Risk
        if gust >= 70.0:
            signals.append(
                RiskSignal(
                    category="High Wind Squall Indicator",
                    severity=RiskSeverityEnum.HIGH,
                    date=date_str,
                    threshold_basis="IMD Gale / Severe Squall Threshold (Peak gusts >= 70 km/h).",
                    evidence=f"Forecast peak wind gust: {gust:.1f} km/h.",
                    recommended_action="Secure loose outdoor roofing, outdoor hoardings, and temporary structures; avoid standing under trees or power lines.",
                )
            )
        elif gust >= 50.0:
            signals.append(
                RiskSignal(
                    category="Brisk Wind Indicator",
                    severity=RiskSeverityEnum.MODERATE,
                    date=date_str,
                    threshold_basis="IMD Squall Warning Classification (Gusts >= 50 km/h).",
                    evidence=f"Forecast peak wind gust: {gust:.1f} km/h.",
                    recommended_action="Exercise caution during two-wheeler travel and near exposed bridges or elevated terrain.",
                )
            )

    severity_weight = {RiskSeverityEnum.HIGH: 0, RiskSeverityEnum.MODERATE: 1, RiskSeverityEnum.LOW: 2}
    signals.sort(key=lambda s: (severity_weight.get(s.severity, 3), s.date, s.category))

    provenance = Provenance(
        provider="SkyGuard Deterministic Risk Engine",
        attribution_url="https://ndma.gov.in / https://mausam.imd.gov.in",
        disclaimer="Derived experimental risk indicators are deterministic calculations based on forecast models. They are NOT official IMD warnings or legal advisories.",
    )

    return RiskEvaluationResponse(
        evaluated_days=len(daily_points),
        signals=signals,
        provenance=provenance,
    )
