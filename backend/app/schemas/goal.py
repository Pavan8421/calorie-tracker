"""Goal request/response schemas."""

from __future__ import annotations

import uuid
from datetime import date, datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field, model_validator


class GoalCreate(BaseModel):
    calories_kcal: int = Field(ge=800, le=10000)
    protein_g: Decimal = Field(ge=0, max_digits=7, decimal_places=2)
    carbs_g: Decimal = Field(ge=0, max_digits=7, decimal_places=2)
    fat_g: Decimal = Field(ge=0, max_digits=7, decimal_places=2)
    fiber_g: Decimal | None = Field(
        default=None, ge=0, max_digits=7, decimal_places=2
    )
    target_weight_kg: Decimal | None = Field(
        default=None, ge=20, le=400, max_digits=5, decimal_places=2
    )
    target_date: date | None = None
    effective_from: date | None = None


class GoalUpdate(BaseModel):
    calories_kcal: int | None = Field(default=None, ge=800, le=10000)
    protein_g: Decimal | None = Field(default=None, ge=0, max_digits=7, decimal_places=2)
    carbs_g: Decimal | None = Field(default=None, ge=0, max_digits=7, decimal_places=2)
    fat_g: Decimal | None = Field(default=None, ge=0, max_digits=7, decimal_places=2)
    fiber_g: Decimal | None = Field(
        default=None, ge=0, max_digits=7, decimal_places=2
    )
    target_weight_kg: Decimal | None = Field(
        default=None, ge=20, le=400, max_digits=5, decimal_places=2
    )
    target_date: date | None = None
    effective_from: date | None = None

    @model_validator(mode="after")
    def at_least_one_field(self) -> GoalUpdate:
        if not self.model_dump(exclude_unset=True):
            raise ValueError("At least one field must be provided")
        return self


class WeightProgress(BaseModel):
    start_kg: Decimal
    current_kg: Decimal
    target_kg: Decimal
    progress_pct: float


class GoalRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    calories_kcal: int
    protein_g: Decimal
    carbs_g: Decimal
    fat_g: Decimal
    fiber_g: Decimal | None
    target_weight_kg: Decimal | None
    target_date: date | None
    effective_from: date
    created_at: datetime
    updated_at: datetime
    warnings: list[str] = Field(default_factory=list)


class CurrentGoalResponse(GoalRead):
    weight_progress: WeightProgress | None = None


def macro_consistency_warnings(
    *,
    calories_kcal: int,
    protein_g: Decimal,
    carbs_g: Decimal,
    fat_g: Decimal,
) -> list[str]:
    """Soft warning when macro calories differ from stated calories by > 15%."""
    if calories_kcal <= 0:
        return []
    from_macros = float(protein_g) * 4 + float(carbs_g) * 4 + float(fat_g) * 9
    diff_ratio = abs(from_macros - calories_kcal) / calories_kcal
    if diff_ratio > 0.15:
        return [
            "Macro calories (protein×4 + carbs×4 + fat×9) "
            "differ from calories_kcal by more than 15%"
        ]
    return []


def compute_weight_progress(
    *,
    start_kg: Decimal,
    current_kg: Decimal,
    target_kg: Decimal,
) -> WeightProgress:
    denom = float(start_kg) - float(target_kg)
    if denom == 0:
        pct = 100.0 if current_kg == target_kg else 0.0
    else:
        pct = (float(start_kg) - float(current_kg)) / denom * 100
    pct = max(0.0, min(100.0, pct))
    return WeightProgress(
        start_kg=start_kg,
        current_kg=current_kg,
        target_kg=target_kg,
        progress_pct=round(pct, 1),
    )
