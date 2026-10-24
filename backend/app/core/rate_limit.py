"""Fixed-window rate limiting via Redis (fails open if Redis is down)."""

from __future__ import annotations

import logging
import time

from app.core.errors import RateLimitError
from app.core.redis import get_redis

logger = logging.getLogger(__name__)


async def check_rate_limit(
    scope: str,
    subject: str,
    *,
    limit: int,
    window_seconds: int,
    message: str = "Too many requests. Please try again later.",
) -> None:
    """Increment a fixed-window counter; raise RateLimitError when over the limit.

    If Redis is unavailable, logs a warning and allows the request (fail open).
    """
    window = int(time.time()) // window_seconds
    redis_key = f"ratelimit:{scope}:{subject}:{window}"

    try:
        client = get_redis()
        count = await client.incr(redis_key)
        if count == 1:
            await client.expire(redis_key, window_seconds)
        if count > limit:
            ttl = await client.ttl(redis_key)
            retry_after = int(ttl) if ttl and ttl > 0 else window_seconds
            raise RateLimitError(message=message, retry_after=retry_after)
    except RateLimitError:
        raise
    except Exception:
        logger.warning("Rate limiter failed open for scope=%s", scope, exc_info=True)
