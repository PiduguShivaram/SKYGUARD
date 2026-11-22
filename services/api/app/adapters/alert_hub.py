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
from services.api.app.services.geo_matcher import is_explicitly_country_wide

ALERT_HUB_UNFILTERED_RSS_URL = "https://cap-alerts.s3.amazonaws.com/unfiltered/rss.xml"


def determine_alerthub_severity(item: ET.Element) -> Tuple[AlertSeverityLevel, Optional[str]]:
    """Determine genuine CAP severity from Alert-Hub XML tags.
    
    Zero keyword inference: Never assign Extreme, Severe, or Moderate based on
    text keywords in the title or description. If original CAP severity is not
    explicitly provided in XML, report UNKNOWN to preserve data integrity.
    """
    sev_el = item.find("severity")
    if sev_el is None:
        sev_el = item.find("{http://alert-hub.org/cap-extensions}severity")
    if sev_el is None:
        sev_el = item.find("{urn:oasis:names:tc:emergency:cap:1.2}severity")

    if sev_el is not None and sev_el.text:
        val = sev_el.text.strip().capitalize()
        if val == "Extreme":
            return AlertSeverityLevel.EXTREME, "Official CAP Extreme"
        if val == "Severe":
            return AlertSeverityLevel.SEVERE, "Official CAP Severe"
        if val == "Moderate":
            return AlertSeverityLevel.MODERATE, "Official CAP Moderate"
        if val == "Minor":
            return AlertSeverityLevel.MINOR, "Official CAP Minor"
        return AlertSeverityLevel.UNKNOWN, f"Unrecognized CAP severity: {val}"

    return (
        AlertSeverityLevel.UNKNOWN,
        "Original CAP severity not provided in RSS feed summary; inspect raw CAP XML",
    )


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

            # Severity determination from explicit XML tags (zero keyword inference)
            sev, sev_orig = determine_alerthub_severity(item)
            local_color = extract_local_color_code(title + " " + desc)

            # Urgency and Certainty tags
            urg_el = item.find("urgency")
            if urg_el is None:
                urg_el = item.find("{http://alert-hub.org/cap-extensions}urgency")
            if urg_el is None:
                urg_el = item.find("{urn:oasis:names:tc:emergency:cap:1.2}urgency")
            urgency = (urg_el.text or "").strip().capitalize() if (urg_el is not None and urg_el.text) else "Unknown"

            cert_el = item.find("certainty")
            if cert_el is None:
                cert_el = item.find("{http://alert-hub.org/cap-extensions}certainty")
            if cert_el is None:
                cert_el = item.find("{urn:oasis:names:tc:emergency:cap:1.2}certainty")
            certainty = (cert_el.text or "").strip().capitalize() if (cert_el is not None and cert_el.text) else "Unknown"

            # Polygons extraction
            polygons: List[str] = []
            for p_el in (
                item.findall("polygon")
                + item.findall("{http://alert-hub.org/cap-extensions}polygon")
                + item.findall("{urn:oasis:names:tc:emergency:cap:1.2}polygon")
            ):
                if p_el.text and p_el.text.strip():
                    polygons.append(p_el.text.strip())

            # Circles extraction (CAP 1.2 lat,lon radius_km)
            circles: List[str] = []
            for c_el in (
                item.findall("circle")
                + item.findall("{http://alert-hub.org/cap-extensions}circle")
                + item.findall("{urn:oasis:names:tc:emergency:cap:1.2}circle")
            ):
                if c_el.text and c_el.text.strip():
                    circles.append(c_el.text.strip())

            # Evaluate geographic status and nationwide scope
            area_desc = source_feed or item_country or "Territory"
            is_countrywide = is_explicitly_country_wide(area_desc=area_desc, headline=title)
            if polygons:
                geo_status = "POLYGON_VERIFIED"
            elif circles:
                geo_status = "CIRCLE_VERIFIED"
            elif is_countrywide:
                geo_status = "TERRITORY_NATIONAL"
            else:
                geo_status = "LOCATION_UNVERIFIED"

            # Message type, Status, Scope, and References
            msg_type_el = item.find("msgType")
            if msg_type_el is None:
                msg_type_el = item.find("{urn:oasis:names:tc:emergency:cap:1.2}msgType")
            msg_type = (msg_type_el.text or "").strip().capitalize() if (msg_type_el is not None and msg_type_el.text) else "Alert"
            if any(k in title.lower() or k in desc.lower() for k in ["cancel", "cancellation", "expired"]):
                msg_type = "Cancel"

            status_el = item.find("status")
            if status_el is None:
                status_el = item.find("{urn:oasis:names:tc:emergency:cap:1.2}status")
            status_val = (status_el.text or "").strip().capitalize() if (status_el is not None and status_el.text) else "Actual"

            scope_el = item.find("scope")
            if scope_el is None:
                scope_el = item.find("{urn:oasis:names:tc:emergency:cap:1.2}scope")
            scope_val = (scope_el.text or "").strip().capitalize() if (scope_el is not None and scope_el.text) else "Public"

            ref_el = item.find("references")
            if ref_el is None:
                ref_el = item.find("{urn:oasis:names:tc:emergency:cap:1.2}references")
            references_val = (ref_el.text or "").strip() if (ref_el is not None and ref_el.text) else None

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
                effective_time=pub_date or None,
                description=desc,
                source_url=link,
                polygons=polygons,
                circles=circles,
                is_country_wide=is_countrywide,
                geographic_status=geo_status,
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
