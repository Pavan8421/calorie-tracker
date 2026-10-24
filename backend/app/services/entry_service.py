"""Food entry business logic."""

from __future__ import annotations

import uuid
from datetime import UTC, datetime

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import NotFoundError
from app.core.time import to_local_date
from app.models.enums import EntrySource
from app.models.user import User
from app.repositories import entry_repo
from app.schemas.common import Page, PaginationParams
from app.schemas.entry import FoodEntryCreate, FoodEntryRead, FoodEntryUpdate


def _to_read(entry: object) -> FoodEntryRead:
    return FoodEntryRead.model_validate(entry)


async def create_entry(
    session: AsyncSession,
    user: User,
    data: FoodEntryCreate,
) -> FoodEntryRead:
    consumed_at = data.consumed_at or datetime.now(UTC)
    if consumed_at.tzinfo is None:
        consumed_at = consumed_at.replace(tzinfo=UTC)

    entry = await entry_repo.create_entry(
        session,
        user_id=user.id,
        meal_type=data.meal_type,
        food_name=data.food_name,
        quantity=data.quantity,
        unit=data.unit,
        consumed_at=consumed_at,
        consumed_on=to_local_date(consumed_at, user.timezone),
        calories_kcal=data.calories_kcal,
        protein_g=data.protein_g,
        carbs_g=data.carbs_g,
        fat_g=data.fat_g,
        fiber_g=data.fiber_g,
        sugar_g=data.sugar_g,
        micronutrients=data.micronutrients,
        source=EntrySource(data.source),
        notes=data.notes,
    )
    await session.commit()
    await session.refresh(entry)
    return _to_read(entry)


async def get_entry(
    session: AsyncSession,
    user: User,
    entry_id: uuid.UUID,
) -> FoodEntryRead:
    entry = await entry_repo.get_by_id(session, entry_id)
    if entry is None or entry.user_id != user.id:
        raise NotFoundError(code="ENTRY_NOT_FOUND", message="Entry not found")
    return _to_read(entry)


async def update_entry(
    session: AsyncSession,
    user: User,
    entry_id: uuid.UUID,
    data: FoodEntryUpdate,
) -> FoodEntryRead:
    entry = await entry_repo.get_by_id(session, entry_id)
    if entry is None or entry.user_id != user.id:
        raise NotFoundError(code="ENTRY_NOT_FOUND", message="Entry not found")

    fields = data.model_dump(exclude_unset=True)
    if "source" in fields and fields["source"] is not None:
        fields["source"] = EntrySource(fields["source"])

    if "consumed_at" in fields:
        consumed_at = fields["consumed_at"]
        if consumed_at.tzinfo is None:
            consumed_at = consumed_at.replace(tzinfo=UTC)
            fields["consumed_at"] = consumed_at
        fields["consumed_on"] = to_local_date(consumed_at, user.timezone)

    entry = await entry_repo.update_entry(session, entry, **fields)
    await session.commit()
    await session.refresh(entry)
    return _to_read(entry)


async def delete_entry(
    session: AsyncSession,
    user: User,
    entry_id: uuid.UUID,
) -> None:
    entry = await entry_repo.get_by_id(session, entry_id)
    if entry is None or entry.user_id != user.id:
        raise NotFoundError(code="ENTRY_NOT_FOUND", message="Entry not found")
    await entry_repo.delete_entry(session, entry)
    await session.commit()


async def list_recent(
    session: AsyncSession,
    user: User,
    params: PaginationParams,
) -> Page[FoodEntryRead]:
    page = await entry_repo.list_recent_foods(session, user.id, params)
    return Page.create(
        items=[_to_read(item) for item in page.items],
        total=page.total,
        params=params,
    )
