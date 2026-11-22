"""Authentic Model Output Statistics (MOS) Data Collection and ML Model Training Pipeline.

Collects real historical NWP forecasts (Open-Meteo Historical Forecast API) and paired
ground-truth observations (Open-Meteo Archive API) across multiple global WMO stations.
Trains scikit-learn models (Ridge regression and RandomForest) to post-process raw NWP runs,
evaluates out-of-sample metrics against unseen chronological holdouts, and serializes artifacts.
"""
import json
import logging
import math
import os
import time
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Tuple

import httpx
import joblib
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestRegressor
from sklearn.linear_model import Ridge
from sklearn.metrics import mean_absolute_error, mean_squared_error

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("ML_MOS_Pipeline")

STATIONS = [
    {"name": "New Delhi", "lat": 28.6139, "lon": 77.2090, "elevation": 216.0},
    {"name": "London", "lat": 51.5074, "lon": -0.1278, "elevation": 25.0},
    {"name": "Tokyo", "lat": 35.6762, "lon": 139.6503, "elevation": 40.0},
    {"name": "New York", "lat": 40.7128, "lon": -74.0060, "elevation": 10.0},
    {"name": "Denver", "lat": 39.7392, "lon": -104.9903, "elevation": 1609.0},
]

START_DATE = "2024-09-01"
END_DATE = "2024-10-31"

FEATURE_COLUMNS = [
    "forecast_temp",
    "forecast_rh",
    "forecast_wind",
    "forecast_pressure",
    "solar_hour_sin",
    "solar_hour_cos",
    "day_of_year_sin",
    "day_of_year_cos",
    "elevation_m",
]


def fetch_station_paired_data(
    station: Dict[str, Any],
    start_date: str,
    end_date: str,
) -> pd.DataFrame:
    """Fetch real historical forecast and archive observation data for a single station."""
    client = httpx.Client(timeout=30.0)
    lat = station["lat"]
    lon = station["lon"]
    elev = station["elevation"]
    name = station["name"]

    logger.info(f"Fetching historical forecast for {name} ({lat}, {lon})...")
    forecast_url = "https://historical-forecast-api.open-meteo.com/v1/forecast"
    f_params = {
        "latitude": lat,
        "longitude": lon,
        "start_date": start_date,
        "end_date": end_date,
        "hourly": [
            "temperature_2m",
            "relative_humidity_2m",
            "wind_speed_10m",
            "surface_pressure",
        ],
    }
    f_resp = client.get(forecast_url, params=f_params)
    f_resp.raise_for_status()
    f_data = f_resp.json()["hourly"]

    time.sleep(0.5)

    logger.info(f"Fetching ground-truth archive for {name} ({lat}, {lon})...")
    archive_url = "https://archive-api.open-meteo.com/v1/archive"
    a_params = {
        "latitude": lat,
        "longitude": lon,
        "start_date": start_date,
        "end_date": end_date,
        "hourly": ["temperature_2m"],
    }
    a_resp = client.get(archive_url, params=a_params)
    a_resp.raise_for_status()
    a_data = a_resp.json()["hourly"]

    times = f_data["time"]
    records: List[Dict[str, Any]] = []

    for i, t_str in enumerate(times):
        f_temp = f_data["temperature_2m"][i]
        f_rh = f_data["relative_humidity_2m"][i]
        f_wind = f_data["wind_speed_10m"][i]
        f_pres = f_data["surface_pressure"][i]
        obs_temp = a_data["temperature_2m"][i] if i < len(a_data["temperature_2m"]) else None

        if None in (f_temp, f_rh, f_wind, f_pres, obs_temp):
            continue

        dt = datetime.fromisoformat(t_str)
        hour = dt.hour
        doy = dt.timetuple().tm_yday

        records.append({
            "station": name,
            "time": t_str,
            "datetime": dt,
            "forecast_temp": float(f_temp),
            "forecast_rh": float(f_rh),
            "forecast_wind": float(f_wind),
            "forecast_pressure": float(f_pres),
            "solar_hour_sin": math.sin(2.0 * math.pi * hour / 24.0),
            "solar_hour_cos": math.cos(2.0 * math.pi * hour / 24.0),
            "day_of_year_sin": math.sin(2.0 * math.pi * doy / 365.25),
            "day_of_year_cos": math.cos(2.0 * math.pi * doy / 365.25),
            "elevation_m": float(elev),
            "observed_temp": float(obs_temp),
        })

    df = pd.DataFrame(records)
    logger.info(f"Loaded {len(df)} paired samples for {name}")
    return df


