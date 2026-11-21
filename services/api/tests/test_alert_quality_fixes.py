"""Comprehensive unit and integration tests for Emergency Alert Quality & Data Integrity Fixes."""
import pytest
from services.api.app.adapters.source_registry import (
    extract_local_color_code,
    get_authentic_agency_name,
    normalize_to_iso2,
    strictly_matches_country,
)
from services.api.app.adapters.wmo import (
    map_wmo_certainty,
    map_wmo_severity,
    map_wmo_urgency,
)
from services.api.app.schemas.global_alerts import AlertSeverityLevel
from services.api.app.services.farmer_engine import evaluate_farmer_watches
from services.api.app.schemas.farmer import CropTypeEnum
from services.api.app.schemas.weather import DailyForecastPoint


def test_strict_country_matching_prevents_substring_leaks():
    """Verify that query country 'IN' never matches 'China', 'Argentina', or other substrings."""
    # 1. Exact ISO-2 match
    assert strictly_matches_country("IN", "IN") is True
    assert strictly_matches_country("IN", "IND") is True
    assert strictly_matches_country("in", "ind") is True

    # 2. String containing 'in' MUST NOT match 'IN'
    assert strictly_matches_country("IN", "CN", alert_iso3="CHN", alert_country_name="China") is False
    assert strictly_matches_country("IN", "AR", alert_iso3="ARG", alert_country_name="Argentina") is False
    assert strictly_matches_country("IN", "DO", alert_iso3="DOM", alert_country_name="Dominican Republic") is False
    assert strictly_matches_country("IN", "FI", alert_iso3="FIN", alert_country_name="Finland") is False
    assert strictly_matches_country("IN", "PH", alert_iso3="PHL", alert_country_name="Philippines") is False

    # 3. Target 'US' MUST NOT match countries containing 'us'
    assert strictly_matches_country("US", "RU", alert_iso3="RUS", alert_country_name="Russian Federation") is False
    assert strictly_matches_country("US", "BY", alert_iso3="BLR", alert_country_name="Belarus") is False
    assert strictly_matches_country("US", "CY", alert_iso3="CYP", alert_country_name="Cyprus") is False
    assert strictly_matches_country("US", "US", alert_iso3="USA", alert_country_name="United States") is True

    # 4. Target 'DE' (Germany) MUST NOT match Denmark or Sweden
    assert strictly_matches_country("DE", "DK", alert_iso3="DNK", alert_country_name="Denmark") is False
    assert strictly_matches_country("DE", "SE", alert_iso3="SWE", alert_country_name="Sweden") is False
    assert strictly_matches_country("DE", "DE", alert_iso3="DEU", alert_country_name="Germany") is True


def test_iso_normalization():
    assert normalize_to_iso2("IND") == "IN"
    assert normalize_to_iso2("India") == "IN"
    assert normalize_to_iso2("USA") == "US"
    assert normalize_to_iso2("United States") == "US"
    assert normalize_to_iso2("UK") == "GB"
    assert normalize_to_iso2("GBR") == "GB"
    assert normalize_to_iso2("China") == "CN"
    assert normalize_to_iso2("CHN") == "CN"


def test_wmo_priority_severity_mapping():
    """Verify that WMO SWIC priority integers correctly map to standard CAP severities.
    
    s=4 is Extreme, s=3 is Severe, s=2 is Moderate, s=1 is Minor.
    Must NOT invert or default s=1 to Extreme!
    """
    assert map_wmo_severity(4) == AlertSeverityLevel.EXTREME
    assert map_wmo_severity(3) == AlertSeverityLevel.SEVERE
    assert map_wmo_severity(2) == AlertSeverityLevel.MODERATE
    assert map_wmo_severity(1) == AlertSeverityLevel.MINOR
    assert map_wmo_severity(0) == AlertSeverityLevel.UNKNOWN
    assert map_wmo_severity(None) == AlertSeverityLevel.UNKNOWN


