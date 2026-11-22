"""Production Background Alert Worker.

Continuously and safely executes background alert synchronization, Point-in-Polygon spatial
matching, push notification dispatching, and exponential backoff retry cycles for transient failures.
"""
import asyncio
import logging
import signal
import sys
from datetime import datetime, timezone

from services.api.app.config import settings
from services.api.app.db.base import AsyncSessionLocal, init_db
from services.api.app.services.alert_matcher import (
    process_and_dispatch_active_alerts,
    retry_transient_deliveries,
)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] [AlertWorker] %(message)s",
)
logger = logging.getLogger("SkyGuardAlertWorker")

_shutdown_event = asyncio.Event()


def handle_stop_signals():
    logger.info("Termination signal received. Scheduling graceful shutdown...")
    _shutdown_event.set()


async def run_worker_cycle() -> None:
    """Execute one synchronization, spatial matching, dispatch, and retry cycle."""
    async with AsyncSessionLocal() as db:
        try:
            logger.info("Executing alert sync and spatial dispatch pass...")
            dispatch_stats = await process_and_dispatch_active_alerts(db)
            logger.info(f"Dispatch pass complete: {dispatch_stats}")
        except Exception as exc:
            logger.error(f"Error during alert dispatch pass: {exc}", exc_info=True)
            await db.rollback()

        try:
            logger.info("Executing transient delivery retry pass...")
            retry_stats = await retry_transient_deliveries(db)
            logger.info(f"Retry pass complete: {retry_stats}")
        except Exception as exc:
            logger.error(f"Error during delivery retry pass: {exc}", exc_info=True)


async def main():
    """Main worker loop running on interval."""
    logger.info("Starting SkyGuard Production Alert Worker...")
    await init_db()

    # Register OS signals
    loop = asyncio.get_running_loop()
    for sig in (signal.SIGINT, signal.SIGTERM):
        try:
            loop.add_signal_handler(sig, handle_stop_signals)
        except NotImplementedError:
            # Signal handling on Windows event loops
            pass

    poll_interval_seconds = 180  # 3 minutes

    while not _shutdown_event.is_set():
        cycle_start = datetime.now(timezone.utc)
        logger.info(f"--- Alert Worker Cycle Started at {cycle_start.isoformat()} ---")

        await run_worker_cycle()

        cycle_end = datetime.now(timezone.utc)
        duration = (cycle_end - cycle_start).total_seconds()
        logger.info(f"Cycle completed in {duration:.2f}s. Sleeping for {poll_interval_seconds}s...")

        try:
            await asyncio.wait_for(_shutdown_event.wait(), timeout=poll_interval_seconds)
        except asyncio.TimeoutError:
            pass

    logger.info("SkyGuard Production Alert Worker gracefully terminated.")


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except (KeyboardInterrupt, SystemExit):
        logger.info("Worker process exited.")
