"""GDACS (Global Disaster Alert and Coordination System) Adapter.

Fetches and safely parses live multi-hazard disaster events (cyclones, floods, earthquakes, droughts).
Source: United Nations OCHA and European Commission Joint Research Centre (https://www.gdacs.org).
"""
import time
from typing import List, Optional, Tuple
import httpx

from services.api.app.adapters.geo_utils import haversine_distance_km
from services.api.app.adapters.source_registry import (
    normalize_to_iso2,
    strictly_matches_country,
)
from services.api.app.schemas.global_alerts import (
    AlertCategoryEnum,
    AlertSeverityLevel,
    GlobalAlertItem,
    ProviderHealth,
    ProviderHealthStatus,
)

GDACS_GEOJSON_URL = "https://www.gdacs.org/gdacsapi/api/events/geteventlist/SEARCH?format=geojson"
GDACS_RSS_URL = "https://www.gdacs.org/xml/rss.xml"

EVENT_TYPE_MAP = {
    "TC": "Tropical Cyclone",
    "FL": "Flood",
    "EQ": "Earthquake",
    "DR": "Drought",
    "VO": "Volcano",
    "WF": "Wildfire",
}


def map_gdacs_severity(alert_level: Optional[str]) -> AlertSeverityLevel:
    if not alert_level:
        return AlertSeverityLevel.UNKNOWN
    lvl = alert_level.strip().capitalize()
    if lvl == "Red":
        return AlertSeverityLevel.EXTREME
    if lvl == "Orange":
        return AlertSeverityLevel.SEVERE
    if lvl == "Green":
        return AlertSeverityLevel.MODERATE
    return AlertSeverityLevel.UNKNOWN


class GDACSAdapter:
    def __init__(self, timeout: float = 12.0):
        self.url = GDACS_GEOJSON_URL
        self.timeout = httpx.Timeout(timeout, connect=5.0)

    async def fetch_alerts(
        self,
        country_code: Optional[str] = None,
        query_lat: Optional[float] = None,
        query_lon: Optional[float] = None,
        radius_km: Optional[float] = None,
    ) -> Tuple[List[GlobalAlertItem], ProviderHealth, int]:
        """Fetch GDACS disaster events with strict verified country and coordinate filtering.
        
        Returns:
            (filtered_alerts, health, total_unfiltered_count)
        """
        start_time = time.time()
        headers = {"User-Agent": "SkyGuard-Weather-Intelligence/2.0 (Open Disaster Alert Integration)"}

        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                resp = await client.get(self.url, headers=headers)
                resp.raise_for_status()
                data = resp.json()
        except Exception as exc:
            latency = (time.time() - start_time) * 1000.0
            health = ProviderHealth(
                provider_name="GDACS",
                status=ProviderHealthStatus.UNAVAILABLE,
                total_alerts_fetched=0,
                retrieved_at=time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
                latency_ms=round(latency, 1),
                error_message=f"Failed to query GDACS API: {str(exc)}",
                attribution="UN OCHA & European Commission (https://www.gdacs.org)",
            )
            return [], health, 0

        latency = (time.time() - start_time) * 1000.0
        features = data.get("features", []) if isinstance(data, dict) else []
        total_unfiltered = len(features)

        normalized: List[GlobalAlertItem] = []

        for f in features:
            props = f.get("properties", {})
            geom = f.get("geometry", {})
            coords = geom.get("coordinates") if isinstance(geom, dict) else None

            # GeoJSON coordinates are [longitude, latitude]
            lon = float(coords[0]) if coords and len(coords) >= 2 else None
            lat = float(coords[1]) if coords and len(coords) >= 2 else None

            event_type_raw = str(props.get("eventtype", "DISASTER")).upper()
            event_name = EVENT_TYPE_MAP.get(event_type_raw, event_type_raw)
            event_id = str(props.get("eventid", ""))
            episode_id = str(props.get("episodeid", "1"))
            alert_id = f"GDACS-{event_type_raw}-{event_id}-{episode_id}"

            name = props.get("name") or props.get("eventname") or f"{event_name} Event"
            desc = props.get("description") or props.get("htmldescription") or name
            alert_level = props.get("alertlevel")
            severity = map_gdacs_severity(alert_level)

            country_str = props.get("country") or ""
            iso3 = str(props.get("iso3", "")).upper()
            affected = props.get("affectedcountries")
            area_desc = country_str
            if affected and isinstance(affected, list) and len(affected) > 0:
                area_desc = ", ".join([str(a.get("countryname", "")) for a in affected if isinstance(a, dict)])

            # URLs
            url_dict = props.get("url") if isinstance(props.get("url"), dict) else {}
            report_url = url_dict.get("report") or f"https://www.gdacs.org/report.aspx?eventtype={event_type_raw}&eventid={event_id}"

            # Calculate distance if query coordinates supplied
            dist_km: Optional[float] = None
            if query_lat is not None and query_lon is not None and lat is not None and lon is not None:
                dist_km = haversine_distance_km(query_lat, query_lon, lat, lon)

            # Strict verified country matching (NEVER substring)
            matches_country = True
            if country_code:
                matches_country = strictly_matches_country(
                    target_country=country_code,
                    alert_country_iso2=normalize_to_iso2(iso3) or normalize_to_iso2(country_str),
                    alert_iso3=iso3,
                    alert_country_name=country_str,
                    affected_countries=affected,
                )

            matches_spatial = True
            if radius_km is not None and dist_km is not None:
                matches_spatial = dist_km <= radius_km

            if matches_country and matches_spatial:
                item = GlobalAlertItem(
                    id=alert_id,
                    source_provider="GDACS",
                    alert_type=AlertCategoryEnum.GDACS_DISASTER_ALERT,
                    event=event_name,
                    headline=name,
                    severity=severity,
                    severity_original=f"GDACS {alert_level} Alert" if alert_level else None,
                    urgency="Expected",
                    certainty="Observed" if event_type_raw in ["EQ", "FL"] else "Likely",
                    local_color_code=f"{alert_level} Alert" if alert_level else None,
                    language="en",
                    msg_type="Alert",
                    issuer="United Nations OCHA & European Commission (GDACS)",
                    country_code=normalize_to_iso2(iso3) or normalize_to_iso2(country_str),
                    affected_area=area_desc or country_str or "International Region",
                    latitude=lat,
                    longitude=lon,
                    effective_time=props.get("fromdate") or None,
                    expires_time=props.get("todate") or None,
                    description=desc,
                    source_url=report_url,
                    distance_km=round(dist_km, 1) if dist_km is not None else None,
                )
                normalized.append(item)

        health = ProviderHealth(
            provider_name="GDACS",
            status=ProviderHealthStatus.CONNECTED,
            total_alerts_fetched=total_unfiltered,
            retrieved_at=time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            latency_ms=round(latency, 1),
            attribution="UN OCHA & European Commission (https://www.gdacs.org)",
        )

        return normalized, health, total_unfiltered


gdacs_adapter = GDACSAdapter()
