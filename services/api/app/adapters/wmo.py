"""WMO (World Meteorological Organization) Severe Weather Information Centre (SWIC) CAP Adapter.

Fetches official severe weather warnings issued by National Meteorological and Hydrological Services (NMHSs) globally.
Source: World Meteorological Organization (https://severeweather.wmo.int).
"""
import time
from typing import List, Optional, Tuple
import httpx

from services.api.app.schemas.global_alerts import (
    AlertCategoryEnum,
    AlertSeverityLevel,
    GlobalAlertItem,
    ProviderHealth,
    ProviderHealthStatus,
)

WMO_SWIC_ALL_JSON_URL = "https://severeweather.wmo.int/json/wmo_all.json"
WMO_CAP_BASE_URL = "https://severeweather.wmo.int/v2/cap-alerts"


def map_wmo_severity(s_code: Optional[int]) -> AlertSeverityLevel:
    if s_code == 1:
        return AlertSeverityLevel.EXTREME
    if s_code == 2:
        return AlertSeverityLevel.SEVERE
    if s_code == 3:
        return AlertSeverityLevel.MODERATE
    if s_code == 4:
        return AlertSeverityLevel.MINOR
    return AlertSeverityLevel.UNKNOWN


class WMOCAPAdapter:
    def __init__(self, timeout: float = 12.0):
        self.url = WMO_SWIC_ALL_JSON_URL
        self.timeout = httpx.Timeout(timeout, connect=5.0)

    async def fetch_alerts(
        self,
        country_code: Optional[str] = None,
    ) -> Tuple[List[GlobalAlertItem], ProviderHealth]:
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
            return [], health

        latency = (time.time() - start_time) * 1000.0
        items = data.get("items", []) if isinstance(data, dict) else []

        normalized: List[GlobalAlertItem] = []
        c_code_clean = country_code.strip().upper() if country_code else None

        for it in items:
            alert_id = str(it.get("id") or it.get("capURL") or "")
            cap_rel_url = it.get("capURL", "")
            
            # Extract country code from capURL prefix (e.g. us-nws -> US, es-aemet -> ES, in-imd -> IN)
            item_country = ""
            if "-" in cap_rel_url:
                item_country = cap_rel_url.split("-")[0].upper()

            # Filtering by country code if specified
            if c_code_clean and item_country and c_code_clean != item_country:
                continue

            s_code = it.get("s")
            severity = map_wmo_severity(s_code)
            headline = str(it.get("headline", "")).strip() or str(it.get("event", "Official Weather Warning"))
            event_name = str(it.get("event", "")).strip() or "Severe Weather Alert"
            area_desc = str(it.get("areaDesc", "")).strip() or item_country or "Territory"
            sent_time = it.get("sent", "")
            expires_time = it.get("expires", "")
            full_cap_url = f"{WMO_CAP_BASE_URL}/{cap_rel_url}" if cap_rel_url else "https://severeweather.wmo.int"

            normalized.append(
                GlobalAlertItem(
                    id=alert_id,
                    source_provider="WMO SWIC",
                    alert_type=AlertCategoryEnum.OFFICIAL_CAP_WARNING,
                    event=event_name,
                    headline=headline,
                    severity=severity,
                    severity_original=f"WMO Priority Level {s_code}" if s_code else None,
                    issuer=f"Official NMHS Authority ({item_country or 'WMO Member'})",
                    country_code=item_country or None,
                    affected_area=area_desc,
                    effective_time=sent_time or None,
                    expires_time=expires_time or None,
                    description=headline,
                    source_url=full_cap_url,
                )
            )

        health = ProviderHealth(
            provider_name="WMO SWIC",
            status=ProviderHealthStatus.CONNECTED,
            total_alerts_fetched=len(items),
            retrieved_at=time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            latency_ms=round(latency, 1),
            attribution="World Meteorological Organization (https://severeweather.wmo.int)",
        )

        return normalized, health


wmo_adapter = WMOCAPAdapter()
