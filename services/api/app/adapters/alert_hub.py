"""Alert-Hub.org Global CAP Aggregation Feed Adapter.

Fetches and safely parses live Common Alerting Protocol (CAP 1.2) emergency feeds aggregated globally.
Source: Alert-Hub.org / WMO Global Alert Hub initiative (https://alert-hub.org).
"""
import time
import xml.etree.ElementTree as ET
from typing import List, Optional, Tuple
import httpx

from services.api.app.schemas.global_alerts import (
    AlertCategoryEnum,
    AlertSeverityLevel,
    GlobalAlertItem,
    ProviderHealth,
    ProviderHealthStatus,
)

ALERT_HUB_UNFILTERED_RSS_URL = "https://cap-alerts.s3.amazonaws.com/unfiltered/rss.xml"


class AlertHubAdapter:
    def __init__(self, timeout: float = 12.0):
        self.url = ALERT_HUB_UNFILTERED_RSS_URL
        self.timeout = httpx.Timeout(timeout, connect=5.0)

    async def fetch_alerts(
        self,
        country_code: Optional[str] = None,
    ) -> Tuple[List[GlobalAlertItem], ProviderHealth]:
        start_time = time.time()
        headers = {"User-Agent": "SkyGuard-Weather-Intelligence/2.0 (Alert-Hub Global CAP Ingestion)"}

        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                resp = await client.get(self.url, headers=headers)
                resp.raise_for_status()
                content = resp.content
        except Exception as exc:
            latency = (time.time() - start_time) * 1000.0
            health = ProviderHealth(
                provider_name="Alert-Hub.org",
                status=ProviderHealthStatus.UNAVAILABLE,
                total_alerts_fetched=0,
                retrieved_at=time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
                latency_ms=round(latency, 1),
                error_message=f"Failed to query Alert-Hub RSS: {str(exc)}",
                attribution="Alert-Hub.org (https://alert-hub.org)",
            )
            return [], health

        latency = (time.time() - start_time) * 1000.0

        try:
            root = ET.fromstring(content)
            channel = root.find("channel")
            items = channel.findall("item") if channel is not None else []
        except Exception as exc:
            health = ProviderHealth(
                provider_name="Alert-Hub.org",
                status=ProviderHealthStatus.UNAVAILABLE,
                total_alerts_fetched=0,
                retrieved_at=time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
                latency_ms=round(latency, 1),
                error_message=f"XML parsing error: {str(exc)}",
                attribution="Alert-Hub.org (https://alert-hub.org)",
            )
            return [], health

        normalized: List[GlobalAlertItem] = []
        c_code_clean = country_code.strip().upper() if country_code else None

        for item in items:
            title_el = item.find("title")
            link_el = item.find("link")
            desc_el = item.find("description")
            pub_date_el = item.find("pubDate")
            alert_id_el = item.find("alertId")
            if alert_id_el is None:
                alert_id_el = item.find("{http://alert-hub.org/cap-extensions}alertId")
            source_feed_el = item.find("sourceFeed")
            if source_feed_el is None:
                source_feed_el = item.find("{http://alert-hub.org/cap-extensions}sourceFeed")

            title = (title_el.text or "").strip() if title_el is not None else "Emergency Alert"
            link = (link_el.text or "").strip() if link_el is not None else "https://alert-hub.org"
            desc = (desc_el.text or "").strip() if desc_el is not None else title
            pub_date = (pub_date_el.text or "").strip() if pub_date_el is not None else ""
            alert_id_val = (alert_id_el.text or "").strip() if alert_id_el is not None else link
            source_feed = (source_feed_el.text or "").strip() if source_feed_el is not None else ""

            # Extract country code
            item_country = ""
            if "-" in source_feed:
                item_country = source_feed.split("-")[0].upper()

            # Country filter
            if c_code_clean and item_country and c_code_clean != item_country:
                continue

            # Basic severity determination from text
            title_lower = title.lower() + " " + desc.lower()
            if any(w in title_lower for w in ["warning", "red", "danger", "cyclone", "hurricane", "extreme"]):
                sev = AlertSeverityLevel.EXTREME
            elif any(w in title_lower for w in ["watch", "advisory", "orange", "severe", "gale"]):
                sev = AlertSeverityLevel.SEVERE
            else:
                sev = AlertSeverityLevel.MODERATE

            normalized.append(
                GlobalAlertItem(
                    id=f"AlertHub-{alert_id_val}",
                    source_provider="Alert-Hub.org",
                    alert_type=AlertCategoryEnum.OFFICIAL_CAP_WARNING,
                    event=title,
                    headline=title,
                    severity=sev,
                    severity_original="Alert-Hub Ingested CAP",
                    issuer=f"Official Alert Authority ({source_feed or item_country or 'Global'})",
                    country_code=item_country or None,
                    affected_area=source_feed or "Territory",
                    effective_time=pub_date or None,
                    description=desc,
                    source_url=link,
                )
            )

        health = ProviderHealth(
            provider_name="Alert-Hub.org",
            status=ProviderHealthStatus.CONNECTED,
            total_alerts_fetched=len(items),
            retrieved_at=time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            latency_ms=round(latency, 1),
            attribution="Alert-Hub.org (https://alert-hub.org)",
        )

        return normalized, health


alert_hub_adapter = AlertHubAdapter()
