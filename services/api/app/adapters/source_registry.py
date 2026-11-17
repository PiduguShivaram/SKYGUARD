"""Authoritative Country Code Registry & Meteorological Agency Mapping.

Provides verified ISO-3166-1 alpha-2 and alpha-3 mappings, strict non-leaking country
matching, and authentic agency names for global CAP feeds (WMO SWIC, Alert-Hub, GDACS).
"""
import re
from typing import Dict, List, Optional, Set, Tuple

# Comprehensive ISO-3166-1 alpha-2 <-> alpha-3 and English Country Name Mapping
ISO_COUNTRY_TABLE: Dict[str, Tuple[str, str]] = {
    # Alpha-2: (Alpha-3, English Standard Name)
    "AF": ("AFG", "Afghanistan"),
    "AL": ("ALB", "Albania"),
    "DZ": ("DZA", "Algeria"),
    "AR": ("ARG", "Argentina"),
    "AM": ("ARM", "Armenia"),
    "AU": ("AUS", "Australia"),
    "AT": ("AUT", "Austria"),
    "BD": ("BGD", "Bangladesh"),
    "BE": ("BEL", "Belgium"),
    "BR": ("BRA", "Brazil"),
    "CA": ("CAN", "Canada"),
    "CL": ("CHL", "Chile"),
    "CN": ("CHN", "China"),
    "CO": ("COL", "Colombia"),
    "HR": ("HRV", "Croatia"),
    "CW": ("CUW", "Curaçao"),
    "CZ": ("CZE", "Czech Republic"),
    "DK": ("DNK", "Denmark"),
    "EG": ("EGY", "Egypt"),
    "FI": ("FIN", "Finland"),
    "FR": ("FRA", "France"),
    "DE": ("DEU", "Germany"),
    "GR": ("GRC", "Greece"),
    "HK": ("HKG", "Hong Kong"),
    "IN": ("IND", "India"),
    "ID": ("IDN", "Indonesia"),
    "IR": ("IRN", "Iran"),
    "IQ": ("IRQ", "Iraq"),
    "IE": ("IRL", "Ireland"),
    "IL": ("ISR", "Israel"),
    "IT": ("ITA", "Italy"),
    "JP": ("JPN", "Japan"),
    "JO": ("JOR", "Jordan"),
    "KZ": ("KAZ", "Kazakhstan"),
    "KE": ("KEN", "Kenya"),
    "KR": ("KOR", "South Korea"),
    "KW": ("KWT", "Kuwait"),
    "MY": ("MYS", "Malaysia"),
    "MX": ("MEX", "Mexico"),
    "NL": ("NLD", "Netherlands"),
    "NZ": ("NZL", "New Zealand"),
    "NG": ("NGA", "Nigeria"),
    "NO": ("NOR", "Norway"),
    "PK": ("PAK", "Pakistan"),
    "PH": ("PHL", "Philippines"),
    "PL": ("POL", "Poland"),
    "PT": ("PRT", "Portugal"),
    "QA": ("QAT", "Qatar"),
    "RO": ("ROU", "Romania"),
    "RU": ("RUS", "Russian Federation"),
    "SA": ("SAU", "Saudi Arabia"),
    "RS": ("SRB", "Serbia"),
    "SG": ("SGP", "Singapore"),
    "SK": ("SVK", "Slovakia"),
    "ZA": ("ZAF", "South Africa"),
    "ES": ("ESP", "Spain"),
    "SE": ("SWE", "Sweden"),
    "CH": ("CHE", "Switzerland"),
    "TH": ("THA", "Thailand"),
    "TR": ("TUR", "Turkey"),
    "UA": ("UKR", "Ukraine"),
    "AE": ("ARE", "United Arab Emirates"),
    "GB": ("GBR", "United Kingdom"),
    "UK": ("GBR", "United Kingdom"),
    "US": ("USA", "United States"),
    "UZ": ("UZB", "Uzbekistan"),
    "VN": ("VNM", "Vietnam"),
    "ZW": ("ZWE", "Zimbabwe"),
}

# Reverse mapping: Alpha-3 -> Alpha-2
ALPHA3_TO_ALPHA2: Dict[str, str] = {
    v[0]: k for k, v in ISO_COUNTRY_TABLE.items() if k != "UK"
}
# Custom aliases
ALPHA3_TO_ALPHA2["GBR"] = "GB"

