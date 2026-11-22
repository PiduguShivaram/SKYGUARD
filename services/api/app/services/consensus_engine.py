"""Consensus & uncertainty spread engine for multi-model numerical weather predictions."""
import math
from typing import Dict, List
from services.api.app.schemas.multi_model import ConsensusPoint, ModelForecastPoint


def compute_consensus_series(
    times: List[str],
    models_series: Dict[str, List[ModelForecastPoint]],
) -> List[ConsensusPoint]:
    """Computes transparent multi-model ensemble consensus and spread metrics across time steps.

    Invariants:
    1. Zero synthetic consensus: only models reporting authentic numerical values are considered.
    2. Spread is reported as model dispersion (EXPERIMENTAL_MODEL_SPREAD), not overconfident calibrated probability.
    """
    consensus_points: List[ConsensusPoint] = []

    # Map model series by time for fast lookups
    time_indexed: Dict[str, Dict[str, ModelForecastPoint]] = {t: {} for t in times}
    for model_id, points in models_series.items():
        for pt in points:
            if pt.time in time_indexed:
                time_indexed[pt.time][model_id] = pt

    for t in times:
        model_pts = time_indexed.get(t, {})
        if not model_pts:
            continue

        temps = [p.temperature_2m for p in model_pts.values() if p.temperature_2m is not None]
        precips = [p.precipitation for p in model_pts.values() if p.precipitation is not None]
        winds = [p.wind_speed_10m for p in model_pts.values() if p.wind_speed_10m is not None]
        models_reporting = list(model_pts.keys())

        n = len(temps)
        if n == 0:
            continue

        mean_temp = sum(temps) / n
        mean_precip = round(sum(precips) / len(precips), 2) if precips else None
        mean_wind = round(sum(winds) / len(winds), 2) if winds else None

        # Median temperature calculation
        sorted_temps = sorted(temps)
        if n % 2 == 1:
            median_temp = sorted_temps[n // 2]
        else:
            median_temp = (sorted_temps[n // 2 - 1] + sorted_temps[n // 2]) / 2.0

        # Sample standard deviation & disagreement categorization
        if n > 1:
            variance = sum((x - mean_temp) ** 2 for x in temps) / (n - 1)
            std_dev = math.sqrt(variance)
            if std_dev < 1.5:
                disagreement = "LOW"
            elif std_dev <= 3.0:
                disagreement = "MODERATE"
            else:
                disagreement = "HIGH"
        else:
            std_dev = 0.0
            disagreement = "INSUFFICIENT_MODELS"

        min_temp = min(temps)
        max_temp = max(temps)
        max_precip = round(max(precips), 2) if precips else None

        consensus_points.append(
            ConsensusPoint(
                time=t,
                consensus_temperature_2m=round(mean_temp, 2),
                median_temperature_2m=round(median_temp, 2),
                consensus_precipitation=mean_precip,
                consensus_wind_speed_10m=mean_wind,
                temperature_spread_min=round(min_temp, 2),
                temperature_spread_max=round(max_temp, 2),
                temperature_std_dev=round(std_dev, 2),
                precipitation_spread_max=max_precip,
                models_reporting=models_reporting,
                disagreement_level=disagreement,
                spread_classification="EXPERIMENTAL_MODEL_SPREAD",
                empirical_coverage_note=(
                    "Unweighted ensemble dispersion captures inter-model disagreement; does not represent calibrated Bayesian predictive probability."
                    if n > 1
                    else "Single reporting model; inter-model variance cannot be computed."
                ),
            )
        )

    return consensus_points
