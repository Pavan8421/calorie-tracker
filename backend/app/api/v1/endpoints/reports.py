"""Nutrition report and dashboard endpoints."""

from __future__ import annotations

from datetime import date
from typing import Annotated, Literal

from fastapi import APIRouter, Query

from app.api.deps import CurrentUser, DbSession
from app.schemas.report import (
    CalorieTrendResponse,
    DailySummaryResponse,
    GoalComparisonResponse,
    MacroBreakdownResponse,
    MicronutrientSummaryResponse,
)
from app.services import report_service

router = APIRouter()


@router.get("/daily-summary", response_model=DailySummaryResponse)
async def get_daily_summary(
    current_user: CurrentUser,
    session: DbSession,
    date_param: Annotated[date | None, Query(alias="date")] = None,
) -> DailySummaryResponse:
    return await report_service.daily_summary(session, current_user, date_param)


@router.get("/calorie-trend", response_model=CalorieTrendResponse)
async def get_calorie_trend(
    current_user: CurrentUser,
    session: DbSession,
    start_date: Annotated[date | None, Query()] = None,
    end_date: Annotated[date | None, Query()] = None,
) -> CalorieTrendResponse:
    return await report_service.calorie_trend(
        session, current_user, start_date=start_date, end_date=end_date
    )


@router.get("/macros", response_model=MacroBreakdownResponse)
async def get_macro_breakdown(
    current_user: CurrentUser,
    session: DbSession,
    start_date: Annotated[date | None, Query()] = None,
    end_date: Annotated[date | None, Query()] = None,
    group_by: Annotated[Literal["day", "week"], Query()] = "day",
) -> MacroBreakdownResponse:
    return await report_service.macro_breakdown(
        session,
        current_user,
        start_date=start_date,
        end_date=end_date,
        group_by=group_by,
    )


@router.get("/micronutrients", response_model=MicronutrientSummaryResponse)
async def get_micronutrient_summary(
    current_user: CurrentUser,
    session: DbSession,
    start_date: Annotated[date | None, Query()] = None,
    end_date: Annotated[date | None, Query()] = None,
) -> MicronutrientSummaryResponse:
    return await report_service.micronutrient_summary(
        session, current_user, start_date=start_date, end_date=end_date
    )


@router.get("/goal-comparison", response_model=GoalComparisonResponse)
async def get_goal_comparison(
    current_user: CurrentUser,
    session: DbSession,
    start_date: Annotated[date | None, Query()] = None,
    end_date: Annotated[date | None, Query()] = None,
) -> GoalComparisonResponse:
    return await report_service.goal_comparison(
        session, current_user, start_date=start_date, end_date=end_date
    )
