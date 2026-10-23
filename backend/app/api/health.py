"""Health check endpoint (mounted at /health, outside /api/v1)."""

from __future__ import annotations

from fastapi import APIRouter, status
from fastapi.responses import JSONResponse

from app.core.redis import ping_redis
from app.db.session import ping_database

router = APIRouter(tags=["health"])


@router.get("/health")
async def health() -> JSONResponse:
    database_ok = await ping_database()
    redis_ok = await ping_redis()
    payload = {
        "status": "ok" if database_ok and redis_ok else "degraded",
        "database": "ok" if database_ok else "error",
        "redis": "ok" if redis_ok else "error",
    }
    code = status.HTTP_200_OK if database_ok and redis_ok else status.HTTP_503_SERVICE_UNAVAILABLE
    return JSONResponse(status_code=code, content=payload)
