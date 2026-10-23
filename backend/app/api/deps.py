"""Shared FastAPI dependencies."""

from __future__ import annotations

from collections.abc import AsyncGenerator

from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db as _get_db
from app.schemas.common import PaginationParams, get_pagination

# Re-export for convenience in endpoint modules.
get_db = _get_db
get_pagination_params = get_pagination

__all__ = ["AsyncSession", "AsyncGenerator", "get_db", "get_pagination_params", "PaginationParams"]
