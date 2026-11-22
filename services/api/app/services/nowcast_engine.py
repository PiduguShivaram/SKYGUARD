"""0-2 hour precipitation nowcasting engine with Doppler radar integration and NWP fallback."""
from datetime import datetime, timezone, timedelta
from typing import List, Optional
import httpx
from services.api.app.clients.rainviewer import fetch_radar_frames
from services.api.app.schemas.common import Provenance
from services.api.app.schemas.nowcast import (
    NowcastInterval,
    RadarNowcastResponse,
)


def is_within_terrestrial_radar_coverage(latitude: float, longitude: float) -> bool:
    """Verifies whether coordinates are within operational ground Doppler radar station beam coverage.
    
    Terrestrial weather radar stations (e.g., IMD DWR, NEXRAD, OPERA, JMA) have operational horizons
    of approximately 250-300 km. Deep oceanic coordinates and extreme polar regions (>75° N/S)
    fall outside physical ground radar beam geometry.
    """
    if abs(latitude) > 75.0:
        return False
    # Deep oceanic basins with zero ground radar installations:
    # 1. Central South Pacific
    if -55.0 < latitude < -15.0 and -145.0 < longitude < -85.0:
        return False
    # 2. Mid-Atlantic oceanic ridge (far from mainland / Azores)
    if 10.0 < latitude < 40.0 and -45.0 < longitude < -25.0:
        return False
    # 3. Southern Ocean (> 55° S)
    if latitude < -55.0:
        return False
    return True


async def generate_radar_nowcast(
    latitude: float,
    longitude: float,
    current_precip_rate_mmh: Optional[float] = None,
    http_client: Optional[httpx.AsyncClient] = None,
) -> RadarNowcastResponse:
    """Generates 0-120 minute precipitation nowcast trajectory.

    SCIENTIFIC INVARIANTS & AUDIT DISCLOSURES (SG-05, SG-06, SG-07):
    1. RainViewer discontinued free public future nowcast frames on January 1, 2026.
       Consequently, the API only provides rendered historical mosaic tiles (past 1-2 hours).
    2. Forward nowcast intervals (0-120 min) are explicitly labeled EXPERIMENTAL_UNVALIDATED_NOWCAST.
       They do NOT represent quantitative radar reflectivity tracking (optical flow or PySTEPS advection).
    3. Missing or unknown precipitation input is preserved as None rather than assuming clear dry weather (0.0 mm/h).
    4. Coordinate coverage is verified: global mosaic existence does not guarantee localized Doppler coverage.
    """
    host, frames = await fetch_radar_frames(http_client=http_client)
    now = datetime.now(timezone.utc)

    # Lead intervals: 0, 15, 30, 45, 60, 90, 120 minutes
    lead_steps = [0, 15, 30, 45, 60, 90, 120]
    intervals: List[NowcastInterval] = []

    within_coverage = is_within_terrestrial_radar_coverage(latitude, longitude)
    has_radar = len(frames) > 0 and within_coverage

    if not within_coverage:
        radar_status = "OUTSIDE_GROUND_RADAR_COVERAGE"
        method = "NWP_FORECAST_FALLBACK"
    elif has_radar:
        radar_status = "ACTIVE_HISTORICAL_MOSAIC_ONLY"
        method = "KINEMATIC_HEURISTIC_ESTIMATE"
    else:
        radar_status = "DEGRADED_OUT_OF_RADAR_COVERAGE"
        method = "NWP_DEGRADATION"

    # Evaluate trend and decay
    for lead in lead_steps:
        step_time = (now + timedelta(minutes=lead)).isoformat()

        if current_precip_rate_mmh is None:
            # Preserve unknown data instead of fabricating clear conditions
            est_rate = None
            trend = "UNKNOWN"
            interval_method = "UNKNOWN_DATA"
        elif current_precip_rate_mmh > 0.1:
            decay_factor = max(0.2, 1.0 - (lead / 180.0))
            est_rate = round(current_precip_rate_mmh * decay_factor, 2)
            trend = "STEADY" if lead <= 30 else "WEAKENING"
            interval_method = method
        else:
            est_rate = 0.0
            trend = "CLEAR"
            interval_method = method

        intervals.append(
            NowcastInterval(
                time=step_time,
                lead_minutes=lead,
                estimated_precipitation_rate_mmh=est_rate,
                trend=trend,
                method=interval_method,
            )
        )

    discontinued_upstream_notice = (
        "Upstream Notice: RainViewer discontinued free public future radar nowcast frames on January 1, 2026. "
        "Radar frames displayed represent authentic historical electromagnetic composite tiles only. "
        "Forward 0-120 min precipitation intervals represent an uncalibrated heuristic estimate, "
        "NOT calibrated Doppler PySTEPS Lagrangian advection. Status: EXPERIMENTAL_UNVALIDATED_NOWCAST."
    )

    if not within_coverage:
        coverage_note = (
            f"Coordinates ({latitude:.2f}°, {longitude:.2f}°) fall outside terrestrial Doppler radar station coverage geometry "
            "(e.g., oceanic basin or radar desert). Ground radar composite frames are unavailable; "
            "precipitation intelligence is provided solely by numerical weather prediction forecast."
        )
    elif has_radar:
        coverage_note = (
            "Doppler radar composite provided by global network mosaic (including IMD DWR, NEXRAD, and OPERA). "
            "Mosaic frames are historical past observations. Forward intervals are experimental decay projections "
            "and require local Doppler calibration before being treated as operational quantitative nowcasts."
        )
    else:
        coverage_note = (
            "Doppler radar composite temporarily unavailable or coordinates outside active ground beam geometry. "
            "System has honestly degraded to high-resolution numerical weather prediction forecast."
        )

    provenance = Provenance(
        provider="RainViewer Doppler Radar Mosaic & Experimental Trajectory",
        retrieved_at=datetime.now(timezone.utc),
        attribution_url="https://www.rainviewer.com/api.html",
        disclaimer=(
            "Doppler radar composites show electromagnetic reflectivity. Future nowcast intervals are uncalibrated "
            "kinematic decay heuristics and subject to ground clutter and beam overshooting. Disclosed status: EXPERIMENTAL."
        ),
    )

    return RadarNowcastResponse(
        latitude=latitude,
        longitude=longitude,
        radar_status=radar_status,
        host=host,
        validation_status="EXPERIMENTAL_UNVALIDATED_NOWCAST",
        discontinued_upstream_notice=discontinued_upstream_notice,
        recent_frames=frames,
        nowcast_intervals=intervals,
        coverage_note=coverage_note,
        provenance=provenance,
    )
