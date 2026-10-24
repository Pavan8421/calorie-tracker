"""Report / dashboard response schemas."""

from __future__ import annotations

from datetime import date
from decimal import Decimal
from typing import Literal

from pydantic import BaseModel, Field

from app.models.enums import MealType

GroupBy = Literal["day", "week"]
MicroStatus = Literal["low", "adequate", "high"]


class MacroTotals(BaseModel):
    calories_kcal: Decimal = Decimal("0")
    protein_g: Decimal = Decimal("0")
    carbs_g: Decimal = Decimal("0")
    fat_g: Decimal = Decimal("0")


class GoalSnapshot(BaseModel):
    calories_kcal: int
    protein_g: Decimal
    carbs_g: Decimal
    fat_g: Decimal


class MealBreakdown(BaseModel):
    meal_type: MealType
    calories_kcal: Decimal
    protein_g: Decimal
    carbs_g: Decimal
    fat_g: Decimal
    entry_count: int


class DailySummaryResponse(BaseModel):
    date: date
    totals: MacroTotals
    by_meal: list[MealBreakdown]
    goal: GoalSnapshot | None = None
    remaining: MacroTotals | None = None


class CalorieTrendPoint(BaseModel):
    day: date
    calories: Decimal
    goal_calories: int | None = None


class CalorieTrendResponse(BaseModel):
    start_date: date
    end_date: date
    points: list[CalorieTrendPoint]


class MacroPeriodPoint(BaseModel):
    period_start: date
    protein_g: Decimal
    carbs_g: Decimal
    fat_g: Decimal


class MacroCalorieShare(BaseModel):
    protein_pct: float
    carbs_pct: float
    fat_pct: float


class MacroBreakdownResponse(BaseModel):
    start_date: date
    end_date: date
    group_by: GroupBy
    points: list[MacroPeriodPoint]
    calorie_share: MacroCalorieShare


class MicronutrientItem(BaseModel):
    code: str
    name: str
    unit: str
    total: Decimal
    daily_average: Decimal
    daily_value: float | None
    percent_daily_value: float | None
    status: MicroStatus | None


class MicronutrientSummaryResponse(BaseModel):
    start_date: date
    end_date: date
    days_in_range: int
    nutrients: list[MicronutrientItem]


class DayActuals(BaseModel):
    calories_kcal: Decimal
    protein_g: Decimal
    carbs_g: Decimal
    fat_g: Decimal


class GoalComparisonDay(BaseModel):
    day: date
    actual: DayActuals
    goal: GoalSnapshot | None = None


class GoalComparisonSummary(BaseModel):
    days_with_goal: int
    avg_actual_calories: float | None = None
    avg_goal_calories: float | None = None
    days_within_10_pct: int = 0
    adherence_pct: float | None = None


class GoalComparisonResponse(BaseModel):
    start_date: date
    end_date: date
    days: list[GoalComparisonDay]
    summary: GoalComparisonSummary


class ReportDateRange(BaseModel):
    start_date: date | None = None
    end_date: date | None = None
    group_by: GroupBy = Field(default="day")
