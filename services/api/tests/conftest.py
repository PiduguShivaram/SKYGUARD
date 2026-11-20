"""Pytest configuration and global test fixtures."""
import pytest
from services.api.app.db.base import init_db


@pytest.fixture(autouse=True)
async def initialize_db_for_tests():
    """Ensure database tables and columns are initialized before running tests."""
    await init_db()
