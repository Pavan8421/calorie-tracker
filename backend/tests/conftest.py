"""Shared pytest fixtures: test DB, fakeredis, HTTP client."""

from __future__ import annotations

import os
from collections.abc import AsyncIterator

import fakeredis.aioredis
import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.pool import NullPool

# Defaults for CI/local when env files are missing. Prefer 5433 (Docker Compose mapping).
os.environ.setdefault(
    "DATABASE_URL",
    "postgresql+asyncpg://calorie:calorie@localhost:5433/calorie_tracker",
)
os.environ.setdefault(
    "TEST_DATABASE_URL",
    "postgresql+asyncpg://calorie:calorie@localhost:5433/calorie_tracker_test",
)
os.environ.setdefault("REDIS_URL", "redis://localhost:6379/0")
os.environ.setdefault("JWT_SECRET", "test-secret-not-for-production")
os.environ.setdefault("ENVIRONMENT", "local")

from app.api.deps import get_db
from app.core import redis as redis_module
from app.core.config import get_settings
from app.core.redis import set_enqueue_override
from app.db.base import Base
from app.main import create_app
from app.models import (  # noqa: F401
    ChatConversation,
    ChatMessage,
    FoodEntry,
    Goal,
    ImportJob,
    RefreshToken,
    User,
    WeightLog,
)

get_settings.cache_clear()


def _test_database_url() -> str:
    settings = get_settings()
    if settings.test_database_url:
        return settings.test_database_url
    return settings.database_url.rsplit("/", 1)[0] + "/calorie_tracker_test"


@pytest.fixture
async def app():
    application = create_app()
    fake = fakeredis.aioredis.FakeRedis(decode_responses=True)
    redis_module._redis = fake

    async def _noop_enqueue(_job_id: object) -> None:
        return None

    set_enqueue_override(_noop_enqueue)
    yield application
    set_enqueue_override(None)
    await fake.aclose()
    redis_module._redis = None
    application.dependency_overrides.clear()


@pytest.fixture
async def client(app) -> AsyncIterator[AsyncClient]:
    """HTTP client with DB session wrapped in a rolled-back outer transaction."""
    engine = create_async_engine(_test_database_url(), poolclass=NullPool)

    async with engine.begin() as conn:
        # Recreate so additive model changes (new columns) appear in the test DB.
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)

    async with engine.connect() as connection:
        transaction = await connection.begin()
        session = AsyncSession(
            bind=connection,
            expire_on_commit=False,
            join_transaction_mode="create_savepoint",
        )

        async def override_get_db() -> AsyncIterator[AsyncSession]:
            yield session

        app.dependency_overrides[get_db] = override_get_db
        app.state.test_db_session = session

        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as ac:
            yield ac

        await session.close()
        await transaction.rollback()
        app.dependency_overrides.pop(get_db, None)
        if hasattr(app.state, "test_db_session"):
            delattr(app.state, "test_db_session")

    await engine.dispose()


@pytest.fixture
async def registered_user(client: AsyncClient) -> dict:
    payload = {
        "email": "alice@example.com",
        "password": "Secret123",
        "full_name": "Alice Example",
        "timezone": "Asia/Kolkata",
    }
    response = await client.post("/api/v1/auth/register", json=payload)
    assert response.status_code == 201, response.text
    return payload


@pytest.fixture
async def auth_headers(client: AsyncClient, registered_user: dict) -> dict[str, str]:
    response = await client.post(
        "/api/v1/auth/login",
        json={"email": registered_user["email"], "password": registered_user["password"]},
    )
    assert response.status_code == 200, response.text
    token = response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}
