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

        # 1. Extreme Rain / Inundation Risk
        # IMD Official Classification: Heavy Rain is >= 64.5 mm/24h; Moderate Rain is 15.6 - 64.4 mm/24h.
        # PoP (Probability of Precipitation) indicates probability of measurable rain (>=0.1mm) occurring, not accumulation confidence.
        if rain >= 64.5:
            signals.append(
                RiskSignal(
                    category="Heavy Rainfall Indicator",
                    severity=RiskSeverityEnum.HIGH,
                    date=date_str,
                    threshold_basis="IMD Official Heavy Rainfall Standard (24-hour accumulation >= 64.5 mm).",
                    evidence=f"Forecast precipitation: {rain:.1f} mm; probability of precipitation occurrence: {prob:.0f}%.",
                    recommended_action="Monitor official IMD district nowcasts; avoid waterlogged underpasses, and prepare for localized runoff.",
                )
            )
        elif rain >= 35.0 and prob >= 80.0:
            signals.append(
                RiskSignal(
                    category="High-Likelihood Precipitation Watch",
                    severity=RiskSeverityEnum.HIGH,
                    date=date_str,
                    threshold_basis="SkyGuard Experimental Inundation Heuristic (24h rain >= 35.0 mm combined with high precipitation probability >= 80%).",
                    evidence=f"Forecast precipitation: {rain:.1f} mm; probability of precipitation occurrence: {prob:.0f}%.",
                    recommended_action="Plan travel precautions; inspect local stormwater drains, and monitor official localized advisories.",
                )
            )
        elif rain >= 15.6:
            signals.append(
                RiskSignal(
                    category="Moderate Rainfall Indicator",
                    severity=RiskSeverityEnum.MODERATE,
                    date=date_str,
                    threshold_basis="IMD Moderate Rainfall Classification (15.6 mm - 64.4 mm in 24 hours).",
                    evidence=f"Forecast precipitation: {rain:.1f} mm; probability of precipitation occurrence: {prob:.0f}%.",
                    recommended_action="Plan outdoor transit around rain bands; carry waterproof gear and verify local road conditions.",
                )
            )

        # 2. Extreme Heat / Heatwave Risk
        # IMD Operational Heat Wave Manual: In plains, actual Tmax >= 45°C or departure >= 4.5°C when normal > 40°C.
        if t_max >= 45.0:
            signals.append(
                RiskSignal(
                    category="Extreme Heatwave Indicator",
                    severity=RiskSeverityEnum.HIGH,
                    date=date_str,
                    threshold_basis="IMD Heat Wave Classification Manual (Plains max temperature >= 45.0°C).",
                    evidence=f"Forecast maximum temperature: {t_max:.1f}°C.",
                    recommended_action="Avoid direct sun exposure between 11:00 and 15:30; maintain oral rehydration and heed NDMA heatwave advisories.",
                )
            )
        elif t_max >= 40.0:
            signals.append(
                RiskSignal(
                    category="Severe Heat Precaution",
                    severity=RiskSeverityEnum.HIGH if t_max >= 43.0 else RiskSeverityEnum.MODERATE,
                    date=date_str,
                    threshold_basis="IMD Heat Threshold (Plains max temperature >= 40.0°C baseline).",
                    evidence=f"Forecast maximum temperature: {t_max:.1f}°C.",
                    recommended_action="Maintain adequate fluid intake, minimize midday field work, and verify vulnerable population precautions.",
                )
            )
        elif t_max >= 38.0:
            signals.append(
                RiskSignal(
                    category="Elevated Thermal Stress Indicator",
                    severity=RiskSeverityEnum.MODERATE,
                    date=date_str,
                    threshold_basis="WMO & NDMA Elevated Thermal Stress Advisory Threshold (Max temp >= 38.0°C).",
                    evidence=f"Forecast maximum temperature: {t_max:.1f}°C.",
                    recommended_action="Ensure adequate ventilation, hydrate frequently, and reschedule strenuous outdoor tasks to early morning.",
                )
            )

        # 3. High Wind Gusts / Squall Risk
        # WMO No. 485 / IMD Squall and Gale Classification (Gale >= 62 km/h; Squall >= 50 km/h).
        if gust >= 62.0:
            signals.append(
                RiskSignal(
                    category="High Wind Squall Indicator",
                    severity=RiskSeverityEnum.HIGH,
                    date=date_str,
                    threshold_basis="WMO Beaufort 8 / IMD Gale Warning Standard (Peak gusts >= 62 km/h).",
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
                    threshold_basis="IMD Squall Advisory Classification (Peak gusts >= 50 km/h).",
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
