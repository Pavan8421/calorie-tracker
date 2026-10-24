"""Goal persistence."""

from __future__ import annotations

import uuid
from datetime import date

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.goal import Goal
from app.repositories.base import paginate
from app.schemas.common import Page, PaginationParams


async def get_by_id(session: AsyncSession, goal_id: uuid.UUID) -> Goal | None:
    result = await session.execute(select(Goal).where(Goal.id == goal_id))
    return result.scalar_one_or_none()


async def get_current(
    session: AsyncSession,
    user_id: uuid.UUID,
    today: date,
) -> Goal | None:
    stmt = (
        select(Goal)
        .where(Goal.user_id == user_id, Goal.effective_from <= today)
        .order_by(Goal.effective_from.desc())
        .limit(1)
    )
    result = await session.execute(stmt)
    return result.scalar_one_or_none()


async def get_by_user_and_effective_from(
    session: AsyncSession,
    user_id: uuid.UUID,
    effective_from: date,
) -> Goal | None:
    result = await session.execute(
        select(Goal).where(
            Goal.user_id == user_id,
            Goal.effective_from == effective_from,
        )
    )
    return result.scalar_one_or_none()


async def list_for_user(
    session: AsyncSession,
    user_id: uuid.UUID,
    params: PaginationParams,
) -> Page[Goal]:
    stmt = (
        select(Goal)
        .where(Goal.user_id == user_id)
        .order_by(Goal.effective_from.desc(), Goal.id.desc())
    )
    return await paginate(session, stmt, params)


async def list_covering_range(
    session: AsyncSession,
    user_id: uuid.UUID,
    start: date,
    end: date,
) -> list[Goal]:
    """All versions with effective_from <= end, ordered ascending (for day mapping)."""
    stmt = (
        select(Goal)
        .where(Goal.user_id == user_id, Goal.effective_from <= end)
        .order_by(Goal.effective_from.asc())
    )
    result = await session.execute(stmt)
    return list(result.scalars().all())


async def create_goal(session: AsyncSession, **fields: object) -> Goal:
    goal = Goal(**fields)
    session.add(goal)
    await session.flush()
    await session.refresh(goal)
    return goal


async def update_goal(session: AsyncSession, goal: Goal, **fields: object) -> Goal:
    for key, value in fields.items():
        setattr(goal, key, value)
    session.add(goal)
    await session.flush()
    await session.refresh(goal)
    return goal


async def delete_goal(session: AsyncSession, goal: Goal) -> None:
    await session.delete(goal)
    await session.flush()
