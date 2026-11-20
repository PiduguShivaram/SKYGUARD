"""Database connection and session management."""
from typing import AsyncGenerator
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import declarative_base

from services.api.app.config import settings

# Create async engine with foreign keys enabled for SQLite
connect_args = {"check_same_thread": False} if settings.DATABASE_URL.startswith("sqlite") else {}

engine = create_async_engine(
    settings.DATABASE_URL,
    echo=settings.DEBUG,
    connect_args=connect_args,
)

async_session = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)
AsyncSessionLocal = async_session

Base = declarative_base()


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """Dependency that provides an asynchronous database session."""
    async with async_session() as session:
        try:
            yield session
        finally:
            await session.close()


async def init_db() -> None:
    """Initialize database tables asynchronously with automatic column migration for SQLite."""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

        def migrate_columns(sync_conn):
            try:
                from sqlalchemy import text

                # Table: alert_records
                res = sync_conn.execute(text("PRAGMA table_info(alert_records)"))
                existing_alert_cols = {row[1] for row in res.fetchall()}
                new_alert_cols = [
                    ("urgency", "VARCHAR(32)"),
                    ("certainty", "VARCHAR(32)"),
                    ("local_color_code", "VARCHAR(64)"),
                    ("language", "VARCHAR(16)"),
                    ("msg_type", "VARCHAR(32)"),
                    ("polygons_json", "TEXT"),
                    ("geocodes_json", "TEXT"),
                    ("is_country_wide", "BOOLEAN DEFAULT 0"),
                    ("geographic_status", "VARCHAR(32) DEFAULT 'LOCATION_VERIFIED'"),
                ]
                for col_name, col_type in new_alert_cols:
                    if col_name not in existing_alert_cols:
                        sync_conn.execute(text(f"ALTER TABLE alert_records ADD COLUMN {col_name} {col_type}"))

                # Table: push_subscriptions
                res_sub = sync_conn.execute(text("PRAGMA table_info(push_subscriptions)"))
                existing_sub_cols = {row[1] for row in res_sub.fetchall()}
                new_sub_cols = [
                    ("wants_country_wide", "BOOLEAN DEFAULT 0"),
                    ("last_seen_at", "DATETIME"),
                ]
                for col_name, col_type in new_sub_cols:
                    if col_name not in existing_sub_cols:
                        sync_conn.execute(text(f"ALTER TABLE push_subscriptions ADD COLUMN {col_name} {col_type}"))

                # Table: notification_deliveries
                res_deliv = sync_conn.execute(text("PRAGMA table_info(notification_deliveries)"))
                existing_deliv_cols = {row[1] for row in res_deliv.fetchall()}
                new_deliv_cols = [
                    ("retry_count", "INTEGER DEFAULT 0"),
                    ("next_retry_at", "DATETIME"),
                    ("gateway_receipt", "VARCHAR(128)"),
                ]
                for col_name, col_type in new_deliv_cols:
                    if col_name not in existing_deliv_cols:
                        sync_conn.execute(text(f"ALTER TABLE notification_deliveries ADD COLUMN {col_name} {col_type}"))
            except Exception:
                pass

        await conn.run_sync(migrate_columns)