def test_wmo_urgency_certainty_mapping():
    assert map_wmo_urgency(4) == "Immediate"
    assert map_wmo_urgency(3) == "Expected"
    assert map_wmo_urgency(2) == "Future"
    assert map_wmo_urgency(0) == "Unknown"

    assert map_wmo_certainty(4) == "Observed"
    assert map_wmo_certainty(3) == "Likely"
    assert map_wmo_certainty(2) == "Possible"
    assert map_wmo_certainty(0) == "Unknown"


def test_local_color_code_extraction():
    # Chinese Level / Color codes
    assert extract_local_color_code("Fangzheng County issues blue warning [Level IV/General]") == "Blue [Level IV]"
    assert extract_local_color_code("Wudang District issues yellow warning [Level III/Heavy]") == "Yellow [Level III]"
    assert extract_local_color_code("Haiyan County issues orange warning [Level II/Severe]") == "Orange [Level II]"
    assert extract_local_color_code("Haikou issues red warning [Level I/Extreme]") == "Red [Level I]"

    # European MeteoAlarm codes
    assert extract_local_color_code("DWD Code Orange Gale Warning") == "Orange"
    assert extract_local_color_code("DWD Code Red Storm Warning") == "Red"
    assert extract_local_color_code("MeteoSwiss Code Yellow Rain") == "Yellow"

    # NWS Tiers
    assert extract_local_color_code("Dense Fog Advisory issued") == "Advisory"
    assert extract_local_color_code("Winter Storm Watch issued") == "Watch"


def test_authentic_agency_name():
    # Known NMHS authorities
    assert "China Meteorological Administration" in get_authentic_agency_name("cn-cma-xx")
    assert "US National Weather Service (NOAA/NWS)" in get_authentic_agency_name("us-noaa-nws-en")
    assert "Deutscher Wetterdienst" in get_authentic_agency_name("de-dwd-en")
    assert "India Meteorological Department" in get_authentic_agency_name("in-imd-en")
    assert "UK Met Office" in get_authentic_agency_name("uk-metoffice-en")

    # Never invent 'Official Alert Authority'
    unknown = get_authentic_agency_name("xx-unknown-feed", "XX")
    assert "Official Alert Authority" not in unknown


def test_farmer_mode_applicability_and_wording():
    """Verify that Farmer Mode does not promise field safety and provides applicability limitations."""
    mild_forecast = [
        DailyForecastPoint(
            date="2026-11-18",
            temperature_2m_max=28.0,
            temperature_2m_min=18.0,
            apparent_temperature_max=28.0,
            apparent_temperature_min=18.0,
            precipitation_sum=1.0,
            precipitation_probability_max=10,
            wind_speed_10m_max=12.0,
            wind_gusts_10m_max=18.0,
            weather_code=1,
            weather_description="Mainly clear",
            weather_icon="mostly-clear",
        )
    ]

    res = evaluate_farmer_watches(CropTypeEnum.PADDY, mild_forecast)
    assert len(res.watches) == 0
    assert "ICAR-AICRPAM" in res.applicability_notice
    assert "tropical and subtropical" in res.applicability_notice
    assert "ICAR-AICRPAM" in res.provenance.provider


@pytest.mark.live
@pytest.mark.asyncio
async def test_live_country_filtering_no_china_leak_for_in():
    """Verify that querying country_code='IN' yields zero Chinese alerts."""
    from services.api.app.adapters.aggregator import global_alert_aggregator

    res = await global_alert_aggregator.get_all_alerts(country_code="IN")
    
    # Check that total worldwide counts are separated from filtered count
    assert res.total_worldwide_official_warnings > 500
    assert res.total_worldwide_disasters > 10

    # Ensure no Chinese alerts leaked into official_cap_warnings
    for alert in res.official_cap_warnings:
        assert alert.country_code == "IN"
        assert "China" not in alert.issuer
        assert "cn-cma" not in alert.source_url

    # Ensure no Chinese disasters leaked into gdacs_disaster_alerts
    for disaster in res.gdacs_disaster_alerts:
        assert disaster.country_code == "IN" or "India" in disaster.affected_area
        assert "China" not in disaster.affected_area or "India" in disaster.affected_area
