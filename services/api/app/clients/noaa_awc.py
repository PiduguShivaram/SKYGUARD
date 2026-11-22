"""NOAA Aviation Weather Center (AWC) METAR observation client.

Queries genuine, quality-controlled real-time station observations across global WMO reporting stations.
"""
import logging
import math
from typing import List, Optional
import httpx
from services.api.app.schemas.observations import StationObservation

logger = logging.getLogger(__name__)

AWC_METAR_URL = "https://aviationweather.gov/api/data/metar"
DEFAULT_USER_AGENT = "SkyGuard-WeatherPlatform/1.0 (observational grounding; contact: info@skyguard.internal)"


def haversine_distance_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculates great-circle distance between two coordinates in kilometers."""
    r = 6371.0
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)

    a = math.sin(dphi / 2.0) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2.0) ** 2
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
    return r * c


def calculate_relative_humidity(temp_c: Optional[float], dewpoint_c: Optional[float]) -> Optional[float]:
    """Calculates relative humidity percentage using Magnus-Tetens approximation."""
    if temp_c is None or dewpoint_c is None:
        return None
    try:
        a = 17.27
        b = 237.7
        alpha = ((a * temp_c) / (b + temp_c)) + math.log(1.0)
        alpha_dew = (a * dewpoint_c) / (b + dewpoint_c)
        rh = 100.0 * math.exp(alpha_dew - alpha)
        return round(min(max(rh, 0.0), 100.0), 1)
    except Exception:
        return None


async def fetch_observations_in_bbox(
    min_lat: float,
    min_lon: float,
    max_lat: float,
    max_lon: float,
    http_client: Optional[httpx.AsyncClient] = None,
) -> List[StationObservation]:
    """Retrieves all official station observations within the bounding box."""
    bbox_str = f"{min_lat:.3f},{min_lon:.3f},{max_lat:.3f},{max_lon:.3f}"
    params = {
        "format": "json",
        "bbox": bbox_str,
    }
    headers = {"User-Agent": DEFAULT_USER_AGENT}

    should_close = False
    if http_client is None:
        http_client = httpx.AsyncClient(timeout=8.0)
        should_close = True

    try:
        resp = await http_client.get(AWC_METAR_URL, params=params, headers=headers)
        if resp.status_code != 200:
            logger.warning("NOAA AWC observation fetch returned status %s for bbox %s", resp.status_code, bbox_str)
            return []

        data = resp.json()
        if not isinstance(data, list):
            return []

        observations: List[StationObservation] = []
        for item in data:
            try:
                station_id = item.get("icaoId")
                lat = item.get("lat")
                lon = item.get("lon")
                report_time = item.get("reportTime")
                raw_metar = item.get("rawOb")

                if not (station_id and lat is not None and lon is not None and report_time and raw_metar):
                    continue

                temp_val = item.get("temp")
                dewp_val = item.get("dewp")
                wspd_kts = item.get("wspd")
                wspd_kmh = round(float(wspd_kts) * 1.852, 1) if wspd_kts is not None else None
                wdir_val = float(item["wdir"]) if item.get("wdir") is not None else None
                visib_sm = item.get("visib")
                visib_km = round(float(visib_sm) * 1.60934, 1) if visib_sm is not None else None
                altim_hpa = float(item["altim"]) if item.get("altim") is not None else None

                obs = StationObservation(
                    station_id=station_id,
                    station_name=item.get("name") or station_id,
                    latitude=float(lat),
                    longitude=float(lon),
                    elevation_m=float(item["elev"]) if item.get("elev") is not None else None,
                    observation_time=str(report_time),
                    temperature_c=float(temp_val) if temp_val is not None else None,
                    dewpoint_c=float(dewp_val) if dewp_val is not None else None,
                    relative_humidity=calculate_relative_humidity(temp_val, dewp_val),
                    wind_speed_kmh=wspd_kmh,
                    wind_direction_deg=wdir_val,
                    visibility_km=visib_km,
                    pressure_hpa=altim_hpa,
                    weather_condition=item.get("wxString"),
                    flight_category=item.get("fltCat"),
                    qc_passed=bool(item.get("qcField", 0) != -1),
                    raw_metar=str(raw_metar),
                    source_network="NOAA Aviation Weather Center / WMO",
                )
                observations.append(obs)
            except Exception as parse_err:
                logger.debug("Failed parsing METAR entry: %s", parse_err)
                continue

        return observations

    except Exception as exc:
        logger.warning("Error communicating with NOAA AWC: %s", exc)
        return []
    finally:
        if should_close:
            await http_client.aclose()
