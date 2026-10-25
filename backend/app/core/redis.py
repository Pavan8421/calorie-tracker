"""Redis connection pool and arq job enqueue."""

from __future__ import annotations

import logging
import uuid
from collections.abc import Awaitable, Callable

from arq import create_pool
from arq.connections import ArqRedis, RedisSettings
from redis.asyncio import Redis

from app.core.config import get_settings

logger = logging.getLogger(__name__)

_redis: Redis | None = None
_arq_pool: ArqRedis | None = None
_enqueue_override: Callable[[uuid.UUID], Awaitable[None]] | None = None


async def init_redis() -> Redis:
    global _redis
    settings = get_settings()
    _redis = Redis.from_url(settings.redis_url, decode_responses=True)
    return _redis


async def init_arq_pool() -> ArqRedis:
    global _arq_pool
    settings = get_settings()
    _arq_pool = await create_pool(RedisSettings.from_dsn(settings.redis_url))
    return _arq_pool


async def close_redis() -> None:
    global _redis
    if _redis is not None:
        await _redis.aclose()
        _redis = None


async def close_arq_pool() -> None:
    global _arq_pool
    if _arq_pool is not None:
        await _arq_pool.aclose()
        _arq_pool = None


def get_redis() -> Redis:
    if _redis is None:
        raise RuntimeError("Redis has not been initialized")
    return _redis


def get_arq_pool() -> ArqRedis:
    if _arq_pool is None:
        raise RuntimeError("arq pool has not been initialized")
    return _arq_pool


def set_enqueue_override(
    override: Callable[[uuid.UUID], Awaitable[None]] | None,
) -> None:
    """Tests: replace Redis enqueue with an in-process hook."""
    global _enqueue_override
    _enqueue_override = override


async def enqueue_pdf_import(job_id: uuid.UUID) -> None:
    if _enqueue_override is not None:
        await _enqueue_override(job_id)
        return
    pool = get_arq_pool()
    await pool.enqueue_job("process_pdf_import", str(job_id))


async def ping_redis() -> bool:
    try:
        client = get_redis()
        return bool(await client.ping())
    except Exception:
        return False
