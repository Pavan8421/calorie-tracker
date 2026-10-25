"""Import job persistence."""

from __future__ import annotations

import uuid
from datetime import date
from decimal import Decimal
from typing import Any

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.enums import MealType
from app.models.food_entry import FoodEntry
from app.models.import_job import ImportJob
from app.repositories.base import paginate
from app.schemas.common import Page, PaginationParams


async def create_job(
    session: AsyncSession,
    *,
    user_id: uuid.UUID,
    filename: str,
    file_data: bytes,
    date_format: str,
) -> ImportJob:
    job = ImportJob(
        user_id=user_id,
        filename=filename,
        file_data=file_data,
        date_format=date_format,
    )
    session.add(job)
    await session.flush()
    await session.refresh(job)
    return job


async def get_job(session: AsyncSession, job_id: uuid.UUID) -> ImportJob | None:
    result = await session.execute(select(ImportJob).where(ImportJob.id == job_id))
    return result.scalar_one_or_none()


async def list_jobs(
    session: AsyncSession,
    user_id: uuid.UUID,
    params: PaginationParams,
) -> Page[ImportJob]:
    stmt = (
        select(ImportJob)
        .where(ImportJob.user_id == user_id)
        .order_by(ImportJob.created_at.desc(), ImportJob.id.desc())
    )
    return await paginate(session, stmt, params)


async def find_duplicate_entry(
    session: AsyncSession,
    *,
    user_id: uuid.UUID,
    consumed_on: date,
    meal_type: MealType,
    food_name: str,
    calories_kcal: Decimal,
) -> FoodEntry | None:
    stmt = (
        select(FoodEntry)
        .where(
            FoodEntry.user_id == user_id,
            FoodEntry.consumed_on == consumed_on,
            FoodEntry.meal_type == meal_type,
            func.lower(FoodEntry.food_name) == food_name.lower(),
            FoodEntry.calories_kcal == calories_kcal,
        )
        .limit(1)
    )
    result = await session.execute(stmt)
    return result.scalar_one_or_none()


async def update_job(session: AsyncSession, job: ImportJob, **fields: Any) -> ImportJob:
    for key, value in fields.items():
        setattr(job, key, value)
    session.add(job)
    await session.flush()
    await session.refresh(job)
    return job
