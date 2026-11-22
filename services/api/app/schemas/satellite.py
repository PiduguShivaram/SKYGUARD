"""Satellite Earth Observation metadata schemas (ISRO MOSDAC & Copernicus Sentinel-2)."""
from typing import List, Optional
from pydantic import BaseModel, Field
from services.api.app.schemas.common import Provenance


class SatelliteProduct(BaseModel):
    product_id: str = Field(..., description="Unique product identifier (e.g. INSAT3DR_TIR1, S2_MSI_L2A)")
    satellite_name: str = Field(..., description="Satellite platform (e.g. INSAT-3DR, Sentinel-2A)")
    operator_agency: str = Field(..., description="Agency (ISRO / ESA Copernicus)")
    instrument: str = Field(..., description="Sensor (e.g. Imager, Multispectral Instrument MSI)")
    spectral_band: str = Field(..., description="Spectral band / product classification")
    spatial_resolution_m: float = Field(..., description="Ground spatial resolution in meters")
    temporal_resolution: str = Field(..., description="Temporal revisit cycle (e.g. 15 minutes, 5 days)")
    meteorological_application: str = Field(..., description="Atmospheric moisture, convective tracking, vegetation vigor")
    access_status: str = Field(
        ...,
        description="CATALOG_METADATA_ONLINE | ACCESS_REQUIRED | CALIBRATION_GATED",
    )
    coverage_area: str = Field(..., description="Regional/Global coverage description")
    notes: str = Field(..., description="Scientific limitations and zero-fabrication disclosures")


class SatelliteCatalogResponse(BaseModel):
    catalog_source: str
    active_products: List[SatelliteProduct]
    scientific_disclaimer: str
    provenance: Provenance