# Reverse mapping: Lowercase country name -> Alpha-2
NAME_TO_ALPHA2: Dict[str, str] = {
    v[1].lower(): k for k, v in ISO_COUNTRY_TABLE.items()
}
# Additional common synonyms
NAME_TO_ALPHA2["united states of america"] = "US"
NAME_TO_ALPHA2["usa"] = "US"
NAME_TO_ALPHA2["uk"] = "GB"
NAME_TO_ALPHA2["britain"] = "GB"
NAME_TO_ALPHA2["great britain"] = "GB"
NAME_TO_ALPHA2["russia"] = "RU"
NAME_TO_ALPHA2["south korea"] = "KR"
NAME_TO_ALPHA2["czechia"] = "CZ"
NAME_TO_ALPHA2["curacao"] = "CW"


# Authoritative Meteorological & Hydrological Services Registry
AGENCY_NAME_REGISTRY: Dict[str, str] = {
    # Prefix -> Authentic Agency Title
    "us-noaa-nws": "National Oceanic and Atmospheric Administration / US National Weather Service (NOAA/NWS)",
    "us-noaa-mzus": "NOAA / US National Weather Service Marine",
    "cn-cma": "China Meteorological Administration (CMA)",
    "uk-metoffice": "UK Met Office",
    "uk-env": "UK Environment Agency",
    "de-dwd": "Deutscher Wetterdienst (DWD, Germany)",
    "cz-chmi": "Czech Hydrometeorological Institute (ČHMÚ, Czechia)",
    "in-imd": "India Meteorological Department (IMD, India)",
    "au-bom": "Australian Bureau of Meteorology (BOM)",
    "es-aemet": "Agencia Estatal de Meteorología (AEMET, Spain)",
    "kz-kazhydromet": "National Hydrometeorological Service of Kazakhstan (Kazhydromet)",
    "ch-meteoswiss": "Federal Office of Meteorology and Climatology (MeteoSwiss)",
    "cw-meteo": "Meteorological Department Curaçao (MDC)",
    "hr-meteo": "Croatian Meteorological and Hydrological Service (DHMZ)",
    "pt-ipma": "Instituto Português do Mar e da Atmosfera (IPMA, Portugal)",
    "it-meteo": "Servizio Meteorologico dell'Aeronautica Militare (Italy)",
    "ar-smn": "Servicio Meteorológico Nacional (SMN, Argentina)",
    "ru-meteorf": "Federal Service for Hydrometeorology and Environmental Monitoring (Roshydromet)",
    "id-bmkg": "Meteorological, Climatological, and Geophysical Agency (BMKG, Indonesia)",
    "sa-ncm": "National Center for Meteorology (Saudi Arabia)",
    "at-zamg": "GeoSphere Austria (ZAMG)",
    "at-geosphere": "GeoSphere Austria",
    "sk-shmu": "Slovak Hydrometeorological Institute (SHMÚ, Slovakia)",
    "co-ideam": "Institute of Hydrology, Meteorology and Environmental Studies (IDEAM, Colombia)",
    "pl-imgw": "Institute of Meteorology and Water Management (IMGW, Poland)",
    "uz-hydromet": "Centre of Hydrometeorological Service of Uzbekistan (Uzhydromet)",
    "rs-hidmet": "Republic Hydrometeorological Service of Serbia (RHMZ)",
    "jo-jmd": "Jordan Meteorological Department (JMD)",
}


def normalize_to_iso2(code_or_name: Optional[str]) -> Optional[str]:
    """Convert any 2-letter, 3-letter, or common country name to ISO-2 uppercase."""
    if not code_or_name:
        return None
    cleaned = code_or_name.strip()
    if not cleaned:
        return None

    upper = cleaned.upper()
    if upper == "UK":
        return "GB"
    if upper in ISO_COUNTRY_TABLE:
        return upper
    if upper in ALPHA3_TO_ALPHA2:
        return ALPHA3_TO_ALPHA2[upper]

    lower = cleaned.lower()
    if lower in NAME_TO_ALPHA2:
        return NAME_TO_ALPHA2[lower]

    return None


