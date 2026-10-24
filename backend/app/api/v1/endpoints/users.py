"""Current user profile endpoints."""

from __future__ import annotations

from fastapi import APIRouter

from app.api.deps import CurrentUser, DbSession
from app.schemas.user import UserRead, UserUpdate
from app.services import user_service

router = APIRouter()


@router.get("/me", response_model=UserRead)
async def get_me(current_user: CurrentUser) -> UserRead:
    return UserRead.model_validate(current_user)


@router.patch("/me", response_model=UserRead)
async def patch_me(
    body: UserUpdate,
    current_user: CurrentUser,
    session: DbSession,
) -> UserRead:
    updated = await user_service.update_profile(session, current_user, body)
    return UserRead.model_validate(updated)
