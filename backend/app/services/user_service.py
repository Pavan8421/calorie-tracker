"""User profile business logic."""

from __future__ import annotations

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User
from app.repositories import user_repo
from app.schemas.user import UserUpdate


async def update_profile(session: AsyncSession, user: User, data: UserUpdate) -> User:
    fields = data.model_dump(exclude_unset=True)
    updated = await user_repo.update_user(session, user, **fields)
    await session.commit()
    await session.refresh(updated)
    return updated
