"""Weight log business logic."""

from __future__ import annotations

import uuid
from datetime import date

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import NotFoundError
from app.core.time import today_for
from app.models.user import User
from app.models.weight_log import WeightLog
from app.repositories import weight_log_repo
from app.schemas.common import Page, PaginationParams
from app.schemas.weight_log import WeightLogCreate, WeightLogRead


async def upsert_log(
    session: AsyncSession,
    user: User,
    data: WeightLogCreate,
) -> WeightLogRead:
    logged_on = data.logged_on or today_for(user)
    log = await weight_log_repo.upsert(
        session,
        user_id=user.id,
        logged_on=logged_on,
        weight_kg=data.weight_kg,
    )
    await session.commit()
    await session.refresh(log)
    return WeightLogRead.model_validate(log)


async def list_logs(
    session: AsyncSession,
    user: User,
    params: PaginationParams,
    *,
    start_date: date | None = None,
    end_date: date | None = None,
) -> Page[WeightLogRead]:
    page = await weight_log_repo.list_for_user(
        session,
        user.id,
        params,
        start_date=start_date,
        end_date=end_date,
    )
    return Page.create(
        items=[WeightLogRead.model_validate(item) for item in page.items],
        total=page.total,
        params=params,
    )


async def delete_log(session: AsyncSession, user: User, log_id: uuid.UUID) -> None:
    log: WeightLog | None = await weight_log_repo.get_by_id(session, log_id)
    if log is None or log.user_id != user.id:
        raise NotFoundError(code="NOT_FOUND", message="Weight log not found")
    await weight_log_repo.delete_log(session, log)
    await session.commit()
