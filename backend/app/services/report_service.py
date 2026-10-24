"""Report and dashboard business logic."""

from __future__ import annotations

from datetime import date, timedelta
from decimal import Decimal

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import BusinessRuleError
from app.core.time import today_for
from app.models.goal import Goal
from app.models.user import User
from app.nutrients import NUTRIENTS
from app.repositories import report_repo
from app.schemas.report import (
    CalorieTrendPoint,
    CalorieTrendResponse,
    DailySummaryResponse,
    DayActuals,
    GoalComparisonDay,
    GoalComparisonResponse,
    GoalComparisonSummary,
    GoalSnapshot,
    GroupBy,
    MacroBreakdownResponse,
    MacroCalorieShare,
    MacroPeriodPoint,
    MacroTotals,
    MealBreakdown,
    MicronutrientItem,
    MicronutrientSummaryResponse,
    MicroStatus,
)
from app.services import goal_service

_MAX_REPORT_RANGE_DAYS = 92
_ZERO = Decimal("0")


def _validate_range(start: date, end: date) -> None:
    if start > end:
        raise BusinessRuleError(
            code="INVALID_DATE_RANGE",
            message="start_date must be on or before end_date",
            details=[
                {
                    "field": "start_date",
                    "message": "Must be less than or equal to end_date",
                }
            ],
        )
    if (end - start).days > _MAX_REPORT_RANGE_DAYS:
        raise BusinessRuleError(
            code="INVALID_DATE_RANGE",
            message=f"Date range must be at most {_MAX_REPORT_RANGE_DAYS} days",
            details=[
                {
                    "field": "end_date",
                    "message": f"Range cannot exceed {_MAX_REPORT_RANGE_DAYS} days",
                }
            ],
        )


def _resolve_range(
    user: User,
    start_date: date | None,
    end_date: date | None,
    *,
    default_span_days: int = 6,
) -> tuple[date, date]:
    today = today_for(user)
    end = end_date or today
    start = start_date or (end - timedelta(days=default_span_days))
    _validate_range(start, end)
    return start, end


def _goal_snapshot(goal: Goal | None) -> GoalSnapshot | None:
    if goal is None:
        return None
    return GoalSnapshot(
        calories_kcal=goal.calories_kcal,
        protein_g=goal.protein_g,
        carbs_g=goal.carbs_g,
        fat_g=goal.fat_g,
    )


def _remaining(goal: GoalSnapshot, totals: MacroTotals) -> MacroTotals:
    return MacroTotals(
        calories_kcal=Decimal(goal.calories_kcal) - totals.calories_kcal,
        protein_g=goal.protein_g - totals.protein_g,
        carbs_g=goal.carbs_g - totals.carbs_g,
        fat_g=goal.fat_g - totals.fat_g,
    )


def macro_calorie_share(
    protein_g: Decimal,
    carbs_g: Decimal,
    fat_g: Decimal,
) -> MacroCalorieShare:
    protein_cal = float(protein_g) * 4
    carbs_cal = float(carbs_g) * 4
    fat_cal = float(fat_g) * 9
    total = protein_cal + carbs_cal + fat_cal
    if total <= 0:
        return MacroCalorieShare(protein_pct=0.0, carbs_pct=0.0, fat_pct=0.0)
    return MacroCalorieShare(
        protein_pct=round(protein_cal / total * 100, 1),
        carbs_pct=round(carbs_cal / total * 100, 1),
        fat_pct=round(fat_cal / total * 100, 1),
    )


def micronutrient_status(percent_dv: float | None) -> MicroStatus | None:
    if percent_dv is None:
        return None
    if percent_dv < 50:
        return "low"
    if percent_dv <= 150:
        return "adequate"
    return "high"


def _monday_of(day: date) -> date:
    return day - timedelta(days=day.weekday())


def _iter_days(start: date, end: date):
    day = start
    while day <= end:
        yield day
        day += timedelta(days=1)


def _iter_week_starts(start: date, end: date):
    week = _monday_of(start)
    last = _monday_of(end)
    while week <= last:
        yield week
        week += timedelta(days=7)


async def daily_summary(
    session: AsyncSession,
    user: User,
    day: date | None = None,
) -> DailySummaryResponse:
    target = day or today_for(user)
    by_meal_rows = await report_repo.daily_totals_by_meal(session, user.id, target)
    by_meal = [MealBreakdown(**row) for row in by_meal_rows]
    totals = MacroTotals(
        calories_kcal=sum((m.calories_kcal for m in by_meal), _ZERO),
        protein_g=sum((m.protein_g for m in by_meal), _ZERO),
        carbs_g=sum((m.carbs_g for m in by_meal), _ZERO),
        fat_g=sum((m.fat_g for m in by_meal), _ZERO),
    )

    goals = await goal_service.get_goals_for_range(session, user.id, target, target)
    goal = _goal_snapshot(goals.get(target))
    remaining = _remaining(goal, totals) if goal is not None else None

    return DailySummaryResponse(
        date=target,
        totals=totals,
        by_meal=by_meal,
        goal=goal,
        remaining=remaining,
    )


