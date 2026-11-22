"""Unit & integration test suite for the Hybrid Multi-Model Weather Prediction & Nowcasting Engine."""
from unittest.mock import AsyncMock, patch
import pytest
from fastapi.testclient import TestClient
from services.api.app.main import app
from services.api.app.clients.noaa_awc import (
    calculate_relative_humidity,
    haversine_distance_km,
)
from services.api.app.schemas.multi_model import ConsensusPoint, ModelForecastPoint
from services.api.app.services.consensus_engine import compute_consensus_series
from services.api.app.services.ml_correction import (
    apply_mos_forecast_correction,
    apply_topographic_lapse_rate,
)
from services.api.app.services.nowcast_engine import generate_radar_nowcast
from services.api.app.services.observation_service import get_nearest_station_observation

client = TestClient(app)


def test_consensus_engine_statistical_spread():
    """Verify consensus calculation: mean, median, standard deviation, and disagreement level."""
    times = ["2026-11-22T00:00:00Z"]
    # 4 models with temperatures: 20.0, 22.0, 21.0, 25.0
    models_series = {
        "ecmwf": [ModelForecastPoint(time=times[0], temperature_2m=20.0, precipitation=0.0, wind_speed_10m=10.0)],
        "gfs": [ModelForecastPoint(time=times[0], temperature_2m=22.0, precipitation=2.0, wind_speed_10m=12.0)],
        "icon": [ModelForecastPoint(time=times[0], temperature_2m=21.0, precipitation=1.0, wind_speed_10m=11.0)],
        "ukmo": [ModelForecastPoint(time=times[0], temperature_2m=25.0, precipitation=0.0, wind_speed_10m=15.0)],
    }

    consensus = compute_consensus_series(times, models_series)
    assert len(consensus) == 1
    pt = consensus[0]

    # Expected mean: (20 + 22 + 21 + 25) / 4 = 22.0
    assert pt.consensus_temperature_2m == 22.0
    # Expected median: sorted [20, 21, 22, 25] => (21 + 22) / 2 = 21.5
    assert pt.median_temperature_2m == 21.5
    # Expected precip mean: (0 + 2 + 1 + 0) / 4 = 0.75
    assert pt.consensus_precipitation == 0.75
    # Min & Max
    assert pt.temperature_spread_min == 20.0
    assert pt.temperature_spread_max == 25.0
    # Std dev: sample variance = ((20-22)^2 + (22-22)^2 + (21-22)^2 + (25-22)^2) / 3 = (4 + 0 + 1 + 9) / 3 = 14/3 = 4.67 => sqrt(4.67) = 2.16
    assert abs(pt.temperature_std_dev - 2.16) < 0.05
    assert pt.disagreement_level == "MODERATE"
    assert len(pt.models_reporting) == 4


def test_topographic_lapse_rate_physics():
    """Verify topographic elevation correction follows standard atmospheric lapse rate (-0.0065 C/m)."""
    # Grid elevation 200m, target elevation 1200m (1000m higher => -6.5 C)
    corrected = apply_topographic_lapse_rate(
        temperature_c=25.0,
        station_or_target_elevation_m=1200.0,
        model_grid_elevation_m=200.0,
    )
    assert corrected == 18.5  # 25.0 - 6.5 = 18.5

    # Target lower than grid (500m lower => +3.25 C)
    lower_corrected = apply_topographic_lapse_rate(
        temperature_c=20.0,
        station_or_target_elevation_m=100.0,
        model_grid_elevation_m=600.0,
    )
    assert lower_corrected == 23.25  # 20.0 + 3.25 = 23.25


def test_mos_forecast_correction():
    """Verify Model Output Statistics (MOS) applies elevation adjustment and quantile prediction intervals."""
    consensus_pt = ConsensusPoint(
        time="2026-11-22T12:00:00Z",
        consensus_temperature_2m=24.0,
        median_temperature_2m=24.0,
        consensus_precipitation=0.0,
        consensus_wind_speed_10m=10.0,
        temperature_spread_min=22.0,
        temperature_spread_max=26.0,
        temperature_std_dev=1.5,
        precipitation_spread_max=0.0,
        models_reporting=["ecmwf", "gfs"],
        disagreement_level="MODERATE",
    )

    mos = apply_mos_forecast_correction(
        consensus_point=consensus_pt,
        target_elevation_m=500.0,
        grid_elevation_m=200.0,  # 300m higher => -1.95 C
        nearby_station_bias_c=1.0,  # model overpredicted by 1.0C => nudge down by 0.4C
        hour_utc=12,
    )

    assert "corrected_temperature_c" in mos
    assert mos["elevation_adjustment_c"] == -1.95
    assert mos["observational_nudge_c"] == -0.4
    assert mos["prediction_interval_p10"] < mos["corrected_temperature_c"]
    assert mos["prediction_interval_p90"] > mos["corrected_temperature_c"]
    assert mos["prediction_interval_p50"] == mos["corrected_temperature_c"]


