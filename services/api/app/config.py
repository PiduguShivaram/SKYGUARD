"""Application settings and environment configurations."""
from typing import List, Optional
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    PROJECT_NAME: str = "SkyGuard API"
    VERSION: str = "1.0.0"
    DEBUG: bool = False
    
    # Server configuration
    HOST: str = "127.0.0.1"
    PORT: int = 8000
    CORS_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:8000",
        "http://127.0.0.1:8000"
    ]
    
    # Upstream APIs
    OPEN_METEO_BASE_URL: str = "https://api.open-meteo.com/v1"
    OPEN_METEO_GEOCODING_URL: str = "https://geocoding-api.open-meteo.com/v1"
    
    # Official IMD / NDMA
    IMD_API_KEY: str = ""
    IMD_API_BASE_URL: str = "https://api.imd.gov.in/public"
    
    # Earth Engine
    EE_SERVICE_ACCOUNT: str = ""
    EE_PRIVATE_KEY: str = ""

    # Database
    DATABASE_URL: str = "sqlite+aiosqlite:///./skyguard.db"

    # Web Push & VAPID Configuration
    VAPID_PUBLIC_KEY: str = ""
    VAPID_PRIVATE_KEY: str = ""
    VAPID_CLAIM_EMAIL: str = "mailto:alerts@skyguard.org"
    VAPID_KEY_FILE: str = "vapid_private.pem"

    # Security & Background Worker Controls
    INTERNAL_WORKER_KEY: Optional[str] = None
    MAX_DELIVERY_RETRIES: int = 3
    RETRY_BACKOFF_BASE_SECONDS: int = 60
    ALLOWED_PUSH_GATEWAYS: List[str] = [
        "fcm.googleapis.com",
        "push.services.mozilla.com",
        "updates.push.services.mozilla.com",
        "push.apple.com",
        "web.push.apple.com",
        "notify.windows.com",
    ]

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )


settings = Settings()
