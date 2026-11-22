"""WMO (World Meteorological Organization) Severe Weather Information Centre (SWIC) CAP Adapter.

Fetches official severe weather warnings issued by National Meteorological and Hydrological Services (NMHSs) globally.
Source: World Meteorological Organization (https://severeweather.wmo.int).
"""
from datetime import datetime, timezone
import time
from typing import Dict, List, Optional, Tuple
import httpx

from services.api.app.adapters.source_registry import (
    extract_local_color_code,
    get_authentic_agency_name,
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
from services.api.app.services.geo_matcher import is_explicitly_country_wide

WMO_SWIC_ALL_JSON_URL = "https://severeweather.wmo.int/json/wmo_all.json"
WMO_CAP_BASE_URL = "https://severeweather.wmo.int/v2/cap-alerts"


def map_wmo_severity(s_code: Optional[int]) -> AlertSeverityLevel:
    """Map WMO SWIC priority integer to standard CAP severity.
    
    Verified against raw CAP 1.2 XML:
    s=4 -> Extreme
    s=3 -> Severe
    s=2 -> Moderate
    s=1 -> Minor
    """
    if s_code == 4:
        return AlertSeverityLevel.EXTREME
    if s_code == 3:
        return AlertSeverityLevel.SEVERE
    if s_code == 2:
        return AlertSeverityLevel.MODERATE
    if s_code == 1:
        return AlertSeverityLevel.MINOR
    return AlertSeverityLevel.UNKNOWN


def map_wmo_urgency(u_code: Optional[int]) -> str:
    """Map WMO SWIC urgency integer to CAP urgency."""
    mapping = {
        4: "Immediate",
        3: "Expected",
        2: "Future",
        1: "Past",
        0: "Unknown",
    }
    return mapping.get(u_code, "Unknown")


def map_wmo_certainty(c_code: Optional[int]) -> str:
    """Map WMO SWIC certainty integer to CAP certainty."""
    mapping = {
        4: "Observed",
        3: "Likely",
        2: "Possible",
        1: "Unlikely",
        0: "Unknown",
    }
    return mapping.get(c_code, "Unknown")


def is_past_timestamp(time_str: Optional[str]) -> bool:
    """Check if timestamp string has passed."""
    if not time_str:
        return False
    try:
        clean = time_str.replace(" ", "T")
        if not clean.endswith("Z") and "+" not in clean:
            clean += "Z"
        exp_dt = datetime.fromisoformat(clean)
        return exp_dt < datetime.now(timezone.utc)
    except Exception:
        return False


class WMOCAPAdapter:
    def __init__(self, timeout: float = 12.0):
        self.url = WMO_SWIC_ALL_JSON_URL
        self.timeout = httpx.Timeout(timeout, connect=5.0)

    async def fetch_alerts(
        self,
        country_code: Optional[str] = None,
    ) -> Tuple[List[GlobalAlertItem], ProviderHealth, int]:
        """Fetch and parse WMO SWIC warnings.
        
        Returns:
            (filtered_alerts, health, total_unfiltered_count)
        """
        start_time = time.time()
        headers = {"User-Agent": "SkyGuard-Weather-Intelligence/2.0 (WMO Severe Weather CAP Integration)"}

        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                resp = await client.get(self.url, headers=headers)
                resp.raise_for_status()
                data = resp.json()
        except Exception as exc:
            latency = (time.time() - start_time) * 1000.0
            health = ProviderHealth(
                provider_name="WMO SWIC",
                status=ProviderHealthStatus.UNAVAILABLE,
                total_alerts_fetched=0,
                retrieved_at=time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
                latency_ms=round(latency, 1),
                error_message=f"Failed to query WMO SWIC feed: {str(exc)}",
                attribution="World Meteorological Organization (https://severeweather.wmo.int)",
            )
            return [], health, 0

        latency = (time.time() - start_time) * 1000.0
        items = data.get("items", []) if isinstance(data, dict) else []
        total_unfiltered = len(items)

        # Temporary dict to deduplicate multiple language entries for the same alert ID
        # Prefer 'en' if present
        alerts_by_id: Dict[str, GlobalAlertItem] = {}

        for it in items:
            # 1. Check expiration
            expires_time = it.get("expires", "")
            if expires_time and is_past_timestamp(expires_time):
                continue

            # 2. Extract feed URL (either capURL or url)
            cap_rel_url = it.get("capURL") or it.get("url") or ""

            # Extract country prefix and language
            feed_prefix = ""
            lang = "en"
            item_country = ""
            if "-" in cap_rel_url:
                parts = cap_rel_url.split("-")
                feed_prefix = f"{parts[0]}-{parts[1]}" if len(parts) > 1 else parts[0]
                item_country = normalize_to_iso2(parts[0]) or parts[0].upper()
                # Language code is often the 3rd part or last part before slash
                sub_parts = parts[-1].split("/")[0] if len(parts) > 2 else "en"
                if len(sub_parts) == 2 or len(sub_parts) == 3:
                    lang = sub_parts

            # 3. Verified Geographic Country Filtering
            if country_code:
                if not strictly_matches_country(
                    target_country=country_code,
                    alert_country_iso2=item_country,
                ):
                    continue

            # 4. Message Type, Status, Scope, References and Cancellation
            headline = str(it.get("headline", "")).strip() or str(it.get("event", "Official Weather Warning"))
            event_name = str(it.get("event", "")).strip() or "Severe Weather Alert"
            msg_type = str(it.get("msgType") or "Alert").strip().capitalize()
            if any(k in headline.lower() or k in event_name.lower() for k in ["cancel", "cancellation", "expired"]):
                msg_type = "Cancel"

            status_val = str(it.get("status") or "Actual").strip().capitalize()
            scope_val = str(it.get("scope") or "Public").strip().capitalize()
            references_val = str(it.get("references") or "").strip() or None

            # 5. Severity, Urgency, Certainty
            s_code = it.get("s")
            severity = map_wmo_severity(s_code)
            urgency = map_wmo_urgency(it.get("u"))
            certainty = map_wmo_certainty(it.get("c"))

            # 6. Local Color Code preservation
            local_color = extract_local_color_code(headline)

            # 7. Issuer & URLs
            issuer = get_authentic_agency_name(feed_prefix or cap_rel_url, item_country)
            area_desc = str(it.get("areaDesc", "")).strip() or (item_country or "Territory")
            sent_time = it.get("sent", "")
            full_cap_url = f"{WMO_CAP_BASE_URL}/{cap_rel_url}" if cap_rel_url else "https://severeweather.wmo.int"
            raw_id = str(it.get("id") or cap_rel_url)
            alert_id = f"WMO-{raw_id}"

            # Polygons and Coordinates
            polygons: List[str] = []
            raw_poly = it.get("polygon") or it.get("polygons")
            if raw_poly:
                if isinstance(raw_poly, list):
                    polygons.extend([str(p).strip() for p in raw_poly if str(p).strip()])
                elif isinstance(raw_poly, str) and raw_poly.strip():
                    polygons.append(raw_poly.strip())

            # Circles extraction (CAP 1.2 lat,lon radius_km)
            circles: List[str] = []
            raw_circle = it.get("circle") or it.get("circles")
            if raw_circle:
                if isinstance(raw_circle, list):
                    circles.extend([str(c).strip() for c in raw_circle if str(c).strip()])
                elif isinstance(raw_circle, str) and raw_circle.strip():
                    circles.append(raw_circle.strip())

            item_lat = float(it["lat"]) if "lat" in it and it["lat"] is not None else None
            item_lon = float(it["lon"]) if "lon" in it and it["lon"] is not None else None

            is_countrywide = is_explicitly_country_wide(area_desc=area_desc, headline=headline)
            if polygons:
                geo_status = "POLYGON_VERIFIED"
            elif circles:
                geo_status = "CIRCLE_VERIFIED"
            elif item_lat is not None and item_lon is not None:
                geo_status = "COORDINATE_POINT"
            elif is_countrywide:
                geo_status = "TERRITORY_NATIONAL"
            else:
                geo_status = "LOCATION_UNVERIFIED"

            alert_item = GlobalAlertItem(
                id=alert_id,
                source_provider="WMO SWIC",
                alert_type=AlertCategoryEnum.OFFICIAL_CAP_WARNING,
                event=event_name,
                headline=headline,
                severity=severity,
                severity_original=f"WMO Priority Level {s_code}" if s_code else None,
                urgency=urgency,
                certainty=certainty,
                local_color_code=local_color,
                language=lang,
                msg_type=msg_type,
                status=status_val,
                scope=scope_val,
                references=references_val,
                issuer=issuer,
                country_code=item_country or None,
                affected_area=area_desc,
                effective_time=it.get("effective") or sent_time or None,
                expires_time=expires_time or None,
                description=headline,
                source_url=full_cap_url,
                latitude=item_lat,
                longitude=item_lon,
                polygons=polygons,
                circles=circles,
                is_country_wide=is_countrywide,
                geographic_status=geo_status,
            )

            # Deduplication across languages for same raw_id
            if raw_id in alerts_by_id:
                if lang == "en":
                    alerts_by_id[raw_id] = alert_item
            else:
                alerts_by_id[raw_id] = alert_item

        normalized = list(alerts_by_id.values())

        health = ProviderHealth(
            provider_name="WMO SWIC",
            status=ProviderHealthStatus.CONNECTED,
            total_alerts_fetched=total_unfiltered,
            retrieved_at=time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            latency_ms=round(latency, 1),
            attribution="World Meteorological Organization (https://severeweather.wmo.int)",
        )

        return normalized, health, total_unfiltered


wmo_adapter = WMOCAPAdapter()
