"""Global Alert Aggregator.

Orchestrates GDACS, WMO SWIC, and Alert-Hub.org adapters with concurrent execution,
deduplication, categorical separation, verified geographic filtering, and independent provider health tracking.
"""
import asyncio
from datetime import datetime, timezone
from typing import Dict, List, Optional
from services.api.app.adapters.alert_hub import alert_hub_adapter
from services.api.app.adapters.gdacs import gdacs_adapter
from services.api.app.adapters.wmo import wmo_adapter
from services.api.app.schemas.common import Provenance
from services.api.app.schemas.global_alerts import (
    AlertCategoryEnum,
    GlobalAlertItem,
    GlobalAlertsResponse,
    ProviderHealth,
)


class GlobalAlertAggregator:
    async def get_all_alerts(
        self,
        country_code: Optional[str] = None,
        latitude: Optional[float] = None,
        longitude: Optional[float] = None,
        radius_km: Optional[float] = 1000.0,
    ) -> GlobalAlertsResponse:
        # Run providers concurrently
        gdacs_task = gdacs_adapter.fetch_alerts(
            country_code=country_code,
            query_lat=latitude,
            query_lon=longitude,
            radius_km=radius_km,
        )
        wmo_task = wmo_adapter.fetch_alerts(country_code=country_code)
        alerthub_task = alert_hub_adapter.fetch_alerts(country_code=country_code)

        results = await asyncio.gather(gdacs_task, wmo_task, alerthub_task, return_exceptions=True)

        gdacs_res = results[0] if not isinstance(results[0], Exception) else ([], None, 0)
        wmo_res = results[1] if not isinstance(results[1], Exception) else ([], None, 0)
        alerthub_res = results[2] if not isinstance(results[2], Exception) else ([], None, 0)

        gdacs_alerts, gdacs_health, gdacs_total = gdacs_res
        wmo_alerts, wmo_health, wmo_total = wmo_res
        alerthub_alerts, alerthub_health, alerthub_total = alerthub_res

        # Providers Health Map
        providers_health: Dict[str, ProviderHealth] = {}
        if gdacs_health:
            providers_health["gdacs"] = gdacs_health
        if wmo_health:
            providers_health["wmo_swic"] = wmo_health
        if alerthub_health:
            providers_health["alert_hub"] = alerthub_health

        # Deduplication and Categorical Separation
        seen_ids = set()
        seen_canonical = set()
        official_warnings: List[GlobalAlertItem] = []
        disaster_alerts: List[GlobalAlertItem] = []

        # 1. Process Official CAP warnings (WMO SWIC & Alert-Hub)
        for item in wmo_alerts + alerthub_alerts:
            # Canonical key to prevent same alert from both WMO and Alert-Hub
            canonical_key = f"{item.country_code or ''}-{item.headline.strip().lower()}-{item.affected_area.strip().lower()}"
            dedup_id = item.id
            if dedup_id not in seen_ids and canonical_key not in seen_canonical:
                seen_ids.add(dedup_id)
                seen_canonical.add(canonical_key)
                official_warnings.append(item)

        # 2. Process GDACS Disaster alerts
        for item in gdacs_alerts:
            dedup_id = item.id
            if dedup_id not in seen_ids:
                seen_ids.add(dedup_id)
                disaster_alerts.append(item)

        # Sort: Extreme first, then Severe, then Moderate, then Minor
        sev_rank = {"Extreme": 0, "Severe": 1, "Moderate": 2, "Minor": 3, "Unknown": 4}
        official_warnings.sort(key=lambda a: (sev_rank.get(a.severity.value, 5), a.headline))
        disaster_alerts.sort(key=lambda a: (sev_rank.get(a.severity.value, 5), a.distance_km if a.distance_km is not None else 99999))

        # Categorical Spatial Segregation (ALT-09, ALT-10): Local Polygon-Verified vs National Advisories
        local_verified_warnings: List[GlobalAlertItem] = []
        country_wide_advisories: List[GlobalAlertItem] = []

        if latitude is not None and longitude is not None:
            from services.api.app.services.geo_matcher import evaluate_alert_spatial_match
            from services.api.app.adapters.source_registry import strictly_matches_country
            for item in official_warnings:
                is_match, reason, _ = evaluate_alert_spatial_match(
                    sub_country=country_code,
                    sub_lat=latitude,
                    sub_lon=longitude,
                    sub_radius_km=radius_km or 100.0,
                    wants_country_wide=False,
                    alert_country_code=item.country_code,
                    alert_area_desc=item.affected_area,
                    alert_headline=item.headline,
                    alert_lat=item.latitude,
                    alert_lon=item.longitude,
                    alert_polygons_str=item.polygons,
                    alert_circles_str=getattr(item, "circles", None),
                    alert_is_country_wide=item.is_country_wide,
                    alert_geographic_status=item.geographic_status,
                )
                if is_match and reason in ("POINT_IN_POLYGON_VERIFIED", "INSIDE_OFFICIAL_CIRCLE"):
                    local_verified_warnings.append(item)
                elif country_code and strictly_matches_country(country_code, item.country_code) and (item.is_country_wide or reason == "OFFICIAL_COUNTRY_WIDE_COVERAGE"):
                    country_wide_advisories.append(item)
        else:
            # Without coordinates, NO warning is locally verified (ALT-10)
            for item in official_warnings:
                country_wide_advisories.append(item)

        # Coverage Notes
        coverage_text = (
            "SkyGuard aggregates genuine international severe weather feeds: official CAP bulletins from WMO-registered "
            "National Meteorological Services, Alert-Hub.org international emergency feeds, and UN OCHA / European Commission GDACS "
            "global disaster monitoring. Absence of active warnings for a coordinate or country does NOT signify 'All Clear' or 'No Danger'. "
            "Always consult your local national civil protection and emergency management agencies."
        )

        provenance = Provenance(
            provider="WMO SWIC · GDACS (UN OCHA / EC) · Alert-Hub.org",
            source_model="Live Multi-Source CAP 1.2 XML & GeoJSON Aggregator",
            attribution_url="https://severeweather.wmo.int / https://www.gdacs.org / https://alert-hub.org",
            disclaimer="Official weather warnings originate from accredited National Meteorological and Hydrological Services (NMHSs) via WMO and Alert-Hub. Disaster impact indicators originate from GDACS multi-hazard monitoring. SkyGuard guarantees zero data fabrication.",
            retrieved_at=datetime.now(timezone.utc),
        )

        return GlobalAlertsResponse(
            query_country=country_code,
            query_latitude=latitude,
            query_longitude=longitude,
            radius_km=radius_km,
            total_worldwide_official_warnings=wmo_total + alerthub_total,
            total_worldwide_disasters=gdacs_total,
            total_official_warnings=len(official_warnings),
            total_disaster_alerts=len(disaster_alerts),
            official_cap_warnings=official_warnings,
            local_verified_warnings=local_verified_warnings,
            country_wide_advisories=country_wide_advisories,
            gdacs_disaster_alerts=disaster_alerts,
            providers_health=providers_health,
            coverage_notes=coverage_text,
            provenance=provenance,
        )


global_alert_aggregator = GlobalAlertAggregator()
