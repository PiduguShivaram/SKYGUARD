"""Open-Meteo async client for geocoding and forecast queries."""
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Tuple
import httpx
from fastapi import HTTPException

from services.api.app.config import settings
from services.api.app.schemas.common import Provenance
from services.api.app.schemas.geo import LocationSearchResult
from services.api.app.schemas.weather import (
    CurrentWeather,
    DailyForecastPoint,
    HourlyForecastPoint,
    WeatherForecastResponse,
)


WMO_WEATHER_MAP: Dict[int, Tuple[str, str]] = {
    0: ("Clear sky", "clear"),
    1: ("Mainly clear", "mostly-clear"),
    2: ("Partly cloudy", "partly-cloudy"),
    3: ("Overcast", "overcast"),
    45: ("Foggy", "fog"),
    48: ("Depositing rime fog", "fog"),
    51: ("Light drizzle", "drizzle"),
    53: ("Moderate drizzle", "drizzle"),
    55: ("Dense drizzle", "drizzle"),
    56: ("Light freezing drizzle", "freezing-rain"),
    57: ("Dense freezing drizzle", "freezing-rain"),
    61: ("Slight rain", "rain"),
    63: ("Moderate rain", "rain"),
    65: ("Heavy rain", "heavy-rain"),
    66: ("Light freezing rain", "freezing-rain"),
    67: ("Heavy freezing rain", "freezing-rain"),
    71: ("Slight snow fall", "snow"),
    73: ("Moderate snow fall", "snow"),
    75: ("Heavy snow fall", "heavy-snow"),
    77: ("Snow grains", "snow"),
    80: ("Slight rain showers", "rain-showers"),
    81: ("Moderate rain showers", "rain-showers"),
    82: ("Violent rain showers", "heavy-rain"),
    85: ("Slight snow showers", "snow-showers"),
    86: ("Heavy snow showers", "snow-showers"),
    95: ("Thunderstorm", "thunderstorm"),
    96: ("Thunderstorm with slight hail", "thunderstorm-hail"),
    99: ("Thunderstorm with heavy hail", "thunderstorm-hail"),
}


def interpret_wmo_code(code: Optional[int]) -> Tuple[str, str]:
    if code is None:
        return ("Unknown conditions", "unknown")
    return WMO_WEATHER_MAP.get(code, ("Variable conditions", "variable"))


