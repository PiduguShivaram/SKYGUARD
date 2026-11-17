"""Script to perform and verify real live Open-Meteo integration."""
import sys
import httpx


def check_live_open_meteo():
    print("=== SkyGuard Live Open-Meteo Verification ===")
    timeout = httpx.Timeout(10.0, connect=5.0)

    # 1. Test Geocoding
    geo_url = "https://geocoding-api.open-meteo.com/v1/search"
    geo_params = {"name": "Warangal", "count": 5, "country_code": "IN", "language": "en", "format": "json"}
    print(f"Calling live Geocoding API: {geo_url}...")
    try:
        with httpx.Client(timeout=timeout) as client:
            geo_resp = client.get(geo_url, params=geo_params)
            geo_resp.raise_for_status()
            geo_data = geo_resp.json()
    except Exception as exc:
        print(f"BLOCKED: Failed to reach Open-Meteo Geocoding API: {exc}", file=sys.stderr)
        sys.exit(1)

    results = geo_data.get("results", [])
    if not results:
        print("BLOCKED: No geocoding results returned from Open-Meteo.", file=sys.stderr)
        sys.exit(1)

    chosen = results[0]
    lat = float(chosen["latitude"])
    lon = float(chosen["longitude"])
    print(f"-> Geocoding success: {chosen.get('name')}, {chosen.get('admin1')}, {chosen.get('country')}")
    print(f"-> Location coordinates: Latitude={lat}, Longitude={lon}")

    # 2. Test Forecast
    forecast_url = "https://api.open-meteo.com/v1/forecast"
    forecast_params = {
        "latitude": lat,
        "longitude": lon,
        "current": "temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,weather_code,wind_speed_10m",
        "daily": "weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max,wind_gusts_10m_max",
        "timezone": "auto",
        "forecast_days": 7,
    }
    print(f"\nCalling live Forecast API: {forecast_url}...")
    try:
        with httpx.Client(timeout=timeout) as client:
            f_resp = client.get(forecast_url, params=forecast_params)
            f_resp.raise_for_status()
            f_data = f_resp.json()
    except Exception as exc:
        print(f"BLOCKED: Failed to reach Open-Meteo Forecast API: {exc}", file=sys.stderr)
        sys.exit(1)

    # Extract required fields
    provider_lat = f_data.get("latitude")
    provider_lon = f_data.get("longitude")
    timezone = f_data.get("timezone")
    utc_offset = f_data.get("utc_offset_seconds")
    current = f_data.get("current", {})
    daily = f_data.get("daily", {})
    daily_units = f_data.get("daily_units", {})
    current_units = f_data.get("current_units", {})

    print("\n--- Genuine Provider Output ---")
    print(f"Provider Grid Coordinates: {provider_lat}°N, {provider_lon}°E")
    print(f"Timezone: {timezone} (UTC Offset: {utc_offset}s)")
    print(f"Current Observation Time: {current.get('time')}")
    print(f"Current Temperature: {current.get('temperature_2m')} {current_units.get('temperature_2m', '°C')}")
    print(f"Relative Humidity: {current.get('relative_humidity_2m')} {current_units.get('relative_humidity_2m', '%')}")
    print(f"Apparent Temperature: {current.get('apparent_temperature')} {current_units.get('apparent_temperature', '°C')}")
    print(f"Wind Speed: {current.get('wind_speed_10m')} {current_units.get('wind_speed_10m', 'km/h')}")
    print(f"Precipitation: {current.get('precipitation')} {current_units.get('precipitation', 'mm')}")

    daily_dates = daily.get("time", [])
    print(f"\nSeven Daily Forecast Dates ({len(daily_dates)} days):")
    for idx, d in enumerate(daily_dates):
        t_max = daily.get("temperature_2m_max", [])[idx]
        t_min = daily.get("temperature_2m_min", [])[idx]
        p_sum = daily.get("precipitation_sum", [])[idx]
        print(f"  Day {idx+1} [{d}]: Min {t_min}°C, Max {t_max}°C, Precip {p_sum} mm")

    assert len(daily_dates) == 7, f"Expected 7 daily dates, got {len(daily_dates)}"
    assert provider_lat is not None and provider_lon is not None, "Provider coordinates missing"
    assert timezone is not None, "Timezone missing"
    print("\n=== Live Open-Meteo Verification PASSED with Authentic Data ===")


if __name__ == "__main__":
    check_live_open_meteo()
