"""Satellite Earth Observation adapter for ISRO MOSDAC and Copernicus Sentinel-2 catalogs."""
from datetime import datetime, timezone
from typing import List
from services.api.app.schemas.common import Provenance
from services.api.app.schemas.satellite import SatelliteCatalogResponse, SatelliteProduct


SATELLITE_CATALOG: List[SatelliteProduct] = [
    SatelliteProduct(
        product_id="INSAT3DR_TIR1",
        satellite_name="INSAT-3DR",
        operator_agency="Indian Space Research Organisation (ISRO MOSDAC)",
        instrument="Meteorological Imager",
        spectral_band="Thermal Infrared (10.5 - 12.5 um)",
        spatial_resolution_m=4000.0,
        temporal_resolution="15 minutes (geostationary)",
        meteorological_application="Cloud-top brightness temperature, deep convective cloud tracking, diurnal storm development",
        access_status="CATALOG_METADATA_ONLINE",
        coverage_area="South Asia, Indian Ocean, Middle East, Southeast Asia",
        notes=(
            "Metadata and orbital specifications are verified online. Direct HDF5 raster acquisition and "
            "radiometric calibration require authorized ISRO MOSDAC API credentials."
        ),
    ),
    SatelliteProduct(
        product_id="INSAT3DR_WV",
        satellite_name="INSAT-3DR",
        operator_agency="Indian Space Research Organisation (ISRO MOSDAC)",
        instrument="Meteorological Sounder & Imager",
        spectral_band="Water Vapor (6.5 - 7.1 um)",
        spatial_resolution_m=8000.0,
        temporal_resolution="30 minutes (geostationary)",
        meteorological_application="Middle-to-upper tropospheric moisture, jet stream tracking, atmospheric dry slots",
        access_status="CATALOG_METADATA_ONLINE",
        coverage_area="Indian Ocean synoptic domain",
        notes=(
            "Metadata and orbital specifications verified online. Raw sounder/imager level-2 products "
            "require authorized ISRO MOSDAC credentials."
        ),
    ),
    SatelliteProduct(
        product_id="S2_MSI_L2A",
        satellite_name="Copernicus Sentinel-2 (2A & 2B)",
        operator_agency="European Space Agency (ESA Copernicus Open Access)",
        instrument="Multispectral Instrument (MSI)",
        spectral_band="Visible (B2, B3, B4), Red Edge (B5-B8A), SWIR (B11, B12)",
        spatial_resolution_m=10.0,
        temporal_resolution="5 days (sun-synchronous polar orbit)",
        meteorological_application="Land cover classification, surface albedo, field vegetative density (NDVI/EVI)",
        access_status="ACCESS_REQUIRED",
        coverage_area="Global terrestrial land surfaces and coastal waters",
        notes=(
            "ESA Copernicus Data Space Ecosystem requires authenticated OAuth2 client credentials for raw "
            "SAFE/JP2 raster downloading. Downstream agricultural yield models remain strictly gated."
        ),
    ),
]


VERIFIED_CATALOG_PUBLICATION_TIME = datetime(2026, 2, 1, 0, 0, tzinfo=timezone.utc)


def get_satellite_catalog() -> SatelliteCatalogResponse:
    """Returns the verified satellite Earth Observation catalog.
    
    SCIENTIFIC INTEGRITY (SG-10):
    Metadata and orbital parameters represent verified static registry specifications.
    Retrieval timestamp reflects catalog publication date, not a simulated live satellite frame capture.
    """
    provenance = Provenance(
        provider="ISRO MOSDAC / ESA Copernicus Open Access Hub",
        retrieved_at=VERIFIED_CATALOG_PUBLICATION_TIME,
        attribution_url="https://www.mosdac.gov.in / https://dataspace.copernicus.eu/",
        disclaimer=(
            "Satellite Earth Observation metadata reflects authentic orbital schedules and sensor specifications. "
            "Catalog mode is REGISTRY_METADATA_ONLY. Direct HDF5/SAFE raster downloading requires authenticated agency credentials. "
            "Cloud-top thermal observations and land surface reflectance do not replace ground-level radar or rain-gauge measurements."
        ),
    )

    return SatelliteCatalogResponse(
        catalog_source="ISRO Meteorological & Oceanographic Satellite Data Archival Centre & Copernicus Data Space",
        active_products=SATELLITE_CATALOG,
        scientific_disclaimer=(
            "Satellite observations provide synoptic cloud-system and land-cover context. Direct rainfall intensity estimation "
            "requires calibrated ground radar or rain gauges; cloud imagery alone cannot guarantee surface precipitation."
        ),
        provenance=provenance,
    )
