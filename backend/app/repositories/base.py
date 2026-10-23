"""Shared repository helpers."""

from __future__ import annotations

from typing import Any

from sqlalchemy import Select, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.schemas.common import Page, PaginationParams


async def paginate[T](
    session: AsyncSession,
    stmt: Select[Any],
    params: PaginationParams,
) -> Page[T]:
    """Run a SELECT with LIMIT/OFFSET and a matching COUNT(*) for total."""
    count_stmt = select(func.count()).select_from(stmt.order_by(None).subquery())
    total = int((await session.execute(count_stmt)).scalar_one())

    result = await session.execute(stmt.offset(params.offset).limit(params.page_size))
    items: list[T] = list(result.scalars().all())
    return Page.create(items=items, total=total, params=params)
