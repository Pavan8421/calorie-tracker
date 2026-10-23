"""Shared pytest fixtures for Phase 0 foundation tests."""

from __future__ import annotations

import os
from collections.abc import AsyncIterator

import fakeredis.aioredis
import pytest
from httpx import ASGITransport, AsyncClient

# Ensure settings can load before importing the app.
os.environ.setdefault(
    "DATABASE_URL",
    "postgresql+asyncpg://calorie:calorie@localhost:5432/calorie_tracker",
)
os.environ.setdefault(
    "TEST_DATABASE_URL",
    "postgresql+asyncpg://calorie:calorie@localhost:5432/calorie_tracker_test",
)
os.environ.setdefault("REDIS_URL", "redis://localhost:6379/0")
os.environ.setdefault("JWT_SECRET", "test-secret-not-for-production")
os.environ.setdefault("ENVIRONMENT", "local")

from app.core import redis as redis_module
from app.core.config import get_settings
from app.main import create_app

get_settings.cache_clear()


@pytest.fixture
async def app():
    application = create_app()
    fake = fakeredis.aioredis.FakeRedis(decode_responses=True)
    redis_module._redis = fake
    yield application
    await fake.aclose()
    redis_module._redis = None


@pytest.fixture
async def client(app) -> AsyncIterator[AsyncClient]:
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac
