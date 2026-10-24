"""Goal endpoints."""

from __future__ import annotations

import uuid
from typing import Annotated

from fastapi import APIRouter, Depends

from app.api.deps import CurrentUser, DbSession, get_pagination_params
from app.schemas.common import Page, PaginationParams
from app.schemas.goal import CurrentGoalResponse, GoalCreate, GoalRead, GoalUpdate
from app.services import goal_service

router = APIRouter()


@router.get("/current", response_model=CurrentGoalResponse)
async def get_current_goal(
    current_user: CurrentUser,
    session: DbSession,
) -> CurrentGoalResponse:
    return await goal_service.get_current(session, current_user)


@router.get("", response_model=Page[GoalRead])
async def list_goals(
    current_user: CurrentUser,
    session: DbSession,
    params: Annotated[PaginationParams, Depends(get_pagination_params)],
) -> Page[GoalRead]:
    return await goal_service.list_goals(session, current_user, params)


@router.post("", response_model=GoalRead, status_code=201)
async def create_goal(
    body: GoalCreate,
    current_user: CurrentUser,
    session: DbSession,
) -> GoalRead:
    return await goal_service.create_version(session, current_user, body)


@router.patch("/{goal_id}", response_model=GoalRead)
async def update_goal(
    goal_id: uuid.UUID,
    body: GoalUpdate,
    current_user: CurrentUser,
    session: DbSession,
) -> GoalRead:
    return await goal_service.update_version(session, current_user, goal_id, body)


@router.delete("/{goal_id}", status_code=204)
async def delete_goal(
    goal_id: uuid.UUID,
    current_user: CurrentUser,
    session: DbSession,
) -> None:
    await goal_service.delete_version(session, current_user, goal_id)
