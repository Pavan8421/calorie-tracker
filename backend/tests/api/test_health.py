"""Health endpoint tests."""

from __future__ import annotations

from unittest.mock import AsyncMock, patch

import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_health_ok(client: AsyncClient) -> None:
    with (
        patch("app.api.health.ping_database", new=AsyncMock(return_value=True)),
        patch("app.api.health.ping_redis", new=AsyncMock(return_value=True)),
    ):
        response = await client.get("/health")

    assert response.status_code == 200
    assert response.json() == {
        "status": "ok",
        "database": "ok",
        "redis": "ok",
    }


@pytest.mark.asyncio
async def test_health_degraded_when_redis_down(client: AsyncClient) -> None:
    with (
        patch("app.api.health.ping_database", new=AsyncMock(return_value=True)),
        patch("app.api.health.ping_redis", new=AsyncMock(return_value=False)),
    ):
        response = await client.get("/health")

    assert response.status_code == 503
    body = response.json()
    assert body["status"] == "degraded"
    assert body["database"] == "ok"
    assert body["redis"] == "error"
