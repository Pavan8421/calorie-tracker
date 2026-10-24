"""Weight log request/response schemas."""

from __future__ import annotations

import uuid
from datetime import date, datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field


class WeightLogCreate(BaseModel):
    weight_kg: Decimal = Field(ge=20, le=400, max_digits=5, decimal_places=2)
    logged_on: date | None = None


class WeightLogRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    logged_on: date
    weight_kg: Decimal
    created_at: datetime
    updated_at: datetime