def test_haversine_and_rh_calculation():
    """Verify haversine distance and relative humidity Magnus calculations."""
    # Distance between London (51.5074, -0.1278) and Paris (48.8566, 2.3522) ~ 343 km
    dist = haversine_distance_km(51.5074, -0.1278, 48.8566, 2.3522)
    assert 340.0 < dist < 350.0

    # Relative humidity: Temp 20C, Dewpoint 10C => ~52.5%
    rh = calculate_relative_humidity(20.0, 10.0)
    assert rh is not None
    assert 50.0 <= rh <= 55.0

    # None handling
    assert calculate_relative_humidity(None, 10.0) is None


@pytest.mark.asyncio
async def test_radar_nowcast_honest_degradation():
    """Verify radar nowcast engine honestly degrades when out of Doppler coverage."""
    with patch("services.api.app.services.nowcast_engine.fetch_radar_frames", new_callable=AsyncMock) as mock_fetch:
        mock_fetch.return_value = ("https://tilecache.rainviewer.com", [])

        nowcast = await generate_radar_nowcast(latitude=28.6139, longitude=77.2090, current_precip_rate_mmh=2.5)

        assert nowcast.radar_status == "DEGRADED_OUT_OF_RADAR_COVERAGE"
        assert len(nowcast.nowcast_intervals) == 7
        assert nowcast.nowcast_intervals[0].method == "NWP_DEGRADATION"
        assert nowcast.nowcast_intervals[0].estimated_precipitation_rate_mmh == 2.5
        # Kinematic decay
        assert nowcast.nowcast_intervals[-1].estimated_precipitation_rate_mmh < 2.5

        # Mid-Oceanic coordinate test (SG-05 coordinate-specific radar coverage gating)
        oceanic_nowcast = await generate_radar_nowcast(latitude=-30.0, longitude=-120.0, current_precip_rate_mmh=1.0)
        assert oceanic_nowcast.radar_status == "OUTSIDE_GROUND_RADAR_COVERAGE"
        assert "outside terrestrial Doppler radar" in oceanic_nowcast.coverage_note


def test_prediction_api_endpoints_integration():
    """Verify live API endpoints for multi-model, observation grounding, nowcast, and horizons."""
    # 1. Nowcast endpoint
    resp_nowcast = client.get("/api/v1/prediction/nowcast?latitude=28.6139&longitude=77.2090")
    assert resp_nowcast.status_code == 200
    nowcast_data = resp_nowcast.json()
    assert "radar_status" in nowcast_data
    assert "nowcast_intervals" in nowcast_data
    assert len(nowcast_data["nowcast_intervals"]) > 0

    # 2. Observation endpoint
    resp_obs = client.get("/api/v1/prediction/observation?latitude=28.6139&longitude=77.2090&model_temp=19.0")
    assert resp_obs.status_code == 200
    obs_data = resp_obs.json()
    assert "status" in obs_data
    assert obs_data["status"] in ("OBSERVATION_FOUND", "NO_STATION_WITHIN_RANGE")

    # 3. Satellite catalog endpoint
    resp_sat = client.get("/api/v1/prediction/satellite")
    assert resp_sat.status_code == 200
    sat_data = resp_sat.json()
    assert "active_products" in sat_data
    assert len(sat_data["active_products"]) >= 3
    insat = [p for p in sat_data["active_products"] if "INSAT" in p["satellite_name"]]
    assert len(insat) > 0
    # Differentiate CATALOG_METADATA_ONLINE from ACCESS_REQUIRED
    assert insat[0]["access_status"] == "CATALOG_METADATA_ONLINE"
    sentinel = [p for p in sat_data["active_products"] if "Sentinel" in p["satellite_name"]]
    assert len(sentinel) > 0
    assert sentinel[0]["access_status"] == "ACCESS_REQUIRED"


def test_ml_mos_trained_model_inference():
    """Verify that actual trained scikit-learn model artifact executes inference."""
    consensus_pt = ConsensusPoint(
        time="2026-11-22T12:00:00Z",
        consensus_temperature_2m=24.0,
        median_temperature_2m=24.0,
        consensus_precipitation=0.0,
        consensus_wind_speed_10m=12.0,
        temperature_spread_min=22.0,
        temperature_spread_max=26.0,
        temperature_std_dev=1.5,
        precipitation_spread_max=0.0,
        models_reporting=["ecmwf", "gfs"],
        disagreement_level="MODERATE",
    )

    mos = apply_mos_forecast_correction(
        consensus_point=consensus_pt,
        target_elevation_m=216.0,
        grid_elevation_m=200.0,
        hour_utc=12,
        day_of_year=260,
        force_eval=True,
    )

    assert mos["is_ml_model_applied"] is True
    assert mos["ml_model_type"] == "Ridge"
    assert mos["ml_mos_predicted_temp_c"] is not None
    assert isinstance(mos["ml_mos_predicted_temp_c"], float)
    assert mos["ml_holdout_mae_c"] is not None
    assert mos["experimental_model_spread_c"] == 1.5
    assert "dispersion" in mos["spread_interpretation"].lower()

    # Also verify that missing features triggers feature-incomplete suppression when force_eval=False
    mos_guarded = apply_mos_forecast_correction(
        consensus_point=consensus_pt,
        target_elevation_m=216.0,
        grid_elevation_m=200.0,
        force_eval=False,
    )
    assert mos_guarded["is_ml_model_applied"] is False
    assert mos_guarded["ml_guardrail_status"] == "GUARDRAIL_FEATURE_INCOMPLETE_NWP_RETAINED"

    # Verify that with complete features, runtime quality guardrail suppresses model due to holdout MAE
    mos_complete_features = apply_mos_forecast_correction(
        consensus_point=consensus_pt,
        target_elevation_m=216.0,
        grid_elevation_m=200.0,
        forecast_rh=55.0,
        forecast_pressure=1012.0,
        force_eval=False,
    )
    assert mos_complete_features["is_ml_model_applied"] is False
    assert mos_complete_features["ml_guardrail_status"] == "GUARDRAIL_ENFORCED_NWP_RETAINED"