def train_mos_models(df: pd.DataFrame) -> Tuple[Any, Dict[str, Any]]:
    """Chronological split and model training."""
    # Sort strictly chronologically across all stations
    df = df.sort_values(by="time").reset_index(drop=True)

    # 80/20 chronological split based on unique timestamps
    unique_times = sorted(df["time"].unique())
    split_idx = int(len(unique_times) * 0.8)
    split_time = unique_times[split_idx]

    train_df = df[df["time"] < split_time]
    test_df = df[df["time"] >= split_time]

    logger.info(
        f"Chronological Split: {len(train_df)} train samples ({train_df['time'].min()} to {train_df['time'].max()}), "
        f"{len(test_df)} holdout test samples ({test_df['time'].min()} to {test_df['time'].max()})"
    )

    X_train = train_df[FEATURE_COLUMNS]
    y_train = train_df["observed_temp"]

    X_test = test_df[FEATURE_COLUMNS]
    y_test = test_df["observed_temp"]
    raw_forecast_test = test_df["forecast_temp"]

    # 1. Baseline Raw Forecast metrics on holdout test set
    base_mae = float(mean_absolute_error(y_test, raw_forecast_test))
    base_rmse = float(math.sqrt(mean_squared_error(y_test, raw_forecast_test)))
    base_bias = float(np.mean(raw_forecast_test - y_test))

    logger.info(f"Baseline (Raw Forecast) -> MAE: {base_mae:.3f}C, RMSE: {base_rmse:.3f}C, Bias: {base_bias:.3f}C")

    # 2. Train Ridge Model
    ridge = Ridge(alpha=1.0)
    ridge.fit(X_train, y_train)
    ridge_preds = ridge.predict(X_test)
    ridge_mae = float(mean_absolute_error(y_test, ridge_preds))
    ridge_rmse = float(math.sqrt(mean_squared_error(y_test, ridge_preds)))
    ridge_bias = float(np.mean(ridge_preds - y_test))

    logger.info(f"Ridge MOS -> MAE: {ridge_mae:.3f}C, RMSE: {ridge_rmse:.3f}C, Bias: {ridge_bias:.3f}C")

    # 3. Train RandomForest Model (bounded depth to prevent overfitting)
    rf = RandomForestRegressor(n_estimators=60, max_depth=10, random_state=42, n_jobs=-1)
    rf.fit(X_train, y_train)
    rf_preds = rf.predict(X_test)
    rf_mae = float(mean_absolute_error(y_test, rf_preds))
    rf_rmse = float(math.sqrt(mean_squared_error(y_test, rf_preds)))
    rf_bias = float(np.mean(rf_preds - y_test))

    logger.info(f"RandomForest MOS -> MAE: {rf_mae:.3f}C, RMSE: {rf_rmse:.3f}C, Bias: {rf_bias:.3f}C")

    # Select best model based on holdout MAE
    if rf_mae < ridge_mae:
        best_model = rf
        best_name = "RandomForestRegressor"
        best_mae = rf_mae
        best_rmse = rf_rmse
        best_bias = rf_bias
    else:
        best_model = ridge
        best_name = "Ridge"
        best_mae = ridge_mae
        best_rmse = ridge_rmse
        best_bias = ridge_bias

    logger.info(f"Selected Best MOS Model: {best_name} with Holdout MAE: {best_mae:.3f}C")

    # Station-specific holdout performance
    station_metrics = {}
    for st_name in df["station"].unique():
        st_test = test_df[test_df["station"] == st_name]
        if len(st_test) > 0:
            st_y = st_test["observed_temp"]
            st_raw = st_test["forecast_temp"]
            st_pred = best_model.predict(st_test[FEATURE_COLUMNS])

            st_base_mae = float(mean_absolute_error(st_y, st_raw))
            st_mos_mae = float(mean_absolute_error(st_y, st_pred))
            st_base_bias = float(np.mean(st_raw - st_y))
            st_mos_bias = float(np.mean(st_pred - st_y))

            station_metrics[st_name] = {
                "test_samples": len(st_test),
                "baseline_mae_c": round(st_base_mae, 3),
                "mos_mae_c": round(st_mos_mae, 3),
                "mae_reduction_pct": round((st_base_mae - st_mos_mae) / max(0.01, st_base_mae) * 100, 1),
                "baseline_bias_c": round(st_base_bias, 3),
                "mos_bias_c": round(st_mos_bias, 3),
            }

    metrics_payload = {
        "model_type": best_name,
        "feature_names": FEATURE_COLUMNS,
        "training_metadata": {
            "stations": [s["name"] for s in STATIONS],
            "start_date": START_DATE,
            "end_date": END_DATE,
            "total_samples": len(df),
            "train_samples": len(train_df),
            "holdout_test_samples": len(test_df),
            "split_time": split_time,
            "trained_at_utc": datetime.utcnow().isoformat(),
        },
        "overall_evaluation": {
            "baseline_raw_forecast": {
                "mae_c": round(base_mae, 3),
                "rmse_c": round(base_rmse, 3),
                "mean_bias_c": round(base_bias, 3),
            },
            "ml_mos_corrected": {
                "mae_c": round(best_mae, 3),
                "rmse_c": round(best_rmse, 3),
                "mean_bias_c": round(best_bias, 3),
            },
            "error_reduction": {
                "mae_improvement_c": round(base_mae - best_mae, 3),
                "mae_reduction_pct": round((base_mae - best_mae) / max(0.01, base_mae) * 100, 1),
                "bias_reduction_c": round(abs(base_bias) - abs(best_bias), 3),
            },
        },
        "station_breakdown": station_metrics,
    }

    return best_model, metrics_payload


