"""Geospatial Parser & Point-in-Polygon Verification Engine.

Parses official Common Alerting Protocol (CAP 1.2) polygons, circles, and geocodes.
Executes rigorous point-in-polygon and boundary verification using Shapely.
Prevents unverified warnings from triggering unauthorized location-targeted notifications.
"""
import math
import re
from typing import Any, Dict, List, Optional, Tuple

from shapely.geometry import Point, Polygon, MultiPolygon
from shapely.validation import make_valid

from services.api.app.adapters.geo_utils import haversine_distance_km
from services.api.app.adapters.source_registry import strictly_matches_country


COUNTRY_WIDE_KEYWORDS = [
    "nationwide",
    "countrywide",
    "national",
    "all districts",
    "all states",
    "all provinces",
    "all territories",
    "entire country",
    "national bulletin",
    "across the country",
]


def parse_cap_polygon(poly_str: str) -> Optional[Polygon]:
    """Parse CAP 1.2 <polygon> element into a valid Shapely Polygon.
    
    CAP 1.2 Specification:
    Coordinates are space-delimited pairs of comma-separated latitude and longitude:
    "lat1,lon1 lat2,lon2 lat3,lon3 ... latN,lonN"
    
    Shapely expects (x, y) = (longitude, latitude).
    """
    if not poly_str or not isinstance(poly_str, str):
        return None

    tokens = poly_str.strip().split()
    if len(tokens) < 3:
        return None

    coords: List[Tuple[float, float]] = []
    for tok in tokens:
        if "," not in tok:
            continue
        parts = tok.split(",")
        try:
            lat = float(parts[0].strip())
            lon = float(parts[1].strip())
            # Boundary checks
            if -90.0 <= lat <= 90.0 and -180.0 <= lon <= 180.0:
                coords.append((lon, lat))  # (x, y) = (lon, lat)
        except (ValueError, IndexError):
            continue

    if len(coords) < 3:
        return None

    # Ensure ring is closed
    if coords[0] != coords[-1]:
        coords.append(coords[0])

    if len(coords) < 4:
        return None

    try:
        poly = Polygon(coords)
        if not poly.is_valid:
            poly = make_valid(poly)
            # If make_valid returned a GeometryCollection or MultiPolygon, find first Polygon
            if isinstance(poly, MultiPolygon):
                return poly
            if hasattr(poly, "geoms"):
                for g in poly.geoms:
                    if isinstance(g, (Polygon, MultiPolygon)):
                        return g
        return poly
    except Exception:
        return None


def parse_cap_circle(circle_str: str) -> Optional[Tuple[float, float, float]]:
    """Parse CAP 1.2 <circle> element: 'latitude,longitude radius_km'.
    
    Returns:
        (latitude, longitude, radius_km)
    """
    if not circle_str or not isinstance(circle_str, str):
        return None

    parts = circle_str.strip().split()
    if len(parts) < 2:
        return None

    coord_part = parts[0]
    radius_part = parts[1]

    if "," not in coord_part:
        return None

    try:
        c_parts = coord_part.split(",")
        lat = float(c_parts[0].strip())
        lon = float(c_parts[1].strip())
        radius_km = float(radius_part.strip())
        if -90.0 <= lat <= 90.0 and -180.0 <= lon <= 180.0 and radius_km >= 0:
            return lat, lon, radius_km
    except (ValueError, IndexError):
        pass

    return None


def is_explicitly_country_wide(area_desc: str, headline: str = "") -> bool:
    """Determine whether the alert explicitly establishes country-wide coverage."""
    combined = (area_desc + " " + headline).lower()
    return any(re.search(rf"\b{re.escape(k)}\b", combined) for k in COUNTRY_WIDE_KEYWORDS)


def is_point_in_alert_polygon(
    lat: float,
    lon: float,
    polygon_or_multipolygon: Any,
    epsilon_deg: float = 0.005,
) -> bool:
    """Verify if (lat, lon) is strictly within or on the boundary of the alert polygon.
    
    Uses Shapely contains/touches with a tiny epsilon buffer for precision edge cases.
    """
    if polygon_or_multipolygon is None:
        return False

    pt = Point(lon, lat)  # (x, y) = (lon, lat)

    try:
        if polygon_or_multipolygon.contains(pt) or polygon_or_multipolygon.touches(pt):
            return True
        # Check boundary with buffer
        if polygon_or_multipolygon.distance(pt) <= epsilon_deg:
            return True
    except Exception:
        pass

    return False


