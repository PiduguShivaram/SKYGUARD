"""Alert-Hub.org Global CAP Aggregation Feed Adapter.

Fetches and safely parses live Common Alerting Protocol (CAP 1.2) emergency feeds aggregated globally.
Source: Alert-Hub.org / WMO Global Alert Hub initiative (https://alert-hub.org).
"""
import time
import xml.etree.ElementTree as ET
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

ALERT_HUB_UNFILTERED_RSS_URL = "https://cap-alerts.s3.amazonaws.com/unfiltered/rss.xml"


def determine_alerthub_severity(title: str, desc: str) -> Tuple[AlertSeverityLevel, Optional[str]]:
    """Determine genuine CAP severity from Alert-Hub title and description.
    
    Avoids defaulting all warning alerts to Extreme.
    """
    text = (title + " " + desc).lower()

    if any(k in text for k in ["extreme danger", "catastrophic", "flash flood emergency", "tornado emergency", "hurricane warning"]):
        return AlertSeverityLevel.EXTREME, "Extreme Threat Level"
    if any(k in text for k in ["severe", "gale warning", "storm warning", "blizzard warning", "flood warning", "red warning"]):
        return AlertSeverityLevel.SEVERE, "Severe Warning Level"
    if any(k in text for k in ["watch", "advisory", "orange warning", "yellow warning", "special weather statement"]):
        return AlertSeverityLevel.MODERATE, "Advisory / Watch Level"
    if any(k in text for k in ["statement", "notice", "minor", "blue warning"]):
        return AlertSeverityLevel.MINOR, "Minor / Informational Level"

    # Default to Moderate rather than inflating to Extreme
    return AlertSeverityLevel.MODERATE, "Ingested CAP Bulletin"


class AlertHubAdapter:
    def __init__(self, timeout: float = 12.0):
        self.url = ALERT_HUB_UNFILTERED_RSS_URL
        self.timeout = httpx.Timeout(timeout, connect=5.0)

    async def fetch_alerts(
        self,
        country_code: Optional[str] = None,
    ) -> Tuple[List[GlobalAlertItem], ProviderHealth, int]:
        """Fetch Alert-Hub RSS alerts.
        
        Returns:
            (filtered_alerts, health, total_unfiltered_count)
        """
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
            return [], health, 0

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
            return [], health, 0

        total_unfiltered = len(items)
        alerts_by_id: Dict[str, GlobalAlertItem] = {}

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

            # Extract country code from sourceFeed (e.g. cn-cma-xx -> CN, us-noaa-nws-en -> US, uk-env-en -> GB)
            item_country = ""
            feed_prefix = source_feed
            lang = "en"
            if "-" in source_feed:
                parts = source_feed.split("-")
                item_country = normalize_to_iso2(parts[0]) or parts[0].upper()
                feed_prefix = f"{parts[0]}-{parts[1]}" if len(parts) > 1 else parts[0]
                if len(parts) >= 3:
                    lang = parts[-1]

            # Strict Country Filter
            if country_code:
                if not strictly_matches_country(
                    target_country=country_code,
                    alert_country_iso2=item_country,
                ):
                    continue

            # Severity determination
            sev, sev_orig = determine_alerthub_severity(title, desc)
            local_color = extract_local_color_code(title + " " + desc)

            # Message type
            msg_type = "Alert"
            if any(k in title.lower() or k in desc.lower() for k in ["cancel", "cancellation", "expired"]):
                msg_type = "Cancel"

            # Authentic agency name
            issuer = get_authentic_agency_name(feed_prefix or source_feed, item_country)
            raw_id = alert_id_val or link
            item_id = f"AlertHub-{raw_id}"

            alert_item = GlobalAlertItem(
                id=item_id,
                source_provider="Alert-Hub.org",
                alert_type=AlertCategoryEnum.OFFICIAL_CAP_WARNING,
                event=title.split(" issued")[0].split(":")[0].strip() or "Official CAP Warning",
                headline=title,
                severity=sev,
                severity_original=sev_orig,
                urgency="Expected",
                certainty="Likely",
                local_color_code=local_color,
                language=lang,
                msg_type=msg_type,
                issuer=issuer,
                country_code=item_country or None,
                affected_area=source_feed or item_country or "Territory",
                effective_time=pub_date or None,
                description=desc,
                source_url=link,
            )

            # Deduplicate by raw_id
            if raw_id not in alerts_by_id:
                alerts_by_id[raw_id] = alert_item

        normalized = list(alerts_by_id.values())

        health = ProviderHealth(
            provider_name="Alert-Hub.org",
            status=ProviderHealthStatus.CONNECTED,
            total_alerts_fetched=total_unfiltered,
            retrieved_at=time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            latency_ms=round(latency, 1),
            attribution="Alert-Hub.org (https://alert-hub.org)",
        )

        return normalized, health, total_unfiltered


alert_hub_adapter = AlertHubAdapter()