def main():
    dfs = []
    for st in STATIONS:
        try:
            df = fetch_station_paired_data(st, START_DATE, END_DATE)
            dfs.append(df)
        except Exception as exc:
            logger.error(f"Failed to fetch data for {st['name']}: {exc}")

    if not dfs:
        raise RuntimeError("No historical paired data could be collected.")

    full_df = pd.concat(dfs, ignore_index=True)
    logger.info(f"Total dataset size: {len(full_df)} paired hourly records.")

    # Save training dataset to disk for reproducibility
    data_dir = Path(__file__).resolve().parent / "data"
    data_dir.mkdir(parents=True, exist_ok=True)
    csv_path = data_dir / "historical_paired_forecast_obs_2024.csv"
    full_df.to_csv(csv_path, index=False)
    logger.info(f"Saved paired dataset to {csv_path}")

    # Train and evaluate models
    model, metrics = train_mos_models(full_df)

    models_dir = Path(__file__).resolve().parent / "models"
    models_dir.mkdir(parents=True, exist_ok=True)

    # Save model artifact
    model_path = models_dir / "mos_temperature_model.joblib"
    joblib.dump(model, model_path)
    logger.info(f"Saved trained MOS model artifact to {model_path}")

    # Save metrics JSON
    metrics_path = models_dir / "model_metrics.json"
    with open(metrics_path, "w", encoding="utf-8") as f:
        json.dump(metrics, f, indent=2)
    logger.info(f"Saved evaluation metrics to {metrics_path}")


if __name__ == "__main__":
    main()
