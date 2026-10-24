"""Food entry request/response schemas."""

from __future__ import annotations

import uuid
from datetime import UTC, date, datetime, timedelta
from decimal import Decimal
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

from app.models.enums import EntrySource, MealType
from app.nutrients import ALLOWED_UNITS, CLIENT_ALLOWED_SOURCES, is_known_nutrient

ClientEntrySource = Literal["manual", "ai_image"]


def _validate_micronutrients(value: dict[str, Any]) -> dict[str, float]:
    cleaned: dict[str, float] = {}
    for key, raw in value.items():
        if not is_known_nutrient(key):
            raise ValueError(f"Unknown micronutrient key: {key}")
        try:
            amount = float(raw)
        except (TypeError, ValueError) as exc:
            raise ValueError(f"Invalid micronutrient value for {key}") from exc
        if amount < 0:
            raise ValueError(f"Micronutrient {key} must be >= 0")
        cleaned[key] = amount
    return cleaned


def _validate_consumed_at(value: datetime | None) -> datetime | None:
    if value is None:
        return value
    dt = value if value.tzinfo is not None else value.replace(tzinfo=UTC)
    if dt > datetime.now(UTC) + timedelta(minutes=5):
        raise ValueError("consumed_at cannot be in the future")
    return dt


class FoodEntryCreate(BaseModel):
    meal_type: MealType
    food_name: str = Field(min_length=1, max_length=200)
    quantity: Decimal = Field(gt=0, max_digits=8, decimal_places=2)
    unit: str
    consumed_at: datetime | None = None
    calories_kcal: Decimal = Field(ge=0, le=10000, max_digits=7, decimal_places=2)
    protein_g: Decimal = Field(default=Decimal("0"), ge=0, le=1000, max_digits=7, decimal_places=2)
    carbs_g: Decimal = Field(default=Decimal("0"), ge=0, le=1000, max_digits=7, decimal_places=2)
    fat_g: Decimal = Field(default=Decimal("0"), ge=0, le=1000, max_digits=7, decimal_places=2)
    fiber_g: Decimal | None = Field(default=None, ge=0, le=1000, max_digits=7, decimal_places=2)
    sugar_g: Decimal | None = Field(default=None, ge=0, le=1000, max_digits=7, decimal_places=2)
    micronutrients: dict[str, Any] = Field(default_factory=dict)
    source: ClientEntrySource = "manual"
    notes: str | None = Field(default=None, max_length=2000)

    @field_validator("food_name")
    @classmethod
    def strip_food_name(cls, value: str) -> str:
        stripped = value.strip()
        if not stripped:
            raise ValueError("food_name must not be empty")
        return stripped

    @field_validator("unit")
    @classmethod
    def check_unit(cls, value: str) -> str:
        if value not in ALLOWED_UNITS:
            raise ValueError(f"unit must be one of: {', '.join(sorted(ALLOWED_UNITS))}")
        return value

    @field_validator("consumed_at")
    @classmethod
    def check_consumed_at(cls, value: datetime | None) -> datetime | None:
        return _validate_consumed_at(value)

    @field_validator("micronutrients")
    @classmethod
    def check_micronutrients(cls, value: dict[str, Any]) -> dict[str, float]:
        return _validate_micronutrients(value)

    @field_validator("source")
    @classmethod
    def check_source(cls, value: str) -> str:
        if value not in CLIENT_ALLOWED_SOURCES:
            raise ValueError("source must be manual or ai_image")
        return value

    @field_validator("notes")
    @classmethod
    def strip_notes(cls, value: str | None) -> str | None:
        if value is None:
            return value
        stripped = value.strip()
        return stripped or None


class FoodEntryUpdate(BaseModel):
    meal_type: MealType | None = None
    food_name: str | None = Field(default=None, min_length=1, max_length=200)
    quantity: Decimal | None = Field(default=None, gt=0, max_digits=8, decimal_places=2)
    unit: str | None = None
    consumed_at: datetime | None = None
    calories_kcal: Decimal | None = Field(
        default=None, ge=0, le=10000, max_digits=7, decimal_places=2
    )
    protein_g: Decimal | None = Field(
        default=None, ge=0, le=1000, max_digits=7, decimal_places=2
    )
    carbs_g: Decimal | None = Field(
        default=None, ge=0, le=1000, max_digits=7, decimal_places=2
    )
    fat_g: Decimal | None = Field(default=None, ge=0, le=1000, max_digits=7, decimal_places=2)
    fiber_g: Decimal | None = Field(default=None, ge=0, le=1000, max_digits=7, decimal_places=2)
    sugar_g: Decimal | None = Field(default=None, ge=0, le=1000, max_digits=7, decimal_places=2)
    micronutrients: dict[str, Any] | None = None
    source: ClientEntrySource | None = None
    notes: str | None = Field(default=None, max_length=2000)

    @model_validator(mode="after")
    def at_least_one_field(self) -> FoodEntryUpdate:
        if not self.model_dump(exclude_unset=True):
            raise ValueError("At least one field must be provided")
        return self

    @field_validator("food_name")
    @classmethod
    def strip_food_name(cls, value: str | None) -> str | None:
        if value is None:
            return value
        stripped = value.strip()
        if not stripped:
            raise ValueError("food_name must not be empty")
        return stripped

    @field_validator("unit")
    @classmethod
    def check_unit(cls, value: str | None) -> str | None:
        if value is None:
            return value
        if value not in ALLOWED_UNITS:
            raise ValueError(f"unit must be one of: {', '.join(sorted(ALLOWED_UNITS))}")
        return value

    @field_validator("consumed_at")
    @classmethod
    def check_consumed_at(cls, value: datetime | None) -> datetime | None:
        return _validate_consumed_at(value)

    @field_validator("micronutrients")
    @classmethod
    def check_micronutrients(cls, value: dict[str, Any] | None) -> dict[str, float] | None:
        if value is None:
            return value
        return _validate_micronutrients(value)

    @field_validator("source")
    @classmethod
    def check_source(cls, value: str | None) -> str | None:
        if value is None:
            return value
        if value not in CLIENT_ALLOWED_SOURCES:
            raise ValueError("source must be manual or ai_image")
        return value

    @field_validator("notes")
    @classmethod
    def strip_notes(cls, value: str | None) -> str | None:
        if value is None:
            return value
        stripped = value.strip()
        return stripped or None


class FoodEntryRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    meal_type: MealType
    food_name: str
    quantity: Decimal
    unit: str
    consumed_at: datetime
    consumed_on: date
    calories_kcal: Decimal
    protein_g: Decimal
    carbs_g: Decimal
    fat_g: Decimal
    fiber_g: Decimal | None
    sugar_g: Decimal | None
    micronutrients: dict[str, Any]
    source: EntrySource
    notes: str | None
    created_at: datetime
    updated_at: datetime


class NutrientRead(BaseModel):
    code: str
    name: str
    unit: str
    daily_value: float | None
