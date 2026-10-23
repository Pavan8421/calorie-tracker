"""Redis connection pool."""

from __future__ import annotations

from redis.asyncio import Redis

from app.core.config import get_settings

_redis: Redis | None = None


async def init_redis() -> Redis:
    global _redis
    settings = get_settings()
    _redis = Redis.from_url(settings.redis_url, decode_responses=True)
    return _redis


async def close_redis() -> None:
    global _redis
    if _redis is not None:
        await _redis.aclose()
        _redis = None


def get_redis() -> Redis:
    if _redis is None:
        raise RuntimeError("Redis has not been initialized")
    return _redis


async def ping_redis() -> bool:
    try:
        client = get_redis()
        return bool(await client.ping())
    except Exception:
        return False
