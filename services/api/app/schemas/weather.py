"""Weather forecast schemas for current, hourly, and daily series."""
from typing import Dict, List, Optional
from pydantic import BaseModel, Field
from services.api.app.schemas.common import Provenance


class CurrentWeather(BaseModel):
    time: str = Field(..., description="Observation / forecast timestamp (provider valid time)")
    temperature_2m: float = Field(..., description="Current temperature at 2m in Celsius")
    relative_humidity_2m: float = Field(..., description="Relative humidity percentage")
    apparent_temperature: float = Field(..., description="Apparent / 'feels like' temperature in Celsius")
    is_day: int = Field(..., description="1 if daylight, 0 if nighttime")
    precipitation: float = Field(..., description="Current precipitation rate in mm")
    weather_code: int = Field(..., description="WMO weather code (0-99)")
    weather_description: str = Field(..., description="Human readable weather description")
    weather_icon: str = Field(..., description="Visual icon identifier")
    wind_speed_10m: float = Field(..., description="Wind speed at 10m in km/h")
    wind_direction_10m: Optional[float] = Field(None, description="Wind direction in degrees")
    cloud_cover: Optional[float] = Field(None, description="Cloud cover percentage (0-100%)")


class HourlyForecastPoint(BaseModel):
    time: str = Field(..., description="Hourly timestamp (ISO format)")
    temperature_2m: float = Field(..., description="Air temperature in Celsius")
    precipitation_probability: Optional[float] = Field(None, description="Probability of precipitation (0-100%)")
    precipitation: float = Field(..., description="Precipitation amount in mm")
    weather_code: int = Field(..., description="WMO code")
    weather_description: str = Field(...)
    wind_speed_10m: float = Field(..., description="Wind speed in km/h")
    cloud_cover: Optional[float] = Field(None, description="Cloud cover percentage (0-100%)")
    is_day: Optional[int] = Field(None, description="1 if daylight, 0 if nighttime")


class DailyForecastPoint(BaseModel):
    date: str = Field(..., description="Forecast date (YYYY-MM-DD)")
    weather_code: int = Field(..., description="WMO code")
    weather_description: str = Field(...)
    weather_icon: str = Field(...)
    temperature_2m_max: float = Field(..., description="Daily maximum temperature in Celsius")
    temperature_2m_min: float = Field(..., description="Daily minimum temperature in Celsius")
    precipitation_sum: float = Field(..., description="Total 24h precipitation in mm")
    precipitation_probability_max: Optional[float] = Field(None, description="Maximum precipitation probability %")
    wind_gusts_10m_max: float = Field(..., description="Peak wind gusts at 10m in km/h")
    uv_index_max: Optional[float] = Field(None, description="Maximum UV index")
    sunrise: Optional[str] = Field(None, description="Sunrise time")
    sunset: Optional[str] = Field(None, description="Sunset time")


class WeatherForecastResponse(BaseModel):
    requested_latitude: float = Field(..., description="Coordinates requested by client")
    requested_longitude: float = Field(..., description="Coordinates requested by client")
    latitude: float = Field(..., description="Actual Open-Meteo grid latitude returned")
    longitude: float = Field(..., description="Actual Open-Meteo grid longitude returned")
    elevation: Optional[float] = None
    timezone: str
    timezone_abbreviation: Optional[str] = None
    utc_offset_seconds: Optional[int] = None
    units: Dict[str, str] = Field(default_factory=dict, description="Units reported by Open-Meteo")
    current: CurrentWeather
    hourly: List[HourlyForecastPoint]
    daily: List[DailyForecastPoint]
    provenance: Provenance
