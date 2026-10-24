"""Weight log persistence."""

from __future__ import annotations

import uuid
from datetime import date
from decimal import Decimal

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.weight_log import WeightLog
from app.repositories.base import paginate
from app.schemas.common import Page, PaginationParams


async def get_by_id(session: AsyncSession, log_id: uuid.UUID) -> WeightLog | None:
    result = await session.execute(select(WeightLog).where(WeightLog.id == log_id))
    return result.scalar_one_or_none()


async def get_by_user_and_date(
    session: AsyncSession,
    user_id: uuid.UUID,
    logged_on: date,
) -> WeightLog | None:
    result = await session.execute(
        select(WeightLog).where(
            WeightLog.user_id == user_id,
            WeightLog.logged_on == logged_on,
        )
    )
    return result.scalar_one_or_none()


async def upsert(
    session: AsyncSession,
    *,
    user_id: uuid.UUID,
    logged_on: date,
    weight_kg: Decimal,
) -> WeightLog:
    existing = await get_by_user_and_date(session, user_id, logged_on)
    if existing is not None:
        existing.weight_kg = weight_kg
        session.add(existing)
        await session.flush()
        await session.refresh(existing)
        return existing

    log = WeightLog(user_id=user_id, logged_on=logged_on, weight_kg=weight_kg)
    session.add(log)
    await session.flush()
    await session.refresh(log)
    return log


async def list_for_user(
    session: AsyncSession,
    user_id: uuid.UUID,
    params: PaginationParams,
    *,
    start_date: date | None = None,
    end_date: date | None = None,
) -> Page[WeightLog]:
    stmt = select(WeightLog).where(WeightLog.user_id == user_id)
    if start_date is not None:
        stmt = stmt.where(WeightLog.logged_on >= start_date)
    if end_date is not None:
        stmt = stmt.where(WeightLog.logged_on <= end_date)
    stmt = stmt.order_by(WeightLog.logged_on.desc(), WeightLog.id.desc())
    return await paginate(session, stmt, params)


async def first_on_or_after(
    session: AsyncSession,
    user_id: uuid.UUID,
    on_or_after: date,
) -> WeightLog | None:
    stmt = (
        select(WeightLog)
        .where(WeightLog.user_id == user_id, WeightLog.logged_on >= on_or_after)
        .order_by(WeightLog.logged_on.asc(), WeightLog.id.asc())
        .limit(1)
    )
    result = await session.execute(stmt)
    return result.scalar_one_or_none()


async def latest(session: AsyncSession, user_id: uuid.UUID) -> WeightLog | None:
    stmt = (
        select(WeightLog)
        .where(WeightLog.user_id == user_id)
        .order_by(WeightLog.logged_on.desc(), WeightLog.id.desc())
        .limit(1)
    )
    result = await session.execute(stmt)
    return result.scalar_one_or_none()


async def delete_log(session: AsyncSession, log: WeightLog) -> None:
    await session.delete(log)
    await session.flush()
