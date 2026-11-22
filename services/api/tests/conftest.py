"""Pytest configuration and global test fixtures."""
import pytest
from services.api.app.config import settings
from services.api.app.db.base import init_db

settings.APP_ENV = "test"
settings.TELEGRAM_BOT_TOKEN = "0000000000:AAEMockBotTokenPlaceholderForTests_XYZ123"


@pytest.fixture(autouse=True)
async def initialize_db_for_tests():
    """Ensure database tables and columns are initialized before running tests."""
    await init_db()
