"""Goal versioning and weight-progress business logic."""

from __future__ import annotations

import uuid
from collections.abc import Sequence
from datetime import date, timedelta

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import BusinessRuleError, ConflictError, NotFoundError
from app.core.time import today_for
from app.models.goal import Goal
from app.models.user import User
from app.repositories import goal_repo, weight_log_repo
from app.schemas.common import Page, PaginationParams
from app.schemas.goal import (
    CurrentGoalResponse,
    GoalCreate,
    GoalRead,
    GoalUpdate,
    compute_weight_progress,
    macro_consistency_warnings,
)


def map_versions_to_days(
    versions: Sequence[Goal],
    start: date,
    end: date,
) -> dict[date, Goal | None]:
    """Map each day in [start, end] to the goal version in effect that day.

    ``versions`` must be sorted by ``effective_from`` ascending and may include
    versions with ``effective_from`` before ``start``.
    """
    if start > end:
        return {}

    result: dict[date, Goal | None] = {}
    day = start
    while day <= end:
        active: Goal | None = None
        for goal in versions:
            if goal.effective_from <= day:
                active = goal
            else:
                break
        result[day] = active
        day += timedelta(days=1)
    return result


def _validate_target_date(target_date: date | None, today: date) -> None:
    if target_date is not None and target_date <= today:
        raise BusinessRuleError(
            code="INVALID_TARGET_DATE",
            message="target_date must be in the future",
            details=[{"field": "target_date", "message": "Must be after today"}],
        )


def _to_goal_read(goal: Goal) -> GoalRead:
    data = GoalRead.model_validate(goal)
    data.warnings = macro_consistency_warnings(
        calories_kcal=goal.calories_kcal,
        protein_g=goal.protein_g,
        carbs_g=goal.carbs_g,
        fat_g=goal.fat_g,
    )
    return data


async def create_version(session: AsyncSession, user: User, data: GoalCreate) -> GoalRead:
    today = today_for(user)
    effective_from = data.effective_from or today
    _validate_target_date(data.target_date, today)

    fields = {
        "calories_kcal": data.calories_kcal,
        "protein_g": data.protein_g,
        "carbs_g": data.carbs_g,
        "fat_g": data.fat_g,
        "fiber_g": data.fiber_g,
        "target_weight_kg": data.target_weight_kg,
        "target_date": data.target_date,
        "effective_from": effective_from,
    }

    existing = await goal_repo.get_by_user_and_effective_from(session, user.id, effective_from)
    if existing is not None:
        goal = await goal_repo.update_goal(session, existing, **fields)
    else:
        goal = await goal_repo.create_goal(session, user_id=user.id, **fields)

    await session.commit()
    await session.refresh(goal)
    return _to_goal_read(goal)


async def update_version(
    session: AsyncSession,
    user: User,
    goal_id: uuid.UUID,
    data: GoalUpdate,
) -> GoalRead:
    goal = await goal_repo.get_by_id(session, goal_id)
    if goal is None or goal.user_id != user.id:
        raise NotFoundError(code="NOT_FOUND", message="Goal not found")

    today = today_for(user)
    fields = data.model_dump(exclude_unset=True)

    if "target_date" in fields:
        _validate_target_date(fields["target_date"], today)

    if "effective_from" in fields:
        new_from: date = fields["effective_from"]
        clash = await goal_repo.get_by_user_and_effective_from(session, user.id, new_from)
        if clash is not None and clash.id != goal.id:
            raise ConflictError(
                code="GOAL_EFFECTIVE_FROM_CONFLICT",
                message="A goal version already exists for that effective_from date",
            )

    goal = await goal_repo.update_goal(session, goal, **fields)
    await session.commit()
    await session.refresh(goal)
    return _to_goal_read(goal)


async def delete_version(session: AsyncSession, user: User, goal_id: uuid.UUID) -> None:
    goal = await goal_repo.get_by_id(session, goal_id)
    if goal is None or goal.user_id != user.id:
        raise NotFoundError(code="NOT_FOUND", message="Goal not found")
    await goal_repo.delete_goal(session, goal)
    await session.commit()


async def list_goals(
    session: AsyncSession,
    user: User,
    params: PaginationParams,
) -> Page[GoalRead]:
    page = await goal_repo.list_for_user(session, user.id, params)
    return Page.create(
        items=[_to_goal_read(g) for g in page.items],
        total=page.total,
        params=params,
    )


async def get_current(session: AsyncSession, user: User) -> CurrentGoalResponse:
    today = today_for(user)
    goal = await goal_repo.get_current(session, user.id, today)
    if goal is None:
        raise NotFoundError(code="GOAL_NOT_SET", message="No goal is set")

    base = _to_goal_read(goal)
    progress = None
    if goal.target_weight_kg is not None:
        start_log = await weight_log_repo.first_on_or_after(
            session, user.id, goal.effective_from
        )
        latest_log = await weight_log_repo.latest(session, user.id)
        if start_log is not None and latest_log is not None:
            progress = compute_weight_progress(
                start_kg=start_log.weight_kg,
                current_kg=latest_log.weight_kg,
                target_kg=goal.target_weight_kg,
            )

    return CurrentGoalResponse(**base.model_dump(), weight_progress=progress)


async def get_goals_for_range(
    session: AsyncSession,
    user_id: uuid.UUID,
    start: date,
    end: date,
) -> dict[date, Goal | None]:
    versions = await goal_repo.list_covering_range(session, user_id, start, end)
    return map_versions_to_days(versions, start, end)
