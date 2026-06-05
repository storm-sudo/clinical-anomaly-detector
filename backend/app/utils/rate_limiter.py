from __future__ import annotations

import logging
from typing import Optional

import redis.asyncio as aioredis
from fastapi import HTTPException, status

logger = logging.getLogger(__name__)


async def check_analysis_rate_limit(
    user_id: str,
    redis_client: aioredis.Redis,
    max_per_hour: int = 5,
) -> None:
    """Increment the per-user analysis counter and raise 429 if the limit is exceeded.

    Uses a Redis key with a 1-hour TTL. Safe to call even if Redis is unavailable —
    it logs the error and allows the request through (fail-open behaviour).
    """
    key = f"rate_limit:analysis:{user_id}"
    try:
        count = await redis_client.incr(key)
        if count == 1:
            # First request in this window — set 1-hour expiry
            await redis_client.expire(key, 3600)
        if count > max_per_hour:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=(
                    f"Analysis rate limit exceeded. "
                    f"Maximum {max_per_hour} analyses per hour allowed."
                ),
                headers={"Retry-After": "3600"},
            )
    except HTTPException:
        raise
    except Exception as exc:
        # Redis unavailable — log and allow the request through
        logger.warning("Rate limiter unavailable (Redis error): %s", exc)


async def get_remaining_analyses(
    user_id: str,
    redis_client: aioredis.Redis,
    max_per_hour: int = 5,
) -> dict[str, int]:
    """Return current count and remaining analyses for informational headers."""
    key = f"rate_limit:analysis:{user_id}"
    try:
        raw = await redis_client.get(key)
        current = int(raw) if raw else 0
    except Exception:
        current = 0
    return {
        "limit": max_per_hour,
        "used": current,
        "remaining": max(0, max_per_hour - current),
    }
