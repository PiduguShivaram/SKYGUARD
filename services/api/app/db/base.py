import os
from typing import AsyncGenerator
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import declarative_base

from services.api.app.config import settings

# In serverless environments (Vercel / Lambda), local relative SQLite paths (./skyguard.db)
# reside on a read-only filesystem. Redirect to /tmp if running under Vercel or Lambda.
db_url = settings.DATABASE_URL
if os.environ.get("VERCEL") or os.environ.get("AWS_LAMBDA_FUNCTION_NAME"):
    if "sqlite" in db_url and not db_url.startswith("sqlite+aiosqlite:////tmp/"):
        db_url = "sqlite+aiosqlite:////tmp/skyguard.db"

# Create async engine with foreign keys enabled for SQLite
connect_args = {"check_same_thread": False} if db_url.startswith("sqlite") else {}

engine = create_async_engine(
    db_url,
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
    try:
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
                        ("status", "VARCHAR(32) DEFAULT 'Actual'"),
                        ("scope", "VARCHAR(32) DEFAULT 'Public'"),
                        ("references", "TEXT"),
                        ("polygons_json", "TEXT"),
                        ("circles_json", "TEXT"),
                        ("geocodes_json", "TEXT"),
                        ("is_country_wide", "BOOLEAN DEFAULT 0"),
                        ("geographic_status", "VARCHAR(32) DEFAULT 'LOCATION_VERIFIED'"),
                    ]
                    for col_name, col_type in new_alert_cols:
                        if col_name not in existing_alert_cols:
                            sync_conn.execute(text(f'ALTER TABLE alert_records ADD COLUMN "{col_name}" {col_type}'))

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
                        ("locked_by", "VARCHAR(64)"),
                        ("locked_at", "DATETIME"),
                    ]
                    for col_name, col_type in new_deliv_cols:
                        if col_name not in existing_deliv_cols:
                            sync_conn.execute(text(f"ALTER TABLE notification_deliveries ADD COLUMN {col_name} {col_type}"))

                    # Table: telegram_subscriptions
                    res_tel = sync_conn.execute(text("PRAGMA table_info(telegram_subscriptions)"))
                    existing_tel_cols = {row[1] for row in res_tel.fetchall()}
                    new_tel_cols = [
                        ("auth_token", "VARCHAR(64)"),
                        ("is_verified", "BOOLEAN DEFAULT 0"),
                        ("verification_code", "VARCHAR(16)"),
                        ("verification_code_expires_at", "DATETIME"),
                        ("verification_attempts", "INTEGER DEFAULT 0"),
                    ]
                    for col_name, col_type in new_tel_cols:
                        if col_name not in existing_tel_cols:
                            sync_conn.execute(text(f"ALTER TABLE telegram_subscriptions ADD COLUMN {col_name} {col_type}"))

                    # Table: telegram_deliveries
                    res_tdeliv = sync_conn.execute(text("PRAGMA table_info(telegram_deliveries)"))
                    existing_tdeliv_cols = {row[1] for row in res_tdeliv.fetchall()}
                    new_tdeliv_cols = [
                        ("locked_by", "VARCHAR(64)"),
                        ("locked_at", "DATETIME"),
                    ]
                    for col_name, col_type in new_tdeliv_cols:
                        if col_name not in existing_tdeliv_cols:
                            sync_conn.execute(text(f"ALTER TABLE telegram_deliveries ADD COLUMN {col_name} {col_type}"))
                except Exception:
                    pass

            await conn.run_sync(migrate_columns)
    except Exception as exc:
        print(f"[Database Init Warning] Table initialization deferred: {exc}")
