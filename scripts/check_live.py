"""Script to perform and verify real live Open-Meteo, GDACS, WMO SWIC, and Alert-Hub integration."""
import sys
import httpx


def check_live_services():
    print("=== SkyGuard Phase 2 Worldwide Alerts & Weather Verification ===")
    timeout = httpx.Timeout(12.0, connect=5.0)

    # 1. Test Open-Meteo Geocoding
    geo_url = "https://geocoding-api.open-meteo.com/v1/search"
    geo_params = {"name": "Warangal", "count": 5, "country_code": "IN", "language": "en", "format": "json"}
    print(f"\n[1/4] Calling Open-Meteo Geocoding: {geo_url}...")
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

    # 2. Test Open-Meteo Forecast
    forecast_url = "https://api.open-meteo.com/v1/forecast"
    forecast_params = {
        "latitude": lat,
        "longitude": lon,
        "current": "temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,weather_code,wind_speed_10m",
        "daily": "weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max,wind_gusts_10m_max",
        "timezone": "auto",
        "forecast_days": 7,
    }
    print(f"\n[2/4] Calling Open-Meteo Forecast: {forecast_url}...")
    try:
        with httpx.Client(timeout=timeout) as client:
            f_resp = client.get(forecast_url, params=forecast_params)
            f_resp.raise_for_status()
            f_data = f_resp.json()
    except Exception as exc:
        print(f"BLOCKED: Failed to reach Open-Meteo Forecast API: {exc}", file=sys.stderr)
        sys.exit(1)

    print(f"-> Provider Coordinates: {f_data.get('latitude')}°N, {f_data.get('longitude')}°E")
    print(f"-> Timezone: {f_data.get('timezone')} (Offset: {f_data.get('utc_offset_seconds')}s)")
    print(f"-> Current Temp: {f_data.get('current', {}).get('temperature_2m')} °C")
    daily_dates = f_data.get("daily", {}).get("time", [])
    print(f"-> Seven Daily Forecast Dates: {daily_dates}")

    # 3. Test GDACS Live Feed
    gdacs_url = "https://www.gdacs.org/gdacsapi/api/events/geteventlist/SEARCH?format=geojson"
    print(f"\n[3/4] Calling GDACS GeoJSON API: {gdacs_url}...")
    try:
        with httpx.Client(timeout=timeout) as client:
            g_resp = client.get(gdacs_url, headers={"User-Agent": "SkyGuard/2.0"})
            g_resp.raise_for_status()
            g_data = g_resp.json()
    except Exception as exc:
        print(f"BLOCKED: Failed to reach GDACS API: {exc}", file=sys.stderr)
        sys.exit(1)

    features = g_data.get("features", [])
    print(f"-> GDACS Active Disaster Events Fetched: {len(features)}")
    if features:
        sample_event = features[0].get("properties", {})
        print(f"-> Sample Disaster: {sample_event.get('name')} | Severity: {sample_event.get('alertlevel')} | Country: {sample_event.get('country')}")

    # 4. Test WMO SWIC Live Feed
    wmo_url = "https://severeweather.wmo.int/json/wmo_all.json"
    print(f"\n[4/4] Calling WMO SWIC Master Feed: {wmo_url}...")
    try:
        with httpx.Client(timeout=timeout) as client:
            w_resp = client.get(wmo_url, headers={"User-Agent": "SkyGuard/2.0"})
            w_resp.raise_for_status()
            w_data = w_resp.json()
    except Exception as exc:
        print(f"BLOCKED: Failed to reach WMO SWIC feed: {exc}", file=sys.stderr)
        sys.exit(1)

    wmo_items = w_data.get("items", [])
    print(f"-> WMO Official CAP Warnings Fetched: {len(wmo_items)}")
    if wmo_items:
        s_wmo = wmo_items[0]
        print(f"-> Sample Official Warning: {s_wmo.get('headline', '')[:80]} | Area: {s_wmo.get('areaDesc', '')[:40]}")

    print("\n=== ALL LIVE UPSTREAM FEEDS (Open-Meteo, GDACS, WMO SWIC) VERIFIED AND OPERATIONAL ===")


if __name__ == "__main__":
    check_live_services()
