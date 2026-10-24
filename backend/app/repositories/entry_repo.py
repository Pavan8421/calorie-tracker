"""Food entry persistence."""

from __future__ import annotations

import uuid

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.food_entry import FoodEntry
from app.repositories.base import paginate
from app.schemas.common import Page, PaginationParams


async def get_by_id(session: AsyncSession, entry_id: uuid.UUID) -> FoodEntry | None:
    result = await session.execute(select(FoodEntry).where(FoodEntry.id == entry_id))
    return result.scalar_one_or_none()


async def create_entry(session: AsyncSession, **fields: object) -> FoodEntry:
    entry = FoodEntry(**fields)
    session.add(entry)
    await session.flush()
    await session.refresh(entry)
    return entry


async def update_entry(session: AsyncSession, entry: FoodEntry, **fields: object) -> FoodEntry:
    for key, value in fields.items():
        setattr(entry, key, value)
    session.add(entry)
    await session.flush()
    await session.refresh(entry)
    return entry


async def delete_entry(session: AsyncSession, entry: FoodEntry) -> None:
    await session.delete(entry)
    await session.flush()


async def list_recent_foods(
    session: AsyncSession,
    user_id: uuid.UUID,
    params: PaginationParams,
) -> Page[FoodEntry]:
    """Most recent entry per distinct food name (case-insensitive), newest first."""
    ranked = (
        select(
            FoodEntry.id.label("id"),
            func.row_number()
            .over(
                partition_by=func.lower(FoodEntry.food_name),
                order_by=(FoodEntry.consumed_at.desc(), FoodEntry.id.desc()),
            )
            .label("rn"),
        )
        .where(FoodEntry.user_id == user_id)
        .subquery()
    )
    stmt = (
        select(FoodEntry)
        .join(ranked, FoodEntry.id == ranked.c.id)
        .where(ranked.c.rn == 1)
        .order_by(FoodEntry.consumed_at.desc(), FoodEntry.id.desc())
    )
    return await paginate(session, stmt, params)
