"""Weight log endpoints."""

from __future__ import annotations

import uuid
from datetime import date
from typing import Annotated

from fastapi import APIRouter, Depends, Query

from app.api.deps import CurrentUser, DbSession, get_pagination_params
from app.schemas.common import Page, PaginationParams
from app.schemas.weight_log import WeightLogCreate, WeightLogRead
from app.services import weight_log_service

router = APIRouter()


@router.post("", response_model=WeightLogRead, status_code=201)
async def create_weight_log(
    body: WeightLogCreate,
    current_user: CurrentUser,
    session: DbSession,
) -> WeightLogRead:
    return await weight_log_service.upsert_log(session, current_user, body)


@router.get("", response_model=Page[WeightLogRead])
async def list_weight_logs(
    current_user: CurrentUser,
    session: DbSession,
    params: Annotated[PaginationParams, Depends(get_pagination_params)],
    start_date: Annotated[date | None, Query()] = None,
    end_date: Annotated[date | None, Query()] = None,
) -> Page[WeightLogRead]:
    return await weight_log_service.list_logs(
        session,
        current_user,
        params,
        start_date=start_date,
        end_date=end_date,
    )


@router.delete("/{log_id}", status_code=204)
async def delete_weight_log(
    log_id: uuid.UUID,
    current_user: CurrentUser,
    session: DbSession,
) -> None:
    await weight_log_service.delete_log(session, current_user, log_id)