def test_cap_circle_spatial_matching():
    """Verify CAP 1.2 circle parsing and point-in-circle geometry evaluation."""
    from services.api.app.services.geo_matcher import evaluate_alert_spatial_match

    # Alert circle centered at New Delhi (28.6139, 77.2090) with 50km radius
    circle_str = "28.6139,77.2090 50.0"

    # Subscriber A is ~2 km away (inside circle)
    match_a, reason_a, dist_a = evaluate_alert_spatial_match(
        sub_country="IN",
        sub_lat=28.6200,
        sub_lon=77.2150,
        sub_radius_km=50.0,
        wants_country_wide=False,
        alert_country_code="IN",
        alert_area_desc="National Capital Region",
        alert_headline="Severe Thunderstorm",
        alert_lat=None,
        alert_lon=None,
        alert_polygons_str=None,
        alert_circle_str=circle_str,
    )
    assert match_a is True
    assert reason_a == "INSIDE_OFFICIAL_CIRCLE"
    assert dist_a is not None and dist_a < 10.0

    # Subscriber B is in Agra ~180 km away (outside circle)
    match_b, reason_b, dist_b = evaluate_alert_spatial_match(
        sub_country="IN",
        sub_lat=27.1767,
        sub_lon=78.0081,
        sub_radius_km=50.0,
        wants_country_wide=False,
        alert_country_code="IN",
        alert_area_desc="National Capital Region",
        alert_headline="Severe Thunderstorm",
        alert_lat=None,
        alert_lon=None,
        alert_polygons_str=None,
        alert_circle_str=circle_str,
    )
    assert match_b is False
    assert reason_b == "OUTSIDE_OFFICIAL_CIRCLE"
    assert dist_b is not None and dist_b > 150.0


def test_consensus_engine_absent_variables_zero_fabrication():
    """Verify consensus calculation preserves None for missing variables without fabricating 0.0 (H02 / F01)."""
    times = ["2026-11-22T00:00:00Z"]
    # Model 1 has precipitation & wind; Model 2 omits both
    models_series = {
        "ecmwf": [ModelForecastPoint(time=times[0], temperature_2m=20.0, precipitation=2.0, wind_speed_10m=15.0)],
        "gfs": [ModelForecastPoint(time=times[0], temperature_2m=22.0, precipitation=None, wind_speed_10m=None)],
    }

    consensus = compute_consensus_series(times, models_series)
    assert len(consensus) == 1
    pt = consensus[0]

    # Precipitation mean should only be calculated across reporting models (2.0 / 1 = 2.0), NOT diluted by fabricated 0.0 (which would yield 1.0)
    assert pt.consensus_precipitation == 2.0
    assert pt.consensus_wind_speed_10m == 15.0
    assert pt.precipitation_spread_max == 2.0

    # If all models omit precipitation, consensus precipitation must be None, never fabricated 0.0
    models_series_no_precip = {
        "ecmwf": [ModelForecastPoint(time=times[0], temperature_2m=20.0, precipitation=None, wind_speed_10m=None)],
        "gfs": [ModelForecastPoint(time=times[0], temperature_2m=22.0, precipitation=None, wind_speed_10m=None)],
    }
    consensus_no_precip = compute_consensus_series(times, models_series_no_precip)
    assert consensus_no_precip[0].consensus_precipitation is None
    assert consensus_no_precip[0].consensus_wind_speed_10m is None
    assert consensus_no_precip[0].precipitation_spread_max is None


def test_consensus_engine_single_model_insufficient_disagreement():
    """Verify single reporting model sets disagreement_level to INSUFFICIENT_MODELS (H06 / F06)."""
    times = ["2026-11-22T00:00:00Z"]
    single_model_series = {
        "ecmwf": [ModelForecastPoint(time=times[0], temperature_2m=24.5, precipitation=0.5, wind_speed_10m=12.0)],
    }

    consensus = compute_consensus_series(times, single_model_series)
    assert len(consensus) == 1
    pt = consensus[0]

    assert pt.temperature_std_dev == 0.0
    assert pt.disagreement_level == "INSUFFICIENT_MODELS"
    assert "Single reporting model" in (pt.empirical_coverage_note or "")

