"""LangChain tools wrapping existing domain services."""

from __future__ import annotations

import json
import uuid
from dataclasses import dataclass, field
from datetime import date as Date
from datetime import datetime
from decimal import Decimal
from typing import Any

from langchain_core.tools import StructuredTool
from pydantic import BaseModel, Field, ValidationError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import AppError
from app.models.enums import EntrySource, MealType
from app.models.user import User
from app.nutrients import ALLOWED_UNITS
from app.schemas.entry import EntryListFilters, FoodEntryCreate, FoodEntryUpdate
from app.schemas.goal import GoalCreate
from app.schemas.weight_log import WeightLogCreate
from app.services import entry_service, goal_service, report_service, weight_log_service


@dataclass
class ToolContext:
    session: AsyncSession
    user: User
    actions: list[dict[str, Any]] = field(default_factory=list)


def _json(data: Any) -> str:
    return json.dumps(data, default=str)


def _error_payload(exc: Exception) -> str:
    if isinstance(exc, AppError):
        return _json({"error": exc.message, "code": exc.code, "details": exc.details})
    if isinstance(exc, ValidationError):
        return _json({"error": "Invalid tool arguments", "details": exc.errors()})
    return _json({"error": str(exc)})


class LogMealArgs(BaseModel):
    meal_type: MealType
    food_name: str = Field(min_length=1, max_length=200)
    quantity: Decimal = Field(gt=0)
    unit: str
    calories_kcal: Decimal = Field(ge=0, le=10000)
    protein_g: Decimal = Field(default=Decimal("0"), ge=0)
    carbs_g: Decimal = Field(default=Decimal("0"), ge=0)
    fat_g: Decimal = Field(default=Decimal("0"), ge=0)
    fiber_g: Decimal | None = None
    sugar_g: Decimal | None = None
    micronutrients: dict[str, float] = Field(default_factory=dict)
    consumed_at: datetime | None = None
    notes: str | None = None


class ListEntriesArgs(BaseModel):
    start_date: Date | None = None
    end_date: Date | None = None
    meal_types: list[MealType] = Field(default_factory=list)
    page: int = Field(default=1, ge=1)
    page_size: int = Field(default=20, ge=1, le=100)


class UpdateEntryArgs(BaseModel):
    entry_id: uuid.UUID
    meal_type: MealType | None = None
    food_name: str | None = None
    quantity: Decimal | None = Field(default=None, gt=0)
    unit: str | None = None
    calories_kcal: Decimal | None = None
    protein_g: Decimal | None = None
    carbs_g: Decimal | None = None
    fat_g: Decimal | None = None
    fiber_g: Decimal | None = None
    sugar_g: Decimal | None = None
    micronutrients: dict[str, float] | None = None
    consumed_at: datetime | None = None
    notes: str | None = None


class DeleteEntryArgs(BaseModel):
    entry_id: uuid.UUID
    confirmed: bool = False


class SetGoalsArgs(BaseModel):
    calories_kcal: int = Field(ge=800, le=10000)
    protein_g: Decimal = Field(ge=0)
    carbs_g: Decimal = Field(ge=0)
    fat_g: Decimal = Field(ge=0)
    fiber_g: Decimal | None = None
    target_weight_kg: Decimal | None = None
    target_date: Date | None = None
    effective_from: Date | None = None


class LogWeightArgs(BaseModel):
    weight_kg: Decimal = Field(ge=20, le=400)
    logged_on: Date | None = None


class DailySummaryArgs(BaseModel):
    # Field name `date` would shadow datetime.date during Pydantic eval.
    date: Date | None = None


class EmptyArgs(BaseModel):
    pass


