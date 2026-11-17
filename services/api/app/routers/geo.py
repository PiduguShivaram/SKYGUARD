"""Geocoding search router."""
from fastapi import APIRouter, HTTPException, Query
from services.api.app.clients.open_meteo import open_meteo_client
from services.api.app.schemas.common import Provenance
from services.api.app.schemas.geo import GeocodingResponse

router = APIRouter(prefix="/api/v1/geo", tags=["Geocoding"])


@router.get("/search", response_model=GeocodingResponse)
async def search_places(
    q: str = Query(..., min_length=2, description="Place or city search query"),
    count: int = Query(8, ge=1, le=20, description="Max results"),
):
    results = await open_meteo_client.search_locations(query=q, count=count)
    provenance = Provenance(
        provider="Open-Meteo Geocoding API",
        attribution_url="https://open-meteo.com/en/docs/geocoding-api",
        disclaimer="Geocoding data provided by Open-Meteo via OpenStreetMap and GeoNames data.",
    )
    return GeocodingResponse(
        query=q,
        count=len(results),
        results=results,
        provenance=provenance,
    )