async def calorie_trend(
    session: AsyncSession,
    user: User,
    start_date: date | None = None,
    end_date: date | None = None,
) -> CalorieTrendResponse:
    start, end = _resolve_range(user, start_date, end_date)
    series = await report_repo.calorie_series(session, user.id, start, end)
    goals = await goal_service.get_goals_for_range(session, user.id, start, end)

    points = [
        CalorieTrendPoint(
            day=day,
            calories=calories,
            goal_calories=goals[day].calories_kcal if goals.get(day) else None,
        )
        for day, calories in series
    ]
    return CalorieTrendResponse(start_date=start, end_date=end, points=points)


async def macro_breakdown(
    session: AsyncSession,
    user: User,
    start_date: date | None = None,
    end_date: date | None = None,
    group_by: GroupBy = "day",
) -> MacroBreakdownResponse:
    if group_by not in ("day", "week"):
        raise BusinessRuleError(
            code="INVALID_GROUP_BY",
            message="group_by must be 'day' or 'week'",
            details=[{"field": "group_by", "message": "Must be day or week"}],
        )

    start, end = _resolve_range(user, start_date, end_date)

    if group_by == "day":
        raw = await report_repo.macro_totals_by_day(session, user.id, start, end)
        points = [
            MacroPeriodPoint(
                period_start=day,
                protein_g=raw.get(day, {}).get("protein_g", _ZERO),
                carbs_g=raw.get(day, {}).get("carbs_g", _ZERO),
                fat_g=raw.get(day, {}).get("fat_g", _ZERO),
            )
            for day in _iter_days(start, end)
        ]
    else:
        raw = await report_repo.macro_totals_by_week(session, user.id, start, end)
        points = [
            MacroPeriodPoint(
                period_start=week,
                protein_g=raw.get(week, {}).get("protein_g", _ZERO),
                carbs_g=raw.get(week, {}).get("carbs_g", _ZERO),
                fat_g=raw.get(week, {}).get("fat_g", _ZERO),
            )
            for week in _iter_week_starts(start, end)
        ]

    total_protein = sum((p.protein_g for p in points), _ZERO)
    total_carbs = sum((p.carbs_g for p in points), _ZERO)
    total_fat = sum((p.fat_g for p in points), _ZERO)

    return MacroBreakdownResponse(
        start_date=start,
        end_date=end,
        group_by=group_by,
        points=points,
        calorie_share=macro_calorie_share(total_protein, total_carbs, total_fat),
    )


async def micronutrient_summary(
    session: AsyncSession,
    user: User,
    start_date: date | None = None,
    end_date: date | None = None,
) -> MicronutrientSummaryResponse:
    start, end = _resolve_range(user, start_date, end_date)
    days_in_range = (end - start).days + 1
    totals = await report_repo.micronutrient_totals(session, user.id, start, end)

    nutrients: list[MicronutrientItem] = []
    for defn in NUTRIENTS:
        total = totals.get(defn.code, _ZERO)
        daily_avg = total / days_in_range if days_in_range else _ZERO
        pct: float | None = None
        if defn.daily_value and defn.daily_value > 0:
            pct = round(float(daily_avg) / defn.daily_value * 100, 1)
        nutrients.append(
            MicronutrientItem(
                code=defn.code,
                name=defn.name,
                unit=defn.unit,
                total=total,
                daily_average=daily_avg.quantize(Decimal("0.01")),
                daily_value=defn.daily_value,
                percent_daily_value=pct,
                status=micronutrient_status(pct),
            )
        )

    return MicronutrientSummaryResponse(
        start_date=start,
        end_date=end,
        days_in_range=days_in_range,
        nutrients=nutrients,
    )


async def goal_comparison(
    session: AsyncSession,
    user: User,
    start_date: date | None = None,
    end_date: date | None = None,
) -> GoalComparisonResponse:
    start, end = _resolve_range(user, start_date, end_date)
    actuals = await report_repo.macro_totals_by_day(session, user.id, start, end)
    goals = await goal_service.get_goals_for_range(session, user.id, start, end)

    days: list[GoalComparisonDay] = []
    actual_cals: list[float] = []
    goal_cals: list[float] = []
    within = 0

    for day in _iter_days(start, end):
        row = actuals.get(day, {})
        actual = DayActuals(
            calories_kcal=row.get("calories_kcal", _ZERO),
            protein_g=row.get("protein_g", _ZERO),
            carbs_g=row.get("carbs_g", _ZERO),
            fat_g=row.get("fat_g", _ZERO),
        )
        goal = _goal_snapshot(goals.get(day))
        days.append(GoalComparisonDay(day=day, actual=actual, goal=goal))

        if goal is not None:
            actual_cals.append(float(actual.calories_kcal))
            goal_cals.append(float(goal.calories_kcal))
            if goal.calories_kcal > 0:
                ratio = float(actual.calories_kcal) / goal.calories_kcal
                if 0.9 <= ratio <= 1.1:
                    within += 1

    days_with_goal = len(goal_cals)
    summary = GoalComparisonSummary(
        days_with_goal=days_with_goal,
        avg_actual_calories=(
            round(sum(actual_cals) / days_with_goal, 1) if days_with_goal else None
        ),
        avg_goal_calories=(
            round(sum(goal_cals) / days_with_goal, 1) if days_with_goal else None
        ),
        days_within_10_pct=within,
        adherence_pct=(
            round(within / days_with_goal * 100, 1) if days_with_goal else None
        ),
    )

    return GoalComparisonResponse(
        start_date=start,
        end_date=end,
        days=days,
        summary=summary,
    )