class OpenMeteoClient:
    def __init__(self):
        self.geocoding_url = settings.OPEN_METEO_GEOCODING_URL
        self.forecast_url = settings.OPEN_METEO_BASE_URL
        self.timeout = httpx.Timeout(10.0, connect=5.0)

    async def search_locations(
        self, query: str, count: int = 5, country_code: Optional[str] = None
    ) -> List[LocationSearchResult]:
        term = query.strip()
        if len(term) < 2:
            return []

        params: Dict[str, Any] = {
            "name": term,
            "count": count,
            "language": "en",
            "format": "json",
        }
        if country_code and country_code.strip():
            params["country_code"] = country_code.strip()

        async with httpx.AsyncClient(timeout=self.timeout) as client:
            try:
                response = await client.get(f"{self.geocoding_url}/search", params=params)
                response.raise_for_status()
                data = response.json()
            except httpx.TimeoutException:
                raise HTTPException(
                    status_code=504,
                    detail="Open-Meteo geocoding service timed out. Please try again.",
                )
            except httpx.HTTPStatusError as exc:
                raise HTTPException(
                    status_code=502,
                    detail=f"Open-Meteo geocoding error: {exc.response.status_code}",
                )
            except Exception as exc:
                raise HTTPException(
                    status_code=502,
                    detail=f"Failed to reach geocoding provider: {str(exc)}",
                )

        raw_results = data.get("results", [])
        results: List[LocationSearchResult] = []
        for item in raw_results:
            name = item.get("name", "")
            admin1 = item.get("admin1")
            country = item.get("country")
            parts = [name]
            if admin1:
                parts.append(admin1)
            if country:
                parts.append(country)
            formatted = ", ".join(parts)

            results.append(
                LocationSearchResult(
                    id=item.get("id", 0),
                    name=name,
                    latitude=float(item.get("latitude", 0.0)),
                    longitude=float(item.get("longitude", 0.0)),
                    elevation=item.get("elevation"),
                    feature_code=item.get("feature_code"),
                    country_code=item.get("country_code"),
                    country=country,
                    admin1=admin1,
                    admin2=item.get("admin2"),
                    admin3=item.get("admin3"),
                    timezone=item.get("timezone"),
                    formatted_label=formatted,
                )
            )
        return results

    async def get_forecast(self, latitude: float, longitude: float) -> WeatherForecastResponse:
        params = {
            "latitude": latitude,
            "longitude": longitude,
            "current": "temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,weather_code,wind_speed_10m,wind_direction_10m",
            "hourly": "temperature_2m,precipitation_probability,precipitation,weather_code,wind_speed_10m",
            "daily": "weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max,wind_gusts_10m_max,uv_index_max,sunrise,sunset",
            "timezone": "auto",
            "forecast_days": 7,
        }

        async with httpx.AsyncClient(timeout=self.timeout) as client:
            try:
                response = await client.get(f"{self.forecast_url}/forecast", params=params)
                response.raise_for_status()
                data = response.json()
            except httpx.TimeoutException:
                raise HTTPException(
                    status_code=504,
                    detail="Open-Meteo forecast service timed out. Check connection.",
                )
            except httpx.HTTPStatusError as exc:
                raise HTTPException(
                    status_code=502,
                    detail=f"Open-Meteo forecast API error: {exc.response.status_code}",
                )
            except Exception as exc:
                raise HTTPException(
                    status_code=502,
                    detail=f"Failed to query Open-Meteo forecast provider: {str(exc)}",
                )

        current_data = data.get("current", {})
        hourly_data = data.get("hourly", {})
        daily_data = data.get("daily", {})
        current_units = data.get("current_units", {})
        daily_units = data.get("daily_units", {})

        if not current_data or not daily_data:
            raise HTTPException(
                status_code=502,
                detail="Provider returned incomplete forecast structure.",
            )

        # Parse current
        w_code = current_data.get("weather_code", 0)
        desc, icon = interpret_wmo_code(w_code)
        current = CurrentWeather(
            time=current_data.get("time", datetime.now(timezone.utc).isoformat()),
            temperature_2m=float(current_data.get("temperature_2m", 0.0)),
            relative_humidity_2m=float(current_data.get("relative_humidity_2m", 0.0)),
            apparent_temperature=float(current_data.get("apparent_temperature", 0.0)),
            is_day=int(current_data.get("is_day", 1)),
            precipitation=float(current_data.get("precipitation", 0.0)),
            weather_code=w_code,
            weather_description=desc,
            weather_icon=icon,
            wind_speed_10m=float(current_data.get("wind_speed_10m", 0.0)),
            wind_direction_10m=current_data.get("wind_direction_10m"),
        )

        # Parse hourly (slice next 48 hours)
        h_times = hourly_data.get("time", [])[:48]
        h_temps = hourly_data.get("temperature_2m", [])
        h_probs = hourly_data.get("precipitation_probability", [])
        h_precips = hourly_data.get("precipitation", [])
        h_codes = hourly_data.get("weather_code", [])
        h_winds = hourly_data.get("wind_speed_10m", [])

        hourly_points: List[HourlyForecastPoint] = []
        for i, t in enumerate(h_times):
            code = h_codes[i] if i < len(h_codes) else 0
            h_desc, _ = interpret_wmo_code(code)
            hourly_points.append(
                HourlyForecastPoint(
                    time=t,
                    temperature_2m=float(h_temps[i]) if i < len(h_temps) else 0.0,
                    precipitation_probability=(
                        float(h_probs[i]) if i < len(h_probs) and h_probs[i] is not None else None
                    ),
                    precipitation=float(h_precips[i]) if i < len(h_precips) else 0.0,
                    weather_code=code,
                    weather_description=h_desc,
                    wind_speed_10m=float(h_winds[i]) if i < len(h_winds) else 0.0,
                )
            )

        # Parse daily (7 days)
        d_times = daily_data.get("time", [])
        d_codes = daily_data.get("weather_code", [])
        d_t_max = daily_data.get("temperature_2m_max", [])
        d_t_min = daily_data.get("temperature_2m_min", [])
        d_p_sum = daily_data.get("precipitation_sum", [])
        d_p_prob = daily_data.get("precipitation_probability_max", [])
        d_w_gust = daily_data.get("wind_gusts_10m_max", [])
        d_uv = daily_data.get("uv_index_max", [])
        d_sunr = daily_data.get("sunrise", [])
        d_suns = daily_data.get("sunset", [])

        daily_points: List[DailyForecastPoint] = []
        for i, d in enumerate(d_times):
            code = d_codes[i] if i < len(d_codes) else 0
            d_desc, d_icon = interpret_wmo_code(code)
            daily_points.append(
                DailyForecastPoint(
                    date=d,
                    weather_code=code,
                    weather_description=d_desc,
                    weather_icon=d_icon,
                    temperature_2m_max=float(d_t_max[i]) if i < len(d_t_max) else 0.0,
                    temperature_2m_min=float(d_t_min[i]) if i < len(d_t_min) else 0.0,
                    precipitation_sum=float(d_p_sum[i]) if i < len(d_p_sum) else 0.0,
                    precipitation_probability_max=(
                        float(d_p_prob[i]) if i < len(d_p_prob) and d_p_prob[i] is not None else None
                    ),
                    wind_gusts_10m_max=float(d_w_gust[i]) if i < len(d_w_gust) else 0.0,
                    uv_index_max=float(d_uv[i]) if i < len(d_uv) and d_uv[i] is not None else None,
                    sunrise=d_sunr[i] if i < len(d_sunr) else None,
                    sunset=d_suns[i] if i < len(d_suns) else None,
                )
            )

        # Assemble units dictionary directly from upstream Open-Meteo units
        units_map: Dict[str, str] = {
            "temperature": current_units.get("temperature_2m", "°C"),
            "relative_humidity": current_units.get("relative_humidity_2m", "%"),
            "apparent_temperature": current_units.get("apparent_temperature", "°C"),
            "precipitation": current_units.get("precipitation", "mm"),
            "wind_speed": current_units.get("wind_speed_10m", "km/h"),
            "wind_gusts": daily_units.get("wind_gusts_10m_max", "km/h"),
        }

        provenance = Provenance(
            provider="Open-Meteo",
            source_model="Seamless Multi-Model NWP (ECMWF IFS / GFS / ICON)",
            attribution_url="https://open-meteo.com/en/docs",
            disclaimer="Open-Meteo provides numerical weather prediction model forecasts. It is NOT an official national emergency warning agency. Official storm and disaster warnings are issued exclusively by national meteorological authorities (e.g. IMD, NDMA).",
        )

        return WeatherForecastResponse(
            requested_latitude=latitude,
            requested_longitude=longitude,
            latitude=float(data.get("latitude", latitude)),
            longitude=float(data.get("longitude", longitude)),
            elevation=data.get("elevation"),
            timezone=data.get("timezone", "UTC"),
            timezone_abbreviation=data.get("timezone_abbreviation"),
            utc_offset_seconds=data.get("utc_offset_seconds"),
            units=units_map,
            current=current,
            hourly=hourly_points,
            daily=daily_points,
            provenance=provenance,
        )


open_meteo_client = OpenMeteoClient()
