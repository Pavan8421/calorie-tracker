"""Report aggregation queries (PostgreSQL)."""

from __future__ import annotations

import uuid
from datetime import date
from decimal import Decimal
from typing import Any

from sqlalchemy import func, select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.enums import MealType
from app.models.food_entry import FoodEntry


def _dec(value: Any) -> Decimal:
    if value is None:
        return Decimal("0")
    return Decimal(str(value))


async def daily_totals_by_meal(
    session: AsyncSession,
    user_id: uuid.UUID,
    day: date,
) -> list[dict[str, Any]]:
    stmt = (
        select(
            FoodEntry.meal_type,
            func.coalesce(func.sum(FoodEntry.calories_kcal), 0).label("calories_kcal"),
            func.coalesce(func.sum(FoodEntry.protein_g), 0).label("protein_g"),
            func.coalesce(func.sum(FoodEntry.carbs_g), 0).label("carbs_g"),
            func.coalesce(func.sum(FoodEntry.fat_g), 0).label("fat_g"),
            func.count(FoodEntry.id).label("entry_count"),
        )
        .where(FoodEntry.user_id == user_id, FoodEntry.consumed_on == day)
        .group_by(FoodEntry.meal_type)
        .order_by(FoodEntry.meal_type)
    )
    result = await session.execute(stmt)
    rows = []
    for row in result.all():
        rows.append(
            {
                "meal_type": row.meal_type
                if isinstance(row.meal_type, MealType)
                else MealType(row.meal_type),
                "calories_kcal": _dec(row.calories_kcal),
                "protein_g": _dec(row.protein_g),
                "carbs_g": _dec(row.carbs_g),
                "fat_g": _dec(row.fat_g),
                "entry_count": int(row.entry_count),
            }
        )
    return rows


async def calorie_series(
    session: AsyncSession,
    user_id: uuid.UUID,
    start: date,
    end: date,
) -> list[tuple[date, Decimal]]:
    sql = text(
        """
        SELECT d::date AS day,
               COALESCE(SUM(e.calories_kcal), 0) AS calories
        FROM generate_series(
            CAST(:start AS date),
            CAST(:end AS date),
            interval '1 day'
        ) AS d
        LEFT JOIN food_entries e
          ON e.consumed_on = d::date AND e.user_id = :uid
        GROUP BY d
        ORDER BY d
        """
    )
    result = await session.execute(
        sql, {"start": start, "end": end, "uid": user_id}
    )
    return [(row.day, _dec(row.calories)) for row in result.all()]


async def macro_totals_by_day(
    session: AsyncSession,
    user_id: uuid.UUID,
    start: date,
    end: date,
) -> dict[date, dict[str, Decimal]]:
    stmt = (
        select(
            FoodEntry.consumed_on,
            func.coalesce(func.sum(FoodEntry.protein_g), 0).label("protein_g"),
            func.coalesce(func.sum(FoodEntry.carbs_g), 0).label("carbs_g"),
            func.coalesce(func.sum(FoodEntry.fat_g), 0).label("fat_g"),
            func.coalesce(func.sum(FoodEntry.calories_kcal), 0).label("calories_kcal"),
        )
        .where(
            FoodEntry.user_id == user_id,
            FoodEntry.consumed_on >= start,
            FoodEntry.consumed_on <= end,
        )
        .group_by(FoodEntry.consumed_on)
    )
    result = await session.execute(stmt)
    out: dict[date, dict[str, Decimal]] = {}
    for row in result.all():
        out[row.consumed_on] = {
            "protein_g": _dec(row.protein_g),
            "carbs_g": _dec(row.carbs_g),
            "fat_g": _dec(row.fat_g),
            "calories_kcal": _dec(row.calories_kcal),
        }
    return out


async def macro_totals_by_week(
    session: AsyncSession,
    user_id: uuid.UUID,
    start: date,
    end: date,
) -> dict[date, dict[str, Decimal]]:
    """Group by ISO week (Monday start) via date_trunc('week', ...)."""
    sql = text(
        """
        SELECT date_trunc('week', consumed_on)::date AS period_start,
               COALESCE(SUM(protein_g), 0) AS protein_g,
               COALESCE(SUM(carbs_g), 0) AS carbs_g,
               COALESCE(SUM(fat_g), 0) AS fat_g,
               COALESCE(SUM(calories_kcal), 0) AS calories_kcal
        FROM food_entries
        WHERE user_id = :uid
          AND consumed_on BETWEEN CAST(:start AS date) AND CAST(:end AS date)
        GROUP BY period_start
        ORDER BY period_start
        """
    )
    result = await session.execute(
        sql, {"uid": user_id, "start": start, "end": end}
    )
    out: dict[date, dict[str, Decimal]] = {}
    for row in result.all():
        out[row.period_start] = {
            "protein_g": _dec(row.protein_g),
            "carbs_g": _dec(row.carbs_g),
            "fat_g": _dec(row.fat_g),
            "calories_kcal": _dec(row.calories_kcal),
        }
    return out


async def micronutrient_totals(
    session: AsyncSession,
    user_id: uuid.UUID,
    start: date,
    end: date,
) -> dict[str, Decimal]:
    sql = text(
        """
        SELECT m.key AS nutrient, SUM(m.value::numeric) AS total
        FROM food_entries e,
             jsonb_each_text(e.micronutrients) AS m
        WHERE e.user_id = :uid
          AND e.consumed_on BETWEEN CAST(:start AS date) AND CAST(:end AS date)
        GROUP BY m.key
        """
    )
    result = await session.execute(
        sql, {"uid": user_id, "start": start, "end": end}
    )
    return {str(row.nutrient): _dec(row.total) for row in result.all()}
