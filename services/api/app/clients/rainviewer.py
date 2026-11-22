"""RainViewer Doppler weather radar composite mosaic client."""
from datetime import datetime, timezone
import logging
from typing import List, Optional, Tuple
import httpx
from services.api.app.schemas.nowcast import RadarFrame

logger = logging.getLogger(__name__)

RAINVIEWER_MAPS_URL = "https://api.rainviewer.com/public/weather-maps.json"


async def fetch_radar_frames(
    http_client: Optional[httpx.AsyncClient] = None,
) -> Tuple[str, List[RadarFrame]]:
    """Retrieves the latest authentic Doppler radar composite frames from RainViewer."""
    should_close = False
    if http_client is None:
        http_client = httpx.AsyncClient(timeout=8.0)
        should_close = True

    try:
        resp = await http_client.get(RAINVIEWER_MAPS_URL)
        if resp.status_code != 200:
            logger.warning("RainViewer maps query returned status %s", resp.status_code)
            return "https://tilecache.rainviewer.com", []

        data = resp.json()
        host = data.get("host") or "https://tilecache.rainviewer.com"
        radar = data.get("radar", {})
        past = radar.get("past", [])
        nowcast = radar.get("nowcast", [])

        frames: List[RadarFrame] = []

        # Process past observed radar frames
        for f in past[-10:]:
            ts = f.get("time")
            path = f.get("path")
            if ts and path:
                iso_str = datetime.fromtimestamp(ts, tz=timezone.utc).isoformat()
                frames.append(
                    RadarFrame(
                        timestamp=ts,
                        iso_time=iso_str,
                        tile_path=path,
                        frame_type="past",
                    )
                )

        # Process radar-extrapolated nowcast frames if available
        for f in nowcast[:4]:
            ts = f.get("time")
            path = f.get("path")
            if ts and path:
                iso_str = datetime.fromtimestamp(ts, tz=timezone.utc).isoformat()
                frames.append(
                    RadarFrame(
                        timestamp=ts,
                        iso_time=iso_str,
                        tile_path=path,
                        frame_type="nowcast",
                    )
                )

        return host, frames

    except Exception as exc:
        logger.warning("Error querying RainViewer radar frames: %s", exc)
        return "https://tilecache.rainviewer.com", []
    finally:
        if should_close:
            await http_client.aclose()