def get_authentic_agency_name(feed_prefix: str, country_code: Optional[str] = None) -> str:
    """Return genuine agency name without inventing fake authorities."""
    clean_prefix = feed_prefix.lower().strip()
    for key, name in AGENCY_NAME_REGISTRY.items():
        if clean_prefix.startswith(key):
            return name

    iso2 = normalize_to_iso2(country_code) or normalize_to_iso2(feed_prefix.split("-")[0] if "-" in feed_prefix else None)
    if iso2 and iso2 in ISO_COUNTRY_TABLE:
        country_name = ISO_COUNTRY_TABLE[iso2][1]
        return f"National Meteorological Authority ({country_name})"

    if feed_prefix:
        return f"Issuing Authority ({feed_prefix})"
    return "Issuing Meteorological Authority"


def strictly_matches_country(
    target_country: Optional[str],
    alert_country_iso2: Optional[str],
    alert_iso3: Optional[str] = None,
    alert_country_name: Optional[str] = None,
    affected_countries: Optional[List] = None,
) -> bool:
    """Strictly matches target country using verified ISO codes and exact country names.
    
    NEVER uses loose substring matching (prevents 'IN' matching 'China' or 'Argentina').
    """
    if not target_country:
        return True  # No country filter applied -> worldwide view

    target_iso2 = normalize_to_iso2(target_country)
    if not target_iso2:
        return False

    target_iso3 = ISO_COUNTRY_TABLE.get(target_iso2, (target_iso2, ""))[0]
    target_name = ISO_COUNTRY_TABLE.get(target_iso2, ("", ""))[1].lower()

    # 1. Check Alert ISO-2
    if alert_country_iso2:
        norm_alert_iso2 = normalize_to_iso2(alert_country_iso2)
        if norm_alert_iso2 == target_iso2:
            return True

    # 2. Check Alert ISO-3
    if alert_iso3:
        clean_iso3 = alert_iso3.strip().upper()
        if clean_iso3 == target_iso3:
            return True

    # 3. Check Alert Full Country Name (EXACT case-insensitive equality)
    if alert_country_name:
        clean_name = alert_country_name.strip().lower()
        if clean_name == target_name:
            return True
        norm_from_name = normalize_to_iso2(clean_name)
        if norm_from_name == target_iso2:
            return True

    # 4. Check affected countries array (from GDACS)
    if affected_countries and isinstance(affected_countries, list):
        for aff in affected_countries:
            if isinstance(aff, dict):
                aff_iso3 = str(aff.get("iso3", "")).strip().upper()
                if aff_iso3 == target_iso3:
                    return True
                aff_name = str(aff.get("countryname", "")).strip().lower()
                if aff_name == target_name or normalize_to_iso2(aff_name) == target_iso2:
                    return True
            elif isinstance(aff, str):
                aff_clean = aff.strip().upper()
                if aff_clean in (target_iso2, target_iso3) or aff.strip().lower() == target_name:
                    return True

    return False


def extract_local_color_code(text: str) -> Optional[str]:
    """Detect official local warning color codes from CAP text."""
    if not text:
        return None
    lower = text.lower()

    # 1. Chinese / East Asian Standard Level Badges
    if "level i/" in lower or "level 1/" in lower or "red warning" in lower or "i级" in text:
        return "Red [Level I]"
    if "level ii/" in lower or "level 2/" in lower or "orange warning" in lower or "ii级" in text:
        return "Orange [Level II]"
    if "level iii/" in lower or "level 3/" in lower or "yellow warning" in lower or "iii级" in text:
        return "Yellow [Level III]"
    if "level iv/" in lower or "level 4/" in lower or "blue warning" in lower or "iv级" in text:
        return "Blue [Level IV]"

    # 2. MeteoAlarm / European Color Codes
    if "code red" in lower or "code rood" in lower or "rot" in lower.split():
        return "Red"
    if "code orange" in lower or "code oranje" in lower:
        return "Orange"
    if "code yellow" in lower or "code geel" in lower or "gelb" in lower.split():
        return "Yellow"

    # 3. NWS Product Tier
    if "warning" in lower:
        return "Warning"
    if "watch" in lower:
        return "Watch"
    if "advisory" in lower:
        return "Advisory"
    if "statement" in lower:
        return "Statement"

    return None