def build_tools(ctx: ToolContext) -> list[StructuredTool]:
    async def log_meal(**kwargs: Any) -> str:
        try:
            args = LogMealArgs.model_validate(kwargs)
            if args.unit not in ALLOWED_UNITS:
                return _json({"error": f"unit must be one of {sorted(ALLOWED_UNITS)}"})
            payload = FoodEntryCreate(
                meal_type=args.meal_type,
                food_name=args.food_name,
                quantity=args.quantity,
                unit=args.unit,
                calories_kcal=args.calories_kcal,
                protein_g=args.protein_g,
                carbs_g=args.carbs_g,
                fat_g=args.fat_g,
                fiber_g=args.fiber_g,
                sugar_g=args.sugar_g,
                micronutrients=args.micronutrients,
                consumed_at=args.consumed_at,
                notes=args.notes,
                source="manual",
            )
            entry = await entry_service.create_entry(
                ctx.session,
                ctx.user,
                payload,
                source_override=EntrySource.chat,
            )
            ctx.actions.append({"type": "entry_created", "id": str(entry.id)})
            return _json(entry.model_dump(mode="json"))
        except Exception as exc:
            return _error_payload(exc)

    async def list_entries(**kwargs: Any) -> str:
        try:
            args = ListEntriesArgs.model_validate(kwargs)
            from app.schemas.common import PaginationParams

            page = await entry_service.list_entries(
                ctx.session,
                ctx.user,
                PaginationParams(page=args.page, page_size=args.page_size),
                EntryListFilters(
                    start_date=args.start_date,
                    end_date=args.end_date,
                    meal_types=args.meal_types,
                ),
            )
            return _json(page.model_dump(mode="json"))
        except Exception as exc:
            return _error_payload(exc)

    async def update_entry(**kwargs: Any) -> str:
        try:
            args = UpdateEntryArgs.model_validate(kwargs)
            fields = args.model_dump(exclude={"entry_id"}, exclude_none=True)
            if not fields:
                return _json({"error": "At least one field to update is required"})
            payload = FoodEntryUpdate.model_validate(fields)
            entry = await entry_service.update_entry(
                ctx.session, ctx.user, args.entry_id, payload
            )
            ctx.actions.append({"type": "entry_updated", "id": str(entry.id)})
            return _json(entry.model_dump(mode="json"))
        except Exception as exc:
            return _error_payload(exc)

    async def delete_entry(**kwargs: Any) -> str:
        try:
            args = DeleteEntryArgs.model_validate(kwargs)
            if not args.confirmed:
                return _json(
                    {
                        "error": "Deletion not confirmed",
                        "hint": "Ask the user to confirm, then call again with confirmed=true",
                    }
                )
            await entry_service.delete_entry(ctx.session, ctx.user, args.entry_id)
            ctx.actions.append({"type": "entry_deleted", "id": str(args.entry_id)})
            return _json({"ok": True, "deleted_id": str(args.entry_id)})
        except Exception as exc:
            return _error_payload(exc)

    async def get_current_goals(**_kwargs: Any) -> str:
        try:
            goal = await goal_service.get_current(ctx.session, ctx.user)
            return _json(goal.model_dump(mode="json"))
        except Exception as exc:
            return _error_payload(exc)

    async def set_goals(**kwargs: Any) -> str:
        try:
            args = SetGoalsArgs.model_validate(kwargs)
            goal = await goal_service.create_version(
                ctx.session,
                ctx.user,
                GoalCreate.model_validate(args.model_dump()),
            )
            ctx.actions.append({"type": "goal_set", "id": str(goal.id)})
            return _json(goal.model_dump(mode="json"))
        except Exception as exc:
            return _error_payload(exc)

    async def log_weight(**kwargs: Any) -> str:
        try:
            args = LogWeightArgs.model_validate(kwargs)
            log = await weight_log_service.upsert_log(
                ctx.session,
                ctx.user,
                WeightLogCreate(weight_kg=args.weight_kg, logged_on=args.logged_on),
            )
            ctx.actions.append({"type": "weight_logged", "id": str(log.id)})
            return _json(log.model_dump(mode="json"))
        except Exception as exc:
            return _error_payload(exc)

    async def get_daily_summary(**kwargs: Any) -> str:
        try:
            args = DailySummaryArgs.model_validate(kwargs)
            summary = await report_service.daily_summary(
                ctx.session, ctx.user, args.date
            )
            return _json(summary.model_dump(mode="json"))
        except Exception as exc:
            return _error_payload(exc)

    async def get_weekly_summary(**_kwargs: Any) -> str:
        try:
            from datetime import timedelta

            from app.core.time import today_for

            end = today_for(ctx.user)
            start = end - timedelta(days=6)
            trend = await report_service.calorie_trend(
                ctx.session, ctx.user, start_date=start, end_date=end
            )
            macros = await report_service.macro_breakdown(
                ctx.session, ctx.user, start_date=start, end_date=end, group_by="day"
            )
            comparison = await report_service.goal_comparison(
                ctx.session, ctx.user, start_date=start, end_date=end
            )
            return _json(
                {
                    "start_date": start.isoformat(),
                    "end_date": end.isoformat(),
                    "calorie_trend": trend.model_dump(mode="json"),
                    "macros": macros.model_dump(mode="json"),
                    "goal_comparison": comparison.model_dump(mode="json"),
                }
            )
        except Exception as exc:
            return _error_payload(exc)

    return [
        StructuredTool.from_function(
            coroutine=log_meal,
            name="log_meal",
            description="Log a food entry for the current user (source=chat).",
            args_schema=LogMealArgs,
        ),
        StructuredTool.from_function(
            coroutine=list_entries,
            name="list_entries",
            description="List the user's food entries for a date range / meal types.",
            args_schema=ListEntriesArgs,
        ),
        StructuredTool.from_function(
            coroutine=update_entry,
            name="update_entry",
            description="Update one of the user's food entries by id.",
            args_schema=UpdateEntryArgs,
        ),
        StructuredTool.from_function(
            coroutine=delete_entry,
            name="delete_entry",
            description="Delete a food entry. Requires confirmed=true after user confirmation.",
            args_schema=DeleteEntryArgs,
        ),
        StructuredTool.from_function(
            coroutine=get_current_goals,
            name="get_current_goals",
            description="Get the user's current nutrition/weight goals.",
            args_schema=EmptyArgs,
        ),
        StructuredTool.from_function(
            coroutine=set_goals,
            name="set_goals",
            description="Create or replace today's goal version for the user.",
            args_schema=SetGoalsArgs,
        ),
        StructuredTool.from_function(
            coroutine=log_weight,
            name="log_weight",
            description="Log or update the user's weight for a day.",
            args_schema=LogWeightArgs,
        ),
        StructuredTool.from_function(
            coroutine=get_daily_summary,
            name="get_daily_summary",
            description="Get calorie/macro totals vs goal for a local date (default today).",
            args_schema=DailySummaryArgs,
        ),
        StructuredTool.from_function(
            coroutine=get_weekly_summary,
            name="get_weekly_summary",
            description="Get the last 7 days calorie trend, macros, and goal comparison.",
            args_schema=EmptyArgs,
        ),
    ]


def tool_schemas() -> list[dict[str, Any]]:
    """JSON schemas for each tool (for tests / docs)."""
    # Build with a dummy context is awkward; instantiate schemas directly.
    schemas = [
        ("log_meal", LogMealArgs),
        ("list_entries", ListEntriesArgs),
        ("update_entry", UpdateEntryArgs),
        ("delete_entry", DeleteEntryArgs),
        ("get_current_goals", EmptyArgs),
        ("set_goals", SetGoalsArgs),
        ("log_weight", LogWeightArgs),
        ("get_daily_summary", DailySummaryArgs),
        ("get_weekly_summary", EmptyArgs),
    ]
    return [
        {"name": name, "schema": model.model_json_schema()} for name, model in schemas
    ]
