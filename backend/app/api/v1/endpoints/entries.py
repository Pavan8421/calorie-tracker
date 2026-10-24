"""Food entry endpoints."""

from __future__ import annotations

import uuid
from typing import Annotated

from fastapi import APIRouter, Depends

from app.api.deps import CurrentUser, DbSession, get_pagination_params
from app.schemas.common import Page, PaginationParams
from app.schemas.entry import FoodEntryCreate, FoodEntryRead, FoodEntryUpdate
from app.services import entry_service

router = APIRouter()


@router.post("", response_model=FoodEntryRead, status_code=201)
async def create_entry(
    body: FoodEntryCreate,
    current_user: CurrentUser,
    session: DbSession,
) -> FoodEntryRead:
    return await entry_service.create_entry(session, current_user, body)


@router.get("/recent", response_model=Page[FoodEntryRead])
async def list_recent_entries(
    current_user: CurrentUser,
    session: DbSession,
    params: Annotated[PaginationParams, Depends(get_pagination_params)],
) -> Page[FoodEntryRead]:
    return await entry_service.list_recent(session, current_user, params)


@router.get("/{entry_id}", response_model=FoodEntryRead)
async def get_entry(
    entry_id: uuid.UUID,
    current_user: CurrentUser,
    session: DbSession,
) -> FoodEntryRead:
    return await entry_service.get_entry(session, current_user, entry_id)


@router.patch("/{entry_id}", response_model=FoodEntryRead)
async def update_entry(
    entry_id: uuid.UUID,
    body: FoodEntryUpdate,
    current_user: CurrentUser,
    session: DbSession,
) -> FoodEntryRead:
    return await entry_service.update_entry(session, current_user, entry_id, body)


@router.delete("/{entry_id}", status_code=204)
async def delete_entry(
    entry_id: uuid.UUID,
    current_user: CurrentUser,
    session: DbSession,
) -> None:
    await entry_service.delete_entry(session, current_user, entry_id)