def evaluate_alert_spatial_match(
    sub_country: Optional[str],
    sub_lat: Optional[float],
    sub_lon: Optional[float],
    sub_radius_km: float,
    wants_country_wide: bool,
    alert_country_code: Optional[str],
    alert_area_desc: str,
    alert_headline: str,
    alert_lat: Optional[float],
    alert_lon: Optional[float],
    alert_polygons_str: Optional[List[str]] = None,
    alert_circle_str: Optional[str] = None,
    alert_is_country_wide: bool = False,
    alert_geographic_status: str = "LOCATION_VERIFIED",
) -> Tuple[bool, str, Optional[float]]:
    """Strict multi-tier geographic verification according to SkyGuard safety contract.
    
    Rules:
    1. Separate country-wide alerts from regional and local alerts.
    2. Point-in-polygon verification against official alert polygons.
    3. Country-level matching applies ONLY when the source explicitly establishes
       country-wide coverage OR the user deliberately opted in to country-wide bulletins.
    4. Centroid coordinates are NOT assumed to cover the entire territory.
    5. If coverage is LOCATION_UNVERIFIED, prevent automatic location-targeted delivery.
    
    Returns:
        (is_match: bool, reason: str, distance_km: Optional[float])
    """
    # 0. Country isolation check
    if sub_country and alert_country_code:
        if not strictly_matches_country(sub_country, alert_country_code):
            return False, "COUNTRY_MISMATCH", None

    is_countrywide_alert = alert_is_country_wide or is_explicitly_country_wide(alert_area_desc, alert_headline)

    # 1. Subscriber opted in to Country-Wide Bulletins
    if wants_country_wide:
        if sub_country and alert_country_code and strictly_matches_country(sub_country, alert_country_code):
            return True, "COUNTRY_WIDE_OPT_IN", None

    # 2. Alert explicitly has country-wide coverage
    if is_countrywide_alert and sub_country and alert_country_code:
        if strictly_matches_country(sub_country, alert_country_code):
            return True, "OFFICIAL_COUNTRY_WIDE_COVERAGE", None

    # 3. If subscriber provided specific coordinates: evaluate localized coverage
    if sub_lat is not None and sub_lon is not None:
        # A. Official Polygon matching (highest authority)
        if alert_polygons_str:
            for p_str in alert_polygons_str:
                poly = parse_cap_polygon(p_str)
                if poly and is_point_in_alert_polygon(sub_lat, sub_lon, poly):
                    return True, "POINT_IN_POLYGON_VERIFIED", 0.0

            # If alert provides official polygons, subscriber MUST be inside at least one
            return False, "OUTSIDE_OFFICIAL_POLYGON", None

        # B. Official Circle matching
        if alert_circle_str:
            circle = parse_cap_circle(alert_circle_str)
            if circle:
                c_lat, c_lon, c_rad = circle
                dist = haversine_distance_km(sub_lat, sub_lon, c_lat, c_lon)
                if dist <= c_rad:
                    return True, "INSIDE_OFFICIAL_CIRCLE", dist
                return False, "OUTSIDE_OFFICIAL_CIRCLE", dist

        # C. Centroid proximity check (e.g. GDACS point event)
        # Note: Event centroid is NOT full impact area, but proximity within search radius is checked
        if alert_lat is not None and alert_lon is not None:
            dist = haversine_distance_km(sub_lat, sub_lon, alert_lat, alert_lon)
            if dist <= sub_radius_km:
                return True, "CENTROID_RADIUS_MATCH", dist
            return False, "OUTSIDE_SEARCH_RADIUS", dist

    # 4. If geographic coverage cannot be verified
    if alert_geographic_status == "LOCATION_UNVERIFIED":
        return False, "LOCATION_UNVERIFIED_SUPPRESSED", None

    # 5. User has only country code and alert is regional/local
    if sub_country and not wants_country_wide and (sub_lat is None or sub_lon is None):
        return False, "REGIONAL_ALERT_REQUIRES_COORDINATES_OR_COUNTRY_WIDE_OPT_IN", None

    return False, "NO_GEOGRAPHIC_MATCH", None
